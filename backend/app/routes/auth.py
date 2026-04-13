# Used for email validation using regular expressions
import re

# Used to generate secure random values (for vault_salt)
import secrets

# Flask utilities for routing and handling requests/responses
from flask import Blueprint, jsonify, request

# JWT functions for authentication
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

# Functions for hashing and verifying passwords
from werkzeug.security import generate_password_hash, check_password_hash

# Import rate limiter
from extensions import limiter

# Import User model and database instance
from models import User, db


# Create a Blueprint for authentication routes
auth_bp = Blueprint("auth", __name__)


# Regular expression to validate email format
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# Helper function to convert user object into JSON response
def _user_json(user):
    return {
        "id": user.id,
        "email": user.email,
        "vault_salt": user.vault_salt,
        "has_avatar": bool(user.avatar_filename),
    }


# Route to register a new user
@auth_bp.post("/register")
@limiter.limit("5 per minute")  # Limit number of requests to prevent abuse
def register():
    # Get JSON data from request
    data = request.get_json(silent=True) or {}

    # Extract and clean email and password
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # Validate email format
    if not email or not EMAIL_RE.match(email):
        return jsonify({"error": "Valid email is required"}), 400

    # Validate password length
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    # Check if email already exists in database
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Generate a secure random salt for encryption purposes
    vault_salt = secrets.token_hex(32)

    # Create new user with hashed password
    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        vault_salt=vault_salt,
    )

    # Save user to database
    db.session.add(user)
    db.session.commit()

    # Generate JWT token for the user
    token = create_access_token(identity=str(user.id))

    # Return token and user data
    return (
        jsonify(
            {
                "access_token": token,
                "user": _user_json(user),
            }
        ),
        201,
    )


# Route to log in an existing user
@auth_bp.post("/login")
@limiter.limit("15 per minute")  # Higher limit for login attempts
def login():
    # Get JSON data from request
    data = request.get_json(silent=True) or {}

    # Extract and clean email and password
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # Find user in database
    user = User.query.filter_by(email=email).first()

    # Check if user exists and password is correct
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Generate JWT token
    token = create_access_token(identity=str(user.id))

    # Return token and user data
    return jsonify(
        {
            "access_token": token,
            "user": _user_json(user),
        }
    )


# Route to get current logged-in user's details
@auth_bp.get("/me")
@jwt_required()  # Requires valid JWT token
def me():
    # Get user ID from token
    uid = int(get_jwt_identity())

    # Retrieve user from database
    user = db.session.get(User, uid)

    # If user does not exist
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Return user data
    return jsonify(_user_json(user))