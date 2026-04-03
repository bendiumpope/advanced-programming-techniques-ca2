from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import inspect, text

from config import Config
from models import db


def _ensure_user_avatar_column(app):
    """Add avatar_filename to existing SQLite DBs (create_all does not migrate)."""
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        if "users" not in tables:
            return
        cols = {c["name"] for c in inspector.get_columns("users")}
        if "avatar_filename" in cols:
            return
        with db.engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN avatar_filename VARCHAR(512)")
            )


def create_app(config_class=Config):
    load_dotenv()
    app = Flask(__name__)
    app.config.from_object(config_class)

    Path(app.config["INSTANCE_PATH"]).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    JWTManager(app)

    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://127.0.0.1:5173", "http://localhost:5173"]}},
        supports_credentials=True,
    )

    from app.routes.auth import auth_bp
    from app.routes.profile import profile_bp
    from app.routes.vault import vault_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(profile_bp, url_prefix="/api/profile")
    app.register_blueprint(vault_bp, url_prefix="/api/vault")

    with app.app_context():
        db.create_all()
        _ensure_user_avatar_column(app)

    return app
