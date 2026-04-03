Backend (backend/)
Flask app factory in backend/app/__init__.py: load_dotenv(), SQLite via backend/config.py, CORS for localhost:5173 / 127.0.0.1:5173, db.create_all() on startup.
Models in backend/models.py: User (email, password hash, vault_salt for PBKDF2), VaultEntry (title, url, encrypted_payload, iv, timestamps).
Auth backend/app/routes/auth.py: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me (JWT).
Vault backend/app/routes/vault.py: GET/POST /api/vault/entries, GET/PUT/DELETE /api/vault/entries/<id> (scoped by JWT user id).

#Run: 
##pip install -r requirements.txt
##backend/run.py — python run.py → http://127.0.0.1:5001.
Dependencies pinned for Python 3.7+ in backend/requirements.txt (Flask 2.x, SQLAlchemy 1.4, etc.).