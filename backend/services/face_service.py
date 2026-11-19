import asyncio
import logging
from pathlib import Path

import cv2
import httpx
import numpy as np

from core.exceptions import DeviceOfflineError

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_PATH = DATA_DIR / "face_model.yml"
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
MAX_STREAM_BYTES = 2 * 1024 * 1024


class FaceService:
    def __init__(self, device_bridge=None):
        self.bridge = device_bridge
        self.face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
        self.recognizer = cv2.face.LBPHFaceRecognizer_create()

        # If model is not local, attempt restore from Supabase Storage
        if not MODEL_PATH.exists():
            try:
                from core.supabase_client import supabase
                res = supabase.storage.from_("models").download("face_model.yml")
                if res:
                    DATA_DIR.mkdir(parents=True, exist_ok=True)
                    MODEL_PATH.write_bytes(res)
                    logger.info("Restored face_model.yml from Supabase Storage")
            except Exception as e:
                logger.debug("Supabase model restore skipped or failed: %s", e)

        if MODEL_PATH.exists():
            try:
                self.recognizer.read(str(MODEL_PATH))
                self._trained = True
                logger.info("Loaded LBPH face model from %s", MODEL_PATH)
            except Exception as e:
                logger.warning("Could not read face model %s: %s", MODEL_PATH, e)
                self._trained = False
        else:
            self._trained = False

    def _decode_jpeg(self, jpg: bytes, source: str) -> np.ndarray:
        frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError(f"Could not decode frame from {source}")
        return frame

    def _capture_lan_frame(self, stream_url: str) -> np.ndarray:
        buf = bytearray()
        try:
            with httpx.Client(timeout=10.0) as client:
                with client.stream("GET", stream_url) as resp:
                    resp.raise_for_status()
                    for chunk in resp.iter_bytes(chunk_size=4096):
                        buf.extend(chunk)
                        start = buf.find(b"\xff\xd8")
                        if start != -1:
                            end = buf.find(b"\xff\xd9", start + 2)
                            if end != -1:
                                jpg = bytes(buf[start : end + 2])
                                return self._decode_jpeg(jpg, stream_url)
                        if len(buf) > MAX_STREAM_BYTES:
                            break
        except httpx.HTTPStatusError as e:
            if e.response.status_code >= 500:
                raise DeviceOfflineError("ESP32 camera", stream_url)
            raise ValueError(f"ESP32 camera returned HTTP {e.response.status_code}")
        except httpx.RequestError:
            raise DeviceOfflineError("ESP32 camera", stream_url)

        raise ValueError(f"No valid JPEG frame received from {stream_url}")

    async def capture_from_esp32(self, stream_url: str) -> np.ndarray:
        """Grab a single JPEG frame over the tunnel bridge or directly from the ESP32."""
        if self.bridge and self.bridge.is_online():
            frames = await self.bridge.request_frames(count=1, timeout=15.0)
            return self._decode_jpeg(frames[0], "tunnel bridge")
        return await asyncio.to_thread(self._capture_lan_frame, stream_url)

    def detect_face(self, frame: np.ndarray) -> np.ndarray | None:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        eq = cv2.equalizeHist(gray)
        faces = self.face_cascade.detectMultiScale(
            eq, scaleFactor=1.08, minNeighbors=3, minSize=(60, 60)
        )
        if len(faces) == 0:
            return None

        # keep the largest face in frame
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        roi = eq[y : y + h, x : x + w]
        return cv2.resize(roi, (200, 200))

    async def enroll_face(
        self,
        user_id: str,
        model_label: int,
        stream_url: str,
        num_samples: int,
        supabase_client,
    ) -> int:
        """Capture face samples, upload to Supabase Storage, and update the LBPH model.

        Returns the number of samples captured.
        """
        samples = []
        captured = 0

        if self.bridge and self.bridge.is_online():
            target = min(num_samples, 5)
            for attempt in range(target * 2):
                if captured >= target:
                    break
                try:
                    frames = await self.bridge.request_frames(count=1, timeout=12.0)
                    if not frames:
                        continue
                    frame = self._decode_jpeg(frames[0], "tunnel bridge")
                    face_roi = self.detect_face(frame)
                    if face_roi is None:
                        logger.info("Tunnel frame did not detect face, retrying...")
                        await asyncio.sleep(0.15)
                        continue
                    samples.append(face_roi)
                    captured += 1
                    ok, encoded = cv2.imencode(".jpg", face_roi)
                    if ok:
                        file_path = f"{user_id}/sample_{captured}.jpg"
                        supabase_client.storage.from_("face-samples").upload(
                            file_path,
                            encoded.tobytes(),
                            file_options={"content-type": "image/jpeg", "upsert": "true"},
                        )
                    await asyncio.sleep(0.15)
                except DeviceOfflineError:
                    raise
                except Exception as e:
                    logger.warning("Tunnel sample failed: %s", e)
        else:
            for attempt in range(num_samples * 2):
                if captured >= num_samples:
                    break
                try:
                    frame = await self.capture_from_esp32(stream_url)
                    face_roi = self.detect_face(frame)
                    if face_roi is None:
                        await asyncio.sleep(0.3)
                        continue

                    samples.append(face_roi)
                    captured += 1

                    ok, encoded = cv2.imencode(".jpg", face_roi)
                    if ok:
                        file_path = f"{user_id}/sample_{captured}.jpg"
                        supabase_client.storage.from_("face-samples").upload(
                            file_path,
                            encoded.tobytes(),
                            file_options={"content-type": "image/jpeg", "upsert": "true"},
                        )
                    await asyncio.sleep(0.3)
                except DeviceOfflineError:
                    raise
                except Exception as e:
                    logger.warning("Sample attempt %d failed: %s", attempt, e)

        if not samples:
            raise ValueError("No face samples captured — check camera and positioning")

        labels = np.array([model_label] * len(samples), dtype=np.int32)
        if self._trained:
            self.recognizer.update(samples, labels)
        else:
            self.recognizer.train(samples, labels)
            self._trained = True

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.recognizer.save(str(MODEL_PATH))
        logger.info("Model saved with %d samples for label %d", len(samples), model_label)

        try:
            with open(MODEL_PATH, "rb") as f:
                model_data = f.read()
            supabase_client.storage.from_("models").upload(
                "face_model.yml",
                model_data,
                file_options={"upsert": "true"},
            )
            logger.info("Backed up updated face_model.yml to Supabase Storage")
        except Exception as e:
            logger.warning("Could not sync face_model.yml to Supabase Storage: %s", e)

        return captured

    def recognize_face(
        self, frame: np.ndarray, threshold: float
    ) -> tuple[int, float, str]:
        """Run LBPH prediction on a frame. Returns (label, confidence, status)."""
        if not self._trained:
            return -1, 0.0, "no_model"

        face_roi = self.detect_face(frame)
        if face_roi is None:
            return -1, 0.0, "no_face_detected"

        label, confidence = self.recognizer.predict(face_roi)
        # LBPH reports distance, so lower means a closer match
        if confidence < threshold:
            return int(label), float(confidence), "match"
        return int(label), float(confidence), "no_match"

    async def capture_and_recognize(
        self, stream_url: str, threshold: float, max_frames: int = 4
    ) -> tuple[int, float, str]:
        """Capture a short burst of frames and return the best face recognition result."""
        if self.bridge and self.bridge.is_online():
            raw_frames = await self.bridge.request_frames(count=max_frames, timeout=20.0)
            frames = [self._decode_jpeg(jpg, "tunnel bridge") for jpg in raw_frames]
        else:
            frames = []
            for _ in range(max_frames):
                frames.append(await self.capture_from_esp32(stream_url))

        best = (-1, 0.0, "no_face_detected")
        for frame in frames:
            label, confidence, status = self.recognize_face(frame, threshold)
            if status == "match":
                return label, confidence, status
            if status == "no_match":
                if best[2] != "no_match" or confidence < best[1]:
                    best = (label, confidence, status)
            elif best[2] == "no_face_detected" and status == "no_model":
                best = (label, confidence, status)
        return best
