import pytest

from app.core.spam_store import SpamDedupStore


@pytest.mark.asyncio
async def test_spam_store_blocks_duplicates_without_redis():
    store = SpamDedupStore(redis_url=None)

    assert await store.reserve("abc123", ttl_seconds=60) is True
    assert await store.reserve("abc123", ttl_seconds=60) is False


@pytest.mark.asyncio
async def test_spam_store_expires_entries_without_redis():
    store = SpamDedupStore(redis_url=None)

    assert await store.reserve("abc123", ttl_seconds=0) is True
    assert await store.reserve("abc123", ttl_seconds=0) is True
