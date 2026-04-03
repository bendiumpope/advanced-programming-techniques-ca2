import mimetypes
from pathlib import Path
from typing import Optional

from flask import Blueprint, current_app, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from models import User, db

profile_bp = Blueprint("profile", __name__)

ALLOWED_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _uid():
    return int(get_jwt_identity())


def _avatars_dir() -> Path:
    p = Path(current_app.config["INSTANCE_PATH"]) / "avatars"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _avatar_disk_path(user: User) -> Optional[Path]:
    if not user.avatar_filename:
        return None
    return _avatars_dir() / user.avatar_filename


def _remove_avatar_file(user: User) -> None:
    path = _avatar_disk_path(user)
    if path and path.is_file():
        path.unlink()


@profile_bp.get("/avatar")
@jwt_required()
def get_avatar():
    uid = _uid()
    user = db.session.get(User, uid)
    if not user or not user.avatar_filename:
        return jsonify({"error": "No avatar"}), 404
    path = _avatar_disk_path(user)
    if not path or not path.is_file():
        return jsonify({"error": "No avatar"}), 404
    mimetype, _ = mimetypes.guess_type(str(path))
    return send_file(
        path,
        mimetype=mimetype or "application/octet-stream",
        max_age=3600,
    )


@profile_bp.post("/avatar")
@jwt_required()
def upload_avatar():
    uid = _uid()
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if "file" not in request.files or not request.files["file"].filename:
        return jsonify({"error": "file is required"}), 400

    f = request.files["file"]
    mime = (f.mimetype or "").lower()
    if mime not in ALLOWED_MIME:
        return jsonify({"error": "Allowed types: PNG, JPEG, WebP, GIF"}), 400

    data = f.read()
    max_b = current_app.config["MAX_AVATAR_BYTES"]
    if len(data) > max_b:
        return jsonify({"error": f"File too large (max {max_b // (1024 * 1024)} MB)"}), 400

    ext = ALLOWED_MIME[mime]
    safe_base = secure_filename(f.filename or "avatar")
    if not safe_base:
        safe_base = "avatar"
    name_root = f"{uid}_{Path(safe_base).stem}"[:120]
    filename = f"{name_root}{ext}"

    _remove_avatar_file(user)
    path = _avatars_dir() / filename
    path.write_bytes(data)

    user.avatar_filename = filename
    db.session.commit()

    return jsonify(
        {
            "ok": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "vault_salt": user.vault_salt,
                "has_avatar": True,
            },
        }
    )


@profile_bp.delete("/avatar")
@jwt_required()
def delete_avatar():
    uid = _uid()
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "User not found"}), 404

    _remove_avatar_file(user)
    user.avatar_filename = None
    db.session.commit()

    return jsonify(
        {
            "ok": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "vault_salt": user.vault_salt,
                "has_avatar": False,
            },
        }
    )
