import logging
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

_DEFAULT_SECRET = "tuxtell2026secretkey#ISP$secure"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://tuxtell:Tuxtell2026#Secure@127.0.0.1:5432/tuxtell_isp"
    SECRET_KEY: str = _DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    WHATSAPP_API_URL: str = "http://127.0.0.1:3001"
    VPS_IP: str = "161.132.48.127"
    SSH_KEY_PATH: str = "/root/.ssh/tuxtell_key"
    SSH_USER: str = "tuxtell-api"
    WG_CONFIG_PATH: str = "/etc/wireguard/wg0.conf"
    VPS_WG_PUBKEY: str = "z5ErxfupttwgB5L0AA2C+AzRAFwy4N1ZCVvKGRyV5TI="
    PHONE_CONTACTO: str = "936511008"
    BACKUP_DIR: str = "/backups"

    class Config:
        env_file = ".env"


settings = Settings()

if settings.SECRET_KEY == _DEFAULT_SECRET:
    logger.warning(
        "⚠️  SECRET_KEY usa el valor por defecto. "
        "Define SECRET_KEY en el archivo .env con una clave aleatoria larga."
    )
