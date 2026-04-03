import os
from pathlib import Path


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-change-me-in-production")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-dev-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = False  # MVP; set timedelta in production

    BASE_DIR = Path(__file__).resolve().parent
    INSTANCE_PATH = BASE_DIR / "instance"
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{INSTANCE_PATH / 'app.db'}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
