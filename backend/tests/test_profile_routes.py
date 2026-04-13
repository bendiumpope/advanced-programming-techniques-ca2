# Used to create in-memory file objects
import io

# Used to simulate file uploads in tests
from werkzeug.datastructures import FileStorage

# MINI_PNG is a small image used for testing, auth_headers adds auth token
from tests.helpers import MINI_PNG, auth_headers


# Test getting avatar when no avatar is uploaded
def test_get_avatar_without_avatar_returns_404(client, auth_token):
    # Send GET request to fetch avatar
    r = client.get("/api/profile/avatar", headers=auth_headers(auth_token))

    # Expect not found since no avatar exists
    assert r.status_code == 404


# Test uploading avatar without providing a file
def test_upload_avatar_requires_file(client, auth_token):
    # Send POST request without file
    r = client.post("/api/profile/avatar", headers=auth_headers(auth_token))

    # Expect validation error
    assert r.status_code == 400


# Test uploading a file with unsupported type
def test_upload_avatar_rejects_disallowed_type(client, auth_token):
    # Simulate uploading a text file instead of an image
    r = client.post(
        "/api/profile/avatar",
        data={"file": (io.BytesIO(b"hello"), "note.txt", "text/plain")},
        headers=auth_headers(auth_token),
        content_type="multipart/form-data",
    )

    # Expect rejection due to invalid file type
    assert r.status_code == 400


# Test uploading a file that exceeds allowed size
def test_upload_avatar_rejects_oversized_file(client, auth_token, app):
    # Set max allowed size very small
    app.config["MAX_AVATAR_BYTES"] = 10

    # Create a large file
    big = b"x" * 100

    # Wrap it as a file upload object
    fs = FileStorage(
        stream=io.BytesIO(big),
        filename="big.png",
        content_type="image/png",
    )

    # Attempt upload
    r = client.post(
        "/api/profile/avatar",
        data={"file": fs},
        headers=auth_headers(auth_token),
        content_type="multipart/form-data",
    )

    # Expect rejection due to size limit
    assert r.status_code == 400


# Test uploading and retrieving avatar successfully
def test_upload_and_get_avatar_round_trip(client, auth_token):
    # Upload a valid image
    r = client.post(
        "/api/profile/avatar",
        data={"file": (io.BytesIO(MINI_PNG), "avatar.png", "image/png")},
        headers=auth_headers(auth_token),
        content_type="multipart/form-data",
    )

    # Check upload success
    assert r.status_code == 200

    body = r.get_json()

    # Confirm response indicates success
    assert body["ok"] is True

    # User should now have an avatar
    assert body["user"]["has_avatar"] is True

    # Fetch the uploaded avatar
    r2 = client.get("/api/profile/avatar", headers=auth_headers(auth_token))

    # Expect successful retrieval
    assert r2.status_code == 200

    # Returned data should match uploaded image
    assert r2.data == MINI_PNG


# Test deleting avatar
def test_delete_avatar(client, auth_token):
    # First upload an avatar
    client.post(
        "/api/profile/avatar",
        data={"file": (io.BytesIO(MINI_PNG), "avatar.png", "image/png")},
        headers=auth_headers(auth_token),
        content_type="multipart/form-data",
    )

    # Delete the avatar
    r = client.delete("/api/profile/avatar", headers=auth_headers(auth_token))

    # Expect success
    assert r.status_code == 200

    # User should no longer have an avatar
    assert r.get_json()["user"]["has_avatar"] is False

    # Try fetching again
    r2 = client.get("/api/profile/avatar", headers=auth_headers(auth_token))

    # Avatar should no longer exist
    assert r2.status_code == 404