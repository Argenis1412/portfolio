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
from app.core.idempotency import Reservation
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
    assert await store.set_in_progress(key, Reservation(key, "test-owner"))
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
        assert release.await_count == 1
        assert release.await_args.args[0].key == key
    await assert_missing(store, key)
    delivery.execute.assert_not_awaited()


@pytest.mark.parametrize("read_before_reacquire", [False, True])
async def test_memory_lock_expiration(monkeypatch, read_before_reacquire):
    clock = Mock()
    clock.time.return_value = 1000
    monkeypatch.setattr(idempotency, "time", clock)
    store = idempotency.IdempotencyStore(ttl_seconds=3600, lock_ttl_seconds=30)
    assert await store.set_in_progress("lock", Reservation("lock", "test-owner"))
    clock.time.return_value = 1029
    assert (await store.get("lock")).in_progress
    assert not await store.set_in_progress("lock", Reservation("lock", "test-owner"))
    clock.time.return_value = 1031
    if read_before_reacquire:
        assert await store.get("lock") is None
    assert await store.set_in_progress("lock", Reservation("lock", "test-owner"))


async def test_memory_completed_response_uses_response_ttl(monkeypatch):
    clock = Mock()
    clock.time.return_value = 1000
    monkeypatch.setattr(idempotency, "time", clock)
    store = idempotency.IdempotencyStore(ttl_seconds=3600, lock_ttl_seconds=30)
    await store.set(Reservation("completed", "test-owner"), 200, {"ok": True})
    clock.time.return_value = 1031
    assert (await store.get("completed")).content == {"ok": True}
    assert not await store.set_in_progress(
        "completed", Reservation("completed", "test-owner")
    )
    clock.time.return_value = 4601
    assert await store.get("completed") is None
    assert await store.set_in_progress(
        "completed", Reservation("completed", "test-owner")
    )


async def expire_reservation(store, key, monkeypatch):
    if store._redis is not None:
        await store._redis.pexpireat(store._redis_key(key), 1)
    else:
        clock = Mock()
        clock.time.return_value = (
            store._cache[key].timestamp + store.lock_ttl_seconds + 1
        )
        monkeypatch.setattr(idempotency, "time", clock)


@pytest.mark.parametrize("completed", [False, True])
@pytest.mark.parametrize("operation", ["release", "finalize"])
async def test_stale_owner_preserves_successor(
    contact_store, monkeypatch, completed, operation
):
    store, key = contact_store
    a, b = Reservation(key, "a"), Reservation(key, "b")
    assert await store.set_in_progress(key, a)
    await expire_reservation(store, key, monkeypatch)
    assert await store.set_in_progress(key, b)
    if completed:
        await store.set(b, 202, {"owner": "b"})
    before = await store.get(key)
    ttl = await store._redis.pttl(store._redis_key(key)) if store._redis else None
    if operation == "release":
        await store.release(a)
    else:
        await store.set(a, 200, {"owner": "a"})
    assert await store.get(key) == before
    if store._redis:
        after = await store._redis.pttl(store._redis_key(key))
        assert 0 < after <= ttl


@pytest.mark.parametrize("operation", ["release", "finalize"])
async def test_expired_owner_without_successor(contact_store, monkeypatch, operation):
    store, key = contact_store
    a = Reservation(key, "a")
    assert await store.set_in_progress(key, a)
    await expire_reservation(store, key, monkeypatch)
    if operation == "release":
        await store.release(a)
        await assert_missing(store, key)
    else:
        await store.set(a, 200, {"ok": True})
        with pytest.raises(idempotency.IdempotencyException) as hit:
            await idempotency.verify_idempotency(key, Reservation(key, "retry"))
        assert hit.value.record.content == {"ok": True}


@pytest.mark.parametrize("phase", ["acquire", "processing", "cleanup"])
async def test_cancellation_joins_cleanup(
    contact_client, contact_store, monkeypatch, phase
):
    import asyncio

    client, delivery = contact_client
    store, key = contact_store
    entered, proceed = asyncio.Event(), asyncio.Event()
    original_acquire, original_release = store.set_in_progress, store.release

    async def acquire(*args):
        result = await original_acquire(*args)
        if phase == "acquire":
            entered.set()
            await proceed.wait()
        return result

    async def reserve_dedup(*args):
        if phase == "processing":
            entered.set()
            await proceed.wait()
        raise HTTPException(503, "Processing failed")

    async def release(*args):
        if phase == "cleanup":
            entered.set()
            await proceed.wait()
        await original_release(*args)

    monkeypatch.setattr(store, "set_in_progress", acquire)
    monkeypatch.setattr(store, "release", release)
    monkeypatch.setattr(contact._guard, "reserve_dedup", reserve_dedup)
    baseline = asyncio.all_tasks()
    task = asyncio.create_task(
        client.post("/api/v1/contact", headers={"Idempotency-Key": key}, json=payload())
    )
    try:
        await asyncio.wait_for(entered.wait(), 2)
        task.cancel()
        await asyncio.sleep(0)
        task.cancel()
        proceed.set()
        with pytest.raises(asyncio.CancelledError):
            await task
        await assert_missing(store, key)
        assert not (asyncio.all_tasks() - baseline)
        delivery.execute.assert_not_awaited()
    finally:
        proceed.set()
        if not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)


async def test_protected_scope_and_timeout(monkeypatch):
    import asyncio
    import anyio

    finished = asyncio.Event()

    async def finish():
        await asyncio.sleep(0)
        finished.set()

    with anyio.CancelScope() as scope:
        scope.cancel()
        await contact._protected(finish())
    assert finished.is_set()
    monkeypatch.setattr(contact, "_PROTECTED_TIMEOUT", 0.01)
    baseline = asyncio.all_tasks()
    with pytest.raises(TimeoutError):
        await contact._protected(asyncio.Event().wait())
    assert asyncio.all_tasks() == baseline
