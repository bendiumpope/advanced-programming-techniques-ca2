import pytest

from app import create_app
from config import Config


def _make_test_config(tmp_path, **extra):
    db_path = tmp_path / "test.db"
    inst = tmp_path / "instance"
    inst.mkdir(parents=True, exist_ok=True)

    class TestConfig(Config):
        TESTING = True
        RATELIMIT_ENABLED = False
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        INSTANCE_PATH = str(inst)

    for k, v in extra.items():
        setattr(TestConfig, k, v)

    return TestConfig


@pytest.fixture
def app(tmp_path):
    TestConfig = _make_test_config(tmp_path)
    app = create_app(TestConfig)
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_token(client):
    r = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password12"},
    )
    assert r.status_code == 201
    return r.get_json()["access_token"]
