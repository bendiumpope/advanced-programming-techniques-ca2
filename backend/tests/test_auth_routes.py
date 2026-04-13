# Import User model and database instance
from models import User, db

# Helper function to attach authorization headers (token-based auth)
from tests.helpers import auth_headers


# Test successful user registration
def test_register_success(client):
    # Send POST request to register endpoint
    response = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "password12"},
    )

    # Check if user was created successfully
    assert response.status_code == 201

    # Convert response to JSON
    data = response.get_json()

    # Check if access token is returned
    assert "access_token" in data

    # Verify returned user email
    assert data["user"]["email"] == "new@example.com"

    # Check if vault_salt exists
    assert "vault_salt" in data["user"]

    # New users should not have an avatar
    assert data["user"]["has_avatar"] is False


# Test registration with invalid email format
def test_register_invalid_email(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "password12"},
    )

    # Expect bad request due to invalid email
    assert response.status_code == 400

    # Error message should be returned
    assert "error" in response.get_json()


# Test registration with short password
def test_register_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "a@b.co", "password": "short"},
    )

    # Expect validation failure
    assert response.status_code == 400


# Test duplicate email registration
def test_register_duplicate_email(client):
    # First registration
    client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "password12"},
    )

    # Second registration with same email
    response = client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "password12"},
    )

    # Expect conflict error
    assert response.status_code == 409


# Test successful login
def test_login_success(client):
    # Register user first
    client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "password12"},
    )

    # Attempt login
    response = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "password12"},
    )

    # Expect successful login
    assert response.status_code == 200

    data = response.get_json()

    # Check token and email
    assert "access_token" in data
    assert data["user"]["email"] == "login@example.com"


# Test login with incorrect password
def test_login_invalid_credentials(client):
    # Register user
    client.post(
        "/api/auth/register",
        json={"email": "only@example.com", "password": "password12"},
    )

    # Attempt login with wrong password
    response = client.post(
        "/api/auth/login",
        json={"email": "only@example.com", "password": "wrongpassword"},
    )

    # Expect unauthorized response
    assert response.status_code == 401


# Test accessing protected route without authentication
def test_me_requires_auth(client):
    # No token provided
    response = client.get("/api/auth/me")

    # Should return unauthorized
    assert response.status_code == 401


# Test accessing protected route with valid token
def test_me_success(client, auth_token):
    # Send request with authorization header
    response = client.get("/api/auth/me", headers=auth_headers(auth_token))

    # Expect success
    assert response.status_code == 200

    data = response.get_json()

    # Verify returned user email
    assert data["email"] == "test@example.com"


# Test case where user is deleted but token is still used
def test_me_user_not_found(client, app, auth_token):
    # Access database context
    with app.app_context():
        # Find user
        user = User.query.filter_by(email="test@example.com").first()

        # Ensure user exists
        assert user is not None

        # Delete user from database
        db.session.delete(user)
        db.session.commit()

    # Attempt to access protected route again
    response = client.get("/api/auth/me", headers=auth_headers(auth_token))

    # Expect not found response
    assert response.status_code == 404