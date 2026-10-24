"""Validation and cleanup regressions with memory and real local Redis."""

import os
from unittest.mock import AsyncMock, Mock
from urllib.parse import urlsplit
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.controllers import contact
from app.controllers.dependencies import get_job_queue, get_send_contact_use_case
from app.core import idempotency
from app.main import app


@pytest_asyncio.fixture(
    params=["memory", pytest.param("redis", marks=pytest.mark.redis_integration)]
)
async def contact_store(request, monkeypatch):
    store = idempotency.IdempotencyStore()
    key = f"a2-test-{uuid4().hex}"
    if request.param == "redis":
        url = os.getenv("REDIS_TEST_URL")
        if not url:
            pytest.skip("Set REDIS_TEST_URL to a disposable local database /15")
        parsed = urlsplit(url)
        if (
            parsed.scheme != "redis"
            or parsed.hostname not in {"localhost", "127.0.0.1"}
            or parsed.path != "/15"
            or parsed.username is not None
            or parsed.password is not None
            or parsed.query
            or parsed.fragment
        ):
            pytest.fail("REDIS_TEST_URL must target disposable localhost Redis /15")
        store._redis = idempotency.create_redis_client(url)
    monkeypatch.setattr(idempotency, "store", store)
    monkeypatch.setattr(contact, "store", store)
    try:
        if store._redis is not None:
            await store._redis.ping()
        yield store, key
    finally:
        if store._redis is not None:
            try:
                await store._redis.delete(store._redis_key(key))
            finally:
                await store._redis.aclose()


@pytest_asyncio.fixture
async def contact_client():
    delivery = AsyncMock()
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_send_contact_use_case] = lambda: delivery
    app.dependency_overrides[get_job_queue] = lambda: None
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield client, delivery
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


def payload():
    return {
        "name": "Test User",
        "email": "sender@example.com",
        "message": "A valid contact message.",
    }


async def assert_missing(store, key):
    assert await store.get(key) is None
    assert key not in store._cache
    if store._redis is not None:
        assert await store._redis.exists(store._redis_key(key)) == 0


@pytest.mark.parametrize("header", ["Idempotency-Key", "X-Idempotency-Key"])
async def test_invalid_then_valid_and_replay(contact_client, contact_store, header):
    client, delivery = contact_client
    store, key = contact_store
    headers = {header: key}
    invalid = await client.post(
        "/api/v1/contact", headers=headers, json={**payload(), "email": "invalid"}
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "INPUT_VALIDATION_ERROR"
    delivery.execute.assert_not_awaited()
    await assert_missing(store, key)

    valid = await client.post("/api/v1/contact", headers=headers, json=payload())
    assert valid.status_code == 200
    record = await store.get(key)
    assert record is not None and not record.in_progress
    assert record.content == valid.json()
    if store._redis is not None:
        assert await store._redis.exists(store._redis_key(key)) == 1
        assert store._cache == {}

    replay = await client.post("/api/v1/contact", headers=headers, json=payload())
    assert replay.status_code == 200
    assert replay.headers["X-Cache-Idempotency"] == "HIT"
    assert replay.json() == valid.json()
    assert await store.get(key) == record
    delivery.execute.assert_awaited_once()


async def test_conflict_preserves_reservation(contact_client, contact_store):
    client, delivery = contact_client
    store, key = contact_store
    assert await store.set_in_progress(key)
    record = await store.get(key)
    response = await client.post(
        "/api/v1/contact", headers={"Idempotency-Key": key}, json=payload()
    )
    assert response.status_code == 409
    assert await store.get(key) == record
    delivery.execute.assert_not_awaited()
    if store._redis is not None:
        assert store._cache == {}


@pytest.mark.parametrize("during_acquisition", [False, True])
async def test_failure_cleanup(
    contact_client, contact_store, monkeypatch, during_acquisition
):
    client, delivery = contact_client
    store, key = contact_store
    release = AsyncMock(wraps=store.release)
    monkeypatch.setattr(store, "release", release)
    if during_acquisition:
        monkeypatch.setattr(
            contact,
            "verify_idempotency",
            AsyncMock(side_effect=HTTPException(503, "Reservation failed")),
        )
    else:
        monkeypatch.setattr(
            contact._guard,
            "get_spam_score",
            Mock(side_effect=HTTPException(503, "Processing failed")),
        )
    response = await client.post(
        "/api/v1/contact", headers={"Idempotency-Key": key}, json=payload()
    )
    assert response.status_code == 503
    if during_acquisition:
        release.assert_not_awaited()
    else:
        release.assert_awaited_once_with(key)
    await assert_missing(store, key)
    delivery.execute.assert_not_awaited()


@pytest.mark.parametrize("read_before_reacquire", [False, True])
async def test_memory_lock_expiration(monkeypatch, read_before_reacquire):
    clock = Mock()
    clock.time.return_value = 1000
    monkeypatch.setattr(idempotency, "time", clock)
    store = idempotency.IdempotencyStore(ttl_seconds=3600, lock_ttl_seconds=30)
    assert await store.set_in_progress("lock")
    clock.time.return_value = 1029
    assert (await store.get("lock")).in_progress
    assert not await store.set_in_progress("lock")
    clock.time.return_value = 1031
    if read_before_reacquire:
        assert await store.get("lock") is None
    assert await store.set_in_progress("lock")


async def test_memory_completed_response_uses_response_ttl(monkeypatch):
    clock = Mock()
    clock.time.return_value = 1000
    monkeypatch.setattr(idempotency, "time", clock)
    store = idempotency.IdempotencyStore(ttl_seconds=3600, lock_ttl_seconds=30)
    await store.set("completed", 200, {"ok": True})
    clock.time.return_value = 1031
    assert (await store.get("completed")).content == {"ok": True}
    assert not await store.set_in_progress("completed")
    clock.time.return_value = 4601
    assert await store.get("completed") is None
    assert await store.set_in_progress("completed")
