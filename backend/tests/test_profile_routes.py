import io

from werkzeug.datastructures import FileStorage

from tests.helpers import MINI_PNG, auth_headers


def test_get_avatar_without_avatar_returns_404(client, auth_token):
    r = client.get("/api/profile/avatar", headers=auth_headers(auth_token))
    assert r.status_code == 404


def test_upload_avatar_requires_file(client, auth_token):
    r = client.post("/api/profile/avatar", headers=auth_headers(auth_token))
    assert r.status_code == 400


def test_upload_avatar_rejects_disallowed_type(client, auth_token):
    r = client.post(
        "/api/profile/avatar",
        data={"file": (io.BytesIO(b"hello"), "note.txt", "text/plain")},
        headers=auth_headers(auth_token),
        content_type="multipart/form-data",
    )
    assert r.status_code == 400


def test_upload_avatar_rejects_oversized_file(client, auth_token, app):
    app.config["MAX_AVATAR_BYTES"] = 10
    big = b"x" * 100
    fs = FileStorage(
        stream=io.BytesIO(big),
        filename="big.png",
        content_type="image/png",
    )
    r = client.post(
        "/api/profile/avatar",
        data={"file": fs},
        headers=auth_headers(auth_token),
        content_type="multipart/form-data",
    )
    assert r.status_code == 400


def test_upload_and_get_avatar_round_trip(client, auth_token):
    r = client.post(
        "/api/profile/avatar",
        data={"file": (io.BytesIO(MINI_PNG), "avatar.png", "image/png")},
        headers=auth_headers(auth_token),
        content_type="multipart/form-data",
    )
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert body["user"]["has_avatar"] is True

    r2 = client.get("/api/profile/avatar", headers=auth_headers(auth_token))
    assert r2.status_code == 200
    assert r2.data == MINI_PNG


def test_delete_avatar(client, auth_token):
    client.post(
        "/api/profile/avatar",
        data={"file": (io.BytesIO(MINI_PNG), "avatar.png", "image/png")},
        headers=auth_headers(auth_token),
        content_type="multipart/form-data",
    )
    r = client.delete("/api/profile/avatar", headers=auth_headers(auth_token))
    assert r.status_code == 200
    assert r.get_json()["user"]["has_avatar"] is False

    r2 = client.get("/api/profile/avatar", headers=auth_headers(auth_token))
    assert r2.status_code == 404
