"""Configuration management for EvacRoute backend."""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    """Base application configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", "evacroute-insecure-dev-secret-key")
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "5000"))
    DEBUG = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "t")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    DEFAULT_DATA_PATH = BASE_DIR / "data" / "graph_data.json"
    DATA_PATH = Path(os.getenv("DATA_PATH", str(DEFAULT_DATA_PATH)))
    if not DATA_PATH.is_absolute():
        DATA_PATH = BASE_DIR / DATA_PATH


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    DEBUG = False


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False


CONFIG_BY_NAME = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def get_config():
    """Returns active config object based on FLASK_ENV."""
    env = os.getenv("FLASK_ENV", "development").lower()
    return CONFIG_BY_NAME.get(env, DevelopmentConfig)
