import re
import secrets

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import limiter
from models import User, db

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _user_json(user):
    return {
        "id": user.id,
        "email": user.email,
        "vault_salt": user.vault_salt,
        "has_avatar": bool(user.avatar_filename),
    }


@auth_bp.post("/register")
@limiter.limit("5 per minute")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not EMAIL_RE.match(email):
        return jsonify({"error": "Valid email is required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    vault_salt = secrets.token_hex(32)
    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        vault_salt=vault_salt,
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return (
        jsonify(
            {
                "access_token": token,
                "user": _user_json(user),
            }
        ),
        201,
    )


@auth_bp.post("/login")
@limiter.limit("15 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify(
        {
            "access_token": token,
            "user": _user_json(user),
        }
    )


@auth_bp.get("/me")
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(_user_json(user))
