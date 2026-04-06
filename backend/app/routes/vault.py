from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import VaultEntry, db

vault_bp = Blueprint("vault", __name__)

MAX_FOLDER_LEN = 128


def _current_user_id():
    return int(get_jwt_identity())


def _normalize_folder(raw):
    if raw is None:
        return ""
    s = (raw or "").strip()
    if len(s) > MAX_FOLDER_LEN:
        s = s[:MAX_FOLDER_LEN]
    return s


def _entry_dict(e):
    return {
        "id": e.id,
        "title": e.title,
        "folder": e.folder or "",
        "url": e.url,
        "encrypted_payload": e.encrypted_payload,
        "iv": e.iv,
        "created_at": e.created_at.isoformat(),
        "updated_at": e.updated_at.isoformat(),
    }


@vault_bp.get("/entries")
@jwt_required()
def list_entries():
    uid = _current_user_id()
    entries = (
        VaultEntry.query.filter_by(user_id=uid)
        .order_by(VaultEntry.updated_at.desc())
        .all()
    )
    return jsonify({"entries": [_entry_dict(e) for e in entries]})


@vault_bp.post("/entries")
@jwt_required()
def create_entry():
    uid = _current_user_id()
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    url = data.get("url")
    if url is not None:
        url = (url or "").strip() or None
    folder = _normalize_folder(data.get("folder"))
    encrypted_payload = data.get("encrypted_payload")
    iv = data.get("iv")

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if not encrypted_payload or not iv:
        return jsonify({"error": "encrypted_payload and iv are required"}), 400

    entry = VaultEntry(
        user_id=uid,
        title=title,
        folder=folder,
        url=url,
        encrypted_payload=encrypted_payload,
        iv=iv,
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"entry": _entry_dict(entry)}), 201


@vault_bp.get("/entries/<int:entry_id>")
@jwt_required()
def get_entry(entry_id):
    uid = _current_user_id()
    entry = VaultEntry.query.filter_by(id=entry_id, user_id=uid).first()
    if not entry:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"entry": _entry_dict(entry)})


@vault_bp.put("/entries/<int:entry_id>")
@jwt_required()
def update_entry(entry_id):
    uid = _current_user_id()
    entry = VaultEntry.query.filter_by(id=entry_id, user_id=uid).first()
    if not entry:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json(silent=True) or {}
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"error": "Title cannot be empty"}), 400
        entry.title = title
    if "folder" in data:
        entry.folder = _normalize_folder(data.get("folder"))
    if "url" in data:
        u = data.get("url")
        entry.url = (u or "").strip() or None if u is not None else None
    if "encrypted_payload" in data:
        entry.encrypted_payload = data["encrypted_payload"]
    if "iv" in data:
        entry.iv = data["iv"]

    db.session.commit()
    return jsonify({"entry": _entry_dict(entry)})


@vault_bp.delete("/entries/<int:entry_id>")
@jwt_required()
def delete_entry(entry_id):
    uid = _current_user_id()
    entry = VaultEntry.query.filter_by(id=entry_id, user_id=uid).first()
    if not entry:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(entry)
    db.session.commit()
    return "", 204
