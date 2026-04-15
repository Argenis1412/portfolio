"""
Contact Guard: orchestrates all contact-form validation rules.

Centralises honeypot detection, spam scoring, content deduplication,
and rate-limiting into a single call surface so the controller
stays a thin HTTP adapter.
"""

from __future__ import annotations

import hashlib
import re

import structlog
from fastapi import Request

from app.core.honeypot import is_honeypot_triggered, HONEYPOT_FIELDS
from app.core.limite import check_rate_limit, get_client_ip, get_contact_fingerprint_key
from app.core.spam_check import calculate_spam_score
from app.core.spam_store import spam_dedup_store

logger = structlog.get_logger(__name__)


def email_domain(email: str) -> str:
    """Extracts the domain part of an email address for safe logging."""
    return email.split("@")[-1].lower() if "@" in email else "invalid-email"


class ContactGuard:
    """
    Validates and guards contact form submissions.

    Applies, in order:
      1. Honeypot check  — silent drop for bots
      2. Spam scoring    — classify and optionally silent-drop high-score messages
      3. Content dedup   — prevent identical messages within the TTL window
      4. Rate limiting   — per-email (10/day), per-IP (30/hour), per-fingerprint

    All checks delegate to the existing core modules; this class only
    orchestrates them and manages structured logging.
    """

    # Spam score thresholds (must match spam_check.py semantics)
    SCORE_SILENT_DROP = 70  # >= this: drop silently, return fake 200
    SCORE_SUSPICIOUS = 30  # >= this: deliver with [POSSIBLE SPAM] flag

    # Dedup window in seconds (same message within 30 minutes = duplicate)
    DEDUP_TTL_SECONDS = 1800

    @staticmethod
    def check_honeypot(form_data: object) -> bool:
        """
        Returns True if any honeypot field was filled (bot detected).

        Args:
            form_data: Pydantic request model with optional `website` / `fax` fields.
        """
        data = {field: getattr(form_data, field, None) for field in HONEYPOT_FIELDS}
        return is_honeypot_triggered(data)

    @staticmethod
    def build_content_hash(email: str, message: str) -> str:
        """
        Builds a SHA-256 hash from the normalised email + message for dedup.

        Normalisation: lowercase, collapse whitespace.
        """
        normalised = re.sub(r"\s+", " ", message or "").strip().lower()
        content_str = f"{(email or '').lower()}:{normalised}"
        return hashlib.sha256(content_str.encode()).hexdigest()

    @staticmethod
    def get_spam_score(message: str, email: str, nome: str = "", assunto: str = "") -> int:
        """
        Returns a spam score in [0, 100].

        0–30   Normal  — deliver
        31–69  Suspect — deliver with [POSSIBLE SPAM] flag
        >=70   Silent spam — silently drop
        """
        return calculate_spam_score(message, email, nome=nome, assunto=assunto)

    @staticmethod
    async def reserve_dedup(content_hash: str) -> bool:
        """
        Tries to reserve a content hash in the dedup store.

        Returns True if this is the first time this content is seen
        within the TTL window. Returns False if it is a duplicate.
        """
        return await spam_dedup_store.reserve(
            content_hash, ttl_seconds=ContactGuard.DEDUP_TTL_SECONDS
        )

    @staticmethod
    async def release_dedup(content_hash: str) -> None:
        """
        Releases a previously reserved content hash (called when the
        downstream request fails so the sender can retry).
        """
        await spam_dedup_store.release(content_hash)

    @staticmethod
    def apply_rate_limits(request: Request) -> None:
        """
        Applies all rate-limit tiers for contact submissions.

        Limits (fail-open — Redis outage allows the request through):
          - 10 / day   per validated email address
          - 20 / minute per validated email address
          - 30 / hour  per client IP
          - 30 / hour  per IP+UA fingerprint
        """
        check_rate_limit(request, "10/day")
        check_rate_limit(request, "20/minute")
        check_rate_limit(request, "30/hour", key_func=get_client_ip)
        check_rate_limit(request, "30/hour", key_func=get_contact_fingerprint_key)
