import base64

# 1x1 transparent PNG (valid image for upload tests)
MINI_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
)


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
