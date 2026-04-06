# Backend

Flask REST API with SQLite (SQLAlchemy) and JWT auth.

## App layout

| Piece | Details |
| --- | --- |
| **Factory** | [`app/__init__.py`](app/__init__.py) — `load_dotenv()`, SQLite, CORS for `http://localhost:5173` / `http://127.0.0.1:5173`, `db.create_all()` on startup, lightweight migration for `users.avatar_filename` |
| **Config** | [`config.py`](config.py) — `SECRET_KEY`, JWT, DB URI (`instance/app.db` by default) |
| **Models** | [`models.py`](models.py) — `User` (email, password hash, `vault_salt`, optional `avatar_filename`), `VaultEntry` (title, url, encrypted payload, IV, timestamps) |

## API routes

| Prefix | File | Endpoints |
| --- | --- | --- |
| `/api/auth` | [`app/routes/auth.py`](app/routes/auth.py) | `POST /register`, `POST /login`, `GET /me` (JWT). **Rate limits** (per IP, in-memory): register **5/min**, login **15/min** via [`extensions.py`](extensions.py) + Flask-Limiter. |
| `/api/vault` | [`app/routes/vault.py`](app/routes/vault.py) | `GET`/`POST /entries`, `GET`/`PUT`/`DELETE /entries/<id>` (scoped by JWT user). Each entry has plaintext **folder** (for organization/search); **username** is stored only inside the client-encrypted payload. |
| `/api/profile` | [`app/routes/profile.py`](app/routes/profile.py) | `GET`/`POST`/`DELETE /avatar` — profile picture (JWT) |

Vault ciphertext is produced by the client; the API stores opaque blobs only.

## Dependencies

Pinned in [`requirements.txt`](requirements.txt) for **Python 3.7+** (Flask 2.x, SQLAlchemy 1.4, etc.).

Environment variables: copy [`.env.example`](.env.example) to `.env` and set secrets for production.

## Run locally

Create a virtual environment (recommended), install deps, then start the dev server:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

- Default URL: **http://127.0.0.1:5001** (port **5001** avoids macOS often reserving **5000** for AirPlay).
- Override with `PORT`, e.g. `PORT=5001 python run.py`.

Data lives under **`instance/`** (SQLite DB and uploaded avatars); it is gitignored.
