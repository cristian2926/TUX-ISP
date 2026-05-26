from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://tuxtell:Tuxtell2026#Secure@127.0.0.1:5432/tuxtell_isp"
    SECRET_KEY: str = "tuxtell2026secretkey#ISP$secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    WHATSAPP_API_URL: str = "http://127.0.0.1:3001"
    VPS_IP: str = "161.132.48.127"
    SSH_KEY_PATH: str = "/root/.ssh/tuxtell_key"
    SSH_USER: str = "tuxtell-api"
    WG_CONFIG_PATH: str = "/etc/wireguard/wg0.conf"
    VPS_WG_PUBKEY: str = "z5ErxfupttwgB5L0AA2C+AzRAFwy4N1ZCVvKGRyV5TI="

    class Config:
        env_file = ".env"


settings = Settings()
