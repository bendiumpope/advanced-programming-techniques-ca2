from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    vault_salt = db.Column(db.String(64), nullable=False)
    avatar_filename = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    entries = db.relationship(
        "VaultEntry",
        backref="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )


class VaultEntry(db.Model):
    __tablename__ = "vault_entries"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(512), nullable=False, default="")
    folder = db.Column(db.String(128), nullable=False, default="")
    url = db.Column(db.String(2048), nullable=True)
    encrypted_payload = db.Column(db.Text, nullable=False)
    iv = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )
