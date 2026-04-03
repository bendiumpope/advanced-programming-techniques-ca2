from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db


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
    from app.routes.vault import vault_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(vault_bp, url_prefix="/api/vault")

    with app.app_context():
        db.create_all()

    return app
