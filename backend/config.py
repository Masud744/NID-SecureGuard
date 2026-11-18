from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str = ""
    ESP32_CAMERA_URL: str = "http://192.168.1.100:81/stream"
    ESP32_BASE_URL: str = "http://192.168.1.100"
    FACE_CONFIDENCE_THRESHOLD: float = 80.0
    FACE_SAMPLES_COUNT: int = 20

    # Cryptography & Key Management
    DATA_ENCRYPTION_KEY: str = "45256f2ee2e386c9123d8d52af55cc2675c1e1cfc2d65c7b5cfc726add48b994"
    BLIND_INDEX_PEPPER: str = "265c9fb39660f1cdf3dc17eb00616ab1c105c9243fd71c2f96449306657f4950"
    ESP32_DEVICE_SECRET: str = "8d4b7bd8c1ea93b8928c4c9e9786848dadb18aa54ba74eae346af847ea62ad4c"
    AUDIT_LOG_SECRET: str = "29ea053b6986f72f39c13e4dde2db1a1d89e050215c05d69d8066d3ac928cf26"
    KIOSK_API_KEY: str = "2f7e22d38ca2fe6bb4655b1c6f6ec0b7b1c735920538ea8b"
    MASTER_ADMIN_EMAIL: str = "masud.nil74@gmail.com"

    model_config = {
        "env_file": (".env", "../.env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
