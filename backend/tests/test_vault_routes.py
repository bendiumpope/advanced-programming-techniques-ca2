from tests.helpers import auth_headers


def _register(client, email, password="password12"):
    r = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert r.status_code == 201
    return r.get_json()["access_token"]


def _create_entry(client, token, **overrides):
    payload = {
        "title": "My entry",
        "folder": "work",
        "url": "https://example.com",
        "encrypted_payload": "cipher-data",
        "iv": "iv-bytes",
    }
    payload.update(overrides)
    return client.post(
        "/api/vault/entries",
        json=payload,
        headers=auth_headers(token),
    )


def test_list_entries_empty(client, auth_token):
    r = client.get("/api/vault/entries", headers=auth_headers(auth_token))
    assert r.status_code == 200
    assert r.get_json() == {"entries": []}


def test_create_entry_requires_title(client, auth_token):
    r = _create_entry(client, auth_token, title="   ")
    assert r.status_code == 400


def test_create_entry_requires_payload_and_iv(client, auth_token):
    r = client.post(
        "/api/vault/entries",
        json={"title": "T"},
        headers=auth_headers(auth_token),
    )
    assert r.status_code == 400

    r2 = client.post(
        "/api/vault/entries",
        json={"title": "T", "encrypted_payload": "x"},
        headers=auth_headers(auth_token),
    )
    assert r2.status_code == 400


def test_create_get_update_delete_entry(client, auth_token):
    r = _create_entry(client, auth_token)
    assert r.status_code == 201
    entry = r.get_json()["entry"]
    eid = entry["id"]
    assert entry["title"] == "My entry"
    assert entry["folder"] == "work"
    assert entry["url"] == "https://example.com"

    r_list = client.get("/api/vault/entries", headers=auth_headers(auth_token))
    assert len(r_list.get_json()["entries"]) == 1

    r_get = client.get(
        f"/api/vault/entries/{eid}",
        headers=auth_headers(auth_token),
    )
    assert r_get.status_code == 200
    assert r_get.get_json()["entry"]["id"] == eid

    r_put = client.put(
        f"/api/vault/entries/{eid}",
        json={"title": "Updated", "folder": "personal"},
        headers=auth_headers(auth_token),
    )
    assert r_put.status_code == 200
    updated = r_put.get_json()["entry"]
    assert updated["title"] == "Updated"
    assert updated["folder"] == "personal"

    r_del = client.delete(
        f"/api/vault/entries/{eid}",
        headers=auth_headers(auth_token),
    )
    assert r_del.status_code == 204

    r_gone = client.get(
        f"/api/vault/entries/{eid}",
        headers=auth_headers(auth_token),
    )
    assert r_gone.status_code == 404


def test_get_update_delete_unknown_entry_returns_404(client, auth_token):
    for method, path in [
        ("get", "/api/vault/entries/99999"),
        ("put", "/api/vault/entries/99999"),
        ("delete", "/api/vault/entries/99999"),
    ]:
        fn = getattr(client, method)
        kwargs = {"headers": auth_headers(auth_token)}
        if method == "put":
            kwargs["json"] = {"title": "x"}
        r = fn(path, **kwargs)
        assert r.status_code == 404, method


def test_update_entry_rejects_empty_title(client, auth_token):
    r = _create_entry(client, auth_token)
    eid = r.get_json()["entry"]["id"]
    r2 = client.put(
        f"/api/vault/entries/{eid}",
        json={"title": "   "},
        headers=auth_headers(auth_token),
    )
    assert r2.status_code == 400


def test_entry_not_visible_to_other_user(client):
    t1 = _register(client, "a@example.com")
    t2 = _register(client, "b@example.com")
    r = _create_entry(client, t1)
    eid = r.get_json()["entry"]["id"]

    r2 = client.get(
        f"/api/vault/entries/{eid}",
        headers=auth_headers(t2),
    )
    assert r2.status_code == 404
