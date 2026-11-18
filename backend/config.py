from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    ESP32_CAMERA_URL: str = "http://192.168.1.100:81/stream"
    ESP32_BASE_URL: str = "http://192.168.1.100"
    FACE_CONFIDENCE_THRESHOLD: float = 80.0
    FACE_SAMPLES_COUNT: int = 20

    model_config = {
        "env_file": (".env", "../.env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
