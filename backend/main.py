import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from core.supabase_client import supabase
from core.exceptions import (
    DeviceOfflineError,
    BiometricError,
    device_offline_handler,
    biometric_error_handler,
)
from services.device_bridge import DeviceBridge
from services.face_service import FaceService
from services.fingerprint_service import FingerprintService
from services.auth_service import AuthService
from services.user_service import UserService
from routes import health, users, face, fingerprint, auth, logs, device, operators

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    device_bridge = DeviceBridge()
    face_service = FaceService(device_bridge)
    fp_service = FingerprintService(settings.ESP32_BASE_URL, device_bridge)
    user_service = UserService(supabase)
    auth_service = AuthService(face_service, fp_service, supabase, settings)

    app.state.config = settings
    app.state.supabase = supabase
    app.state.device_bridge = device_bridge
    app.state.face_service = face_service
    app.state.fp_service = fp_service
    app.state.user_service = user_service
    app.state.auth_service = auth_service

    logger.info("NID SecureGuard API started")
    yield
    logger.info("Shutting down")


app = FastAPI(title="NID SecureGuard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(DeviceOfflineError, device_offline_handler)
app.add_exception_handler(BiometricError, biometric_error_handler)

app.include_router(health.router)
app.include_router(device.router)
app.include_router(users.router)
app.include_router(face.router)
app.include_router(fingerprint.router)
app.include_router(auth.router)
app.include_router(logs.router)
app.include_router(operators.router)
