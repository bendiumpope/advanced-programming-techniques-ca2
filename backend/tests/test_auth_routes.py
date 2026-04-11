from models import User, db
from tests.helpers import auth_headers


def test_register_success(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "password12"},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "new@example.com"
    assert "vault_salt" in data["user"]
    assert data["user"]["has_avatar"] is False


def test_register_invalid_email(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "password12"},
    )
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_register_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "a@b.co", "password": "short"},
    )
    assert response.status_code == 400


def test_register_duplicate_email(client):
    client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "password12"},
    )
    response = client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "password12"},
    )
    assert response.status_code == 409


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "password12"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "password12"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "login@example.com"


def test_login_invalid_credentials(client):
    client.post(
        "/api/auth/register",
        json={"email": "only@example.com", "password": "password12"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "only@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_me_requires_auth(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_success(client, auth_token):
    response = client.get("/api/auth/me", headers=auth_headers(auth_token))
    assert response.status_code == 200
    data = response.get_json()
    assert data["email"] == "test@example.com"


def test_me_user_not_found(client, app, auth_token):
    with app.app_context():
        user = User.query.filter_by(email="test@example.com").first()
        assert user is not None
        db.session.delete(user)
        db.session.commit()

    response = client.get("/api/auth/me", headers=auth_headers(auth_token))
    assert response.status_code == 404
