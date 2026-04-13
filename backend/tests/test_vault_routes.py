# Helper function to attach authorization headers
from tests.helpers import auth_headers


# Helper function to register a user and return access token
def _register(client, email, password="password12"):
    # Send registration request
    r = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )

    # Ensure registration was successful
    assert r.status_code == 201

    # Return access token for authentication
    return r.get_json()["access_token"]


# Helper function to create a vault entry
def _create_entry(client, token, **overrides):
    # Default payload for creating an entry
    payload = {
        "title": "My entry",
        "folder": "work",
        "url": "https://example.com",
        "encrypted_payload": "cipher-data",
        "iv": "iv-bytes",
    }

    # Allow overriding specific fields
    payload.update(overrides)

    # Send request to create entry with authentication
    return client.post(
        "/api/vault/entries",
        json=payload,
        headers=auth_headers(token),
    )


# Test listing entries when none exist
def test_list_entries_empty(client, auth_token):
    r = client.get("/api/vault/entries", headers=auth_headers(auth_token))

    # Expect success response
    assert r.status_code == 200

    # Should return empty list
    assert r.get_json() == {"entries": []}


# Test creating entry with empty title
def test_create_entry_requires_title(client, auth_token):
    r = _create_entry(client, auth_token, title="   ")

    # Expect validation error
    assert r.status_code == 400


# Test creating entry without required fields
def test_create_entry_requires_payload_and_iv(client, auth_token):
    # Missing encrypted_payload and iv
    r = client.post(
        "/api/vault/entries",
        json={"title": "T"},
        headers=auth_headers(auth_token),
    )
    assert r.status_code == 400

    # Missing iv only
    r2 = client.post(
        "/api/vault/entries",
        json={"title": "T", "encrypted_payload": "x"},
        headers=auth_headers(auth_token),
    )
    assert r2.status_code == 400


# Test full lifecycle of an entry (create, read, update, delete)
def test_create_get_update_delete_entry(client, auth_token):
    # Create entry
    r = _create_entry(client, auth_token)
    assert r.status_code == 201

    entry = r.get_json()["entry"]
    eid = entry["id"]

    # Verify initial values
    assert entry["title"] == "My entry"
    assert entry["folder"] == "work"
    assert entry["url"] == "https://example.com"

    # Check entry appears in list
    r_list = client.get("/api/vault/entries", headers=auth_headers(auth_token))
    assert len(r_list.get_json()["entries"]) == 1

    # Retrieve entry by ID
    r_get = client.get(
        f"/api/vault/entries/{eid}",
        headers=auth_headers(auth_token),
    )
    assert r_get.status_code == 200
    assert r_get.get_json()["entry"]["id"] == eid

    # Update entry fields
    r_put = client.put(
        f"/api/vault/entries/{eid}",
        json={"title": "Updated", "folder": "personal"},
        headers=auth_headers(auth_token),
    )
    assert r_put.status_code == 200

    updated = r_put.get_json()["entry"]

    # Verify updated values
    assert updated["title"] == "Updated"
    assert updated["folder"] == "personal"

    # Delete entry
    r_del = client.delete(
        f"/api/vault/entries/{eid}",
        headers=auth_headers(auth_token),
    )
    assert r_del.status_code == 204

    # Ensure entry no longer exists
    r_gone = client.get(
        f"/api/vault/entries/{eid}",
        headers=auth_headers(auth_token),
    )
    assert r_gone.status_code == 404


# Test operations on non-existent entry
def test_get_update_delete_unknown_entry_returns_404(client, auth_token):
    # Loop through different HTTP methods
    for method, path in [
        ("get", "/api/vault/entries/99999"),
        ("put", "/api/vault/entries/99999"),
        ("delete", "/api/vault/entries/99999"),
    ]:
        # Dynamically call method (get, put, delete)
        fn = getattr(client, method)

        # Add authorization header
        kwargs = {"headers": auth_headers(auth_token)}

        # PUT requires JSON body
        if method == "put":
            kwargs["json"] = {"title": "x"}

        r = fn(path, **kwargs)

        # Expect not found
        assert r.status_code == 404, method


# Test updating entry with invalid title
def test_update_entry_rejects_empty_title(client, auth_token):
    # Create entry first
    r = _create_entry(client, auth_token)
    eid = r.get_json()["entry"]["id"]

    # Attempt update with empty title
    r2 = client.put(
        f"/api/vault/entries/{eid}",
        json={"title": "   "},
        headers=auth_headers(auth_token),
    )

    # Expect validation error
    assert r2.status_code == 400


# Test that one user cannot access another user's entry
def test_entry_not_visible_to_other_user(client):
    # Register two different users
    t1 = _register(client, "a@example.com")
    t2 = _register(client, "b@example.com")

    # User 1 creates an entry
    r = _create_entry(client, t1)
    eid = r.get_json()["entry"]["id"]

    # User 2 tries to access User 1's entry
    r2 = client.get(
        f"/api/vault/entries/{eid}",
        headers=auth_headers(t2),
    )

    # Should not be accessible
    assert r2.status_code == 404