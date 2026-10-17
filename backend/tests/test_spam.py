"""
Tests for Honeypot and Spam Scoring defense layers.
"""

from unittest.mock import AsyncMock

import pytest

from app.controllers.dependencies import get_send_contact_use_case
from app.controllers.dependencies import get_job_queue
from app.core.honeypot import is_honeypot_triggered
from app.core.spam_check import calculate_spam_score
from app.main import app


@pytest.fixture
def mock_use_case():
    uc = AsyncMock()
    uc.execute.return_value = True
    app.dependency_overrides[get_send_contact_use_case] = lambda: uc
    try:
        yield uc
    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)


@pytest.mark.parametrize(
    "honeypot_field,value",
    [
        ("website", "http://evilbot.com"),
        ("fax", "123456"),
        ("company", "Spam Corp"),
        ("middle_name", "Danger"),
    ],
)
def test_honeypot_triggered(client, mock_use_case, honeypot_field, value):
    """Verifies if the honeypot blocks the send but returns fake success."""
    payload = {
        "name": "Bot",
        "email": "bot@spam.com",
        "subject": "Spam bot",
        "message": "I am a bot filling all fields.",
        honeypot_field: value,
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    assert response.json()["success"] is True
    # The Use Case MUST NOT have been called
    mock_use_case.execute.assert_not_called()


def test_spam_score_high_is_delivered_with_flag(client, mock_use_case):
    """High heuristic scores are delivered instead of silently discarded."""
    payload = {
        "name": "Spammer",
        "email": "spammer@temp-mail.org",  # +40 pts
        "subject": "Cheap Bitcoin",
        "message": "Buy bitcoin now! http://spam1.com http://spam2.com http://spam3.com official winner prize",  # +25 pts (links) + 30 pts (keywords)
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    assert response.json()["success"] is True
    mock_use_case.execute.assert_called_once()
    assert mock_use_case.execute.call_args.kwargs["is_suspicious"] is True
    assert mock_use_case.execute.call_args.kwargs["spam_score"] >= 70


def test_spam_score_medium_suspect(client, mock_use_case):
    """Verifies if a medium score (>30) marks it as [SUSPECT]."""
    payload = {
        "name": "Suspicious User",
        "email": "user@temp-mail.org",
        "subject": "Inquiry",
        "message": "Official marketing offer for your project: http://mysite.com",
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    # The Use Case should have been called with is_suspicious=True
    mock_use_case.execute.assert_called_once()
    args, kwargs = mock_use_case.execute.call_args
    assert kwargs["is_suspicious"] is True
    assert kwargs["spam_score"] > 30


def test_normal_message_not_suspect(client, mock_use_case):
    """Verifies if a normal message passes without marking."""
    payload = {
        "name": "Argenis",
        "email": "argenis@example.com",
        "subject": "Job Opportunity",
        "message": "Hello, I would like to talk about a backend role.",
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    mock_use_case.execute.assert_called_once()
    args, kwargs = mock_use_case.execute.call_args
    assert kwargs["is_suspicious"] is False


@pytest.mark.parametrize(
    ("name", "subject"),
    [
        ("李", "面试邀请 🚀"),
        ("María D’Ávila", "Backend — propuesta técnica"),
        ("Иван Петров", "Вакансия разработчика"),
        ("علي", "Software Engineer Role"),
        ("John 四", "Team Ⅻ – interview"),
    ],
)
def test_international_contact_is_delivered_without_format_penalty(
    client, mock_use_case, name, subject
):
    response = client.post(
        "/api/v1/contact",
        json={
            "name": name,
            "subject": subject,
            "email": "recruiter@example.com",
            "message": "Hello, I would like to schedule an interview with you.",
        },
    )
    assert response.status_code == 200
    mock_use_case.execute.assert_awaited_once()
    kwargs = mock_use_case.execute.call_args.kwargs
    assert kwargs["name"] == name
    assert kwargs["subject"] == subject
    assert kwargs["is_suspicious"] is False


@pytest.mark.parametrize("score", [29, 30, 69, 70, 100])
def test_all_score_levels_are_queued_with_correct_flag(
    client, mock_use_case, monkeypatch, score
):
    queue = AsyncMock()
    app.dependency_overrides[get_job_queue] = lambda: queue
    monkeypatch.setattr(
        "app.controllers.contact._guard.get_spam_score", lambda *args: score
    )
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Test",
            "email": "sender@example.com",
            "message": "Message for review.",
        },
    )
    assert response.status_code == 200
    assert response.json()["delivery_mode"] == "stream"
    queue.enqueue.assert_awaited_once()
    payload = queue.enqueue.call_args.kwargs["payload"]
    assert payload["is_suspicious"] is (score >= 30)
    assert payload["spam_score"] == score
    mock_use_case.execute.assert_not_awaited()


@pytest.mark.parametrize("queued", [False, True])
def test_honeypot_acceptance_matches_normal_submission_without_delivery(
    client, mock_use_case, queued
):
    queue = AsyncMock() if queued else None
    app.dependency_overrides[get_job_queue] = lambda: queue
    payload = {
        "name": "Test",
        "email": "sender@example.com",
        "message": "A normal message.",
    }
    normal = client.post("/api/v1/contact", json=payload)
    mock_use_case.execute.reset_mock()
    if queue is not None:
        queue.enqueue.reset_mock()
    trapped = client.post(
        "/api/v1/contact", json={**payload, "website": "https://bot.example"}
    )
    assert normal.status_code == trapped.status_code == 200
    assert normal.json() == trapped.json()
    mock_use_case.execute.assert_not_awaited()
    if queue is not None:
        queue.enqueue.assert_not_awaited()


def test_likely_spam_cannot_bypass_deduplication_or_email_limit(client, mock_use_case):
    payload = {
        "name": "Test",
        "email": "sender@temp-mail.org",
        "message": "Bitcoin casino prize 0",
    }
    assert client.post("/api/v1/contact", json=payload).status_code == 200
    assert client.post("/api/v1/contact", json=payload).status_code == 400
    for number in range(1, 10):
        payload["message"] = f"Bitcoin casino prize {number}"
        assert client.post("/api/v1/contact", json=payload).status_code == 200
    payload["message"] = "Bitcoin casino prize final"
    assert client.post("/api/v1/contact", json=payload).status_code == 429
    assert mock_use_case.execute.await_count == 10


@pytest.mark.parametrize(
    "message",
    [
        "Our agency has a freelance app development proposal and a website design role.",
        "Oferta de trabajo: hablamos del negocio por WhatsApp o Telegram, gracias.",
        "Our marketing and SEO team would like to discuss an outsourcing opportunity.",
    ],
)
def test_recruitment_terms_do_not_raise_spam_score(message):
    assert calculate_spam_score(message, "recruiter@example.com") == 0


def test_honeypot_is_triggered_with_empty_data():
    """Verifies False return when data has no spam fields."""
    assert is_honeypot_triggered({"name": "John", "email": "j@mock.com"}) is False


def test_honeypot_is_triggered_with_spam_fields():
    """Verifies True return when feeding arrays containing fields like website, fax, company, middle_name."""
    assert is_honeypot_triggered({"website": "http://spam.com"}) is True
    assert is_honeypot_triggered({"fax": "12345"}) is True
    assert is_honeypot_triggered({"company": "Spam Corp"}) is True
    assert is_honeypot_triggered({"middle_name": "Danger"}) is True


# ── P2 Regression Tests ────────────────────────────────────────────────────


def test_spam_score_www_and_https_different_domains_no_false_penalty():
    """
    P2 regression: https://foo.com + www.bar.com are DIFFERENT domains.
    Must NOT trigger the 'repeated same domain' penalty (+15 pts).

    Before the fix, all_links counted protocol prefixes (len=2) while
    unique_domains only extracted from https:// URLs (len=1), incorrectly
    satisfying the same-domain condition.

    Expected: score <= 30 (15 pts for 2 links, no same-domain penalty, no keywords).
    """
    from app.core.spam_check import calculate_spam_score

    score = calculate_spam_score(
        message="Check https://foo.com and also www.bar.com for details.",
        email="user@example.com",
    )
    assert score <= 30, f"Expected score <= 30 for different domains, got {score}"


def test_spam_score_www_and_https_same_domain_triggers_penalty():
    """
    P2 regression: www.foo.com and https://foo.com are the SAME domain.
    Must correctly trigger the 'repeated same domain' penalty (+15 pts).

    Expected: score >= 30 (15 pts for 2 links + 15 pts same-domain penalty).
    """
    from app.core.spam_check import calculate_spam_score

    score = calculate_spam_score(
        message="See https://foo.com/page1 and www.foo.com/page2 for more info.",
        email="user@example.com",
    )
    assert score >= 30, f"Expected same-domain penalty applied, got {score}"


def test_spam_score_url_with_trailing_punctuation_no_false_penalty():
    """
    Edge case: URLs ending a sentence carry trailing punctuation (e.g., 'www.foo.com.').
    The trailing dot must be stripped before domain comparison so that
    'www.beta.com.' and 'https://alpha.com' are not counted as one unique domain.

    Expected: score <= 30 (2 different domains, no same-domain penalty).
    """
    from app.core.spam_check import calculate_spam_score

    score = calculate_spam_score(
        message="Visit https://alpha.com or www.beta.com.",
        email="user@example.com",
    )
    assert score <= 30, (
        f"Expected score <= 30 for different domains with trailing punct, got {score}"
    )


def test_spam_score_adjacent_urls_with_comma_are_separated():
    """
    P1 regression: adjacent URLs separated by a comma should be counted
    as two distinct links, not a single merged one.
    """
    from app.core.spam_check import calculate_spam_score

    # https://a.com,https://b.com -> 2 links, 2 unique domains
    # Should not apply the same domain penalty (+15).
    # But it should count as 2 links for the rule of >=3 links.
    msg = "Check https://a.com,https://b.com,www.c.com"
    score = calculate_spam_score(msg, "valid@email.com")

    # Detalle esperado:
    # all_links = 3
    # unique_domains = 3
    # Rule 2 (all_links >= 3) -> +45
    # Rule 2 (multiple links same domain) -> NO (+0)
    assert score == 45


# ── Rule 9: Non-alphanumeric density ───────────────────────────────────────


def test_spam_score_symbol_soup_is_likely_spam():
    """
    Regression: the exact garbage message reported in production must be
    labeled as likely spam (score >= 70).
    """
    from app.core.spam_check import calculate_spam_score

    score = calculate_spam_score(
        message='&!@@#@#@!_+@!+({}) " "BUY skajsbka',
        email="real@gmail.com",
    )
    assert score >= 70, f"Expected likely-spam score for symbol soup, got {score}"


def test_spam_score_normal_spanish_message_not_flagged_by_density():
    """Normal prose (accented ES chars) must not trigger the density rule."""
    from app.core.spam_check import calculate_spam_score

    score = calculate_spam_score(
        message="Hola, me gustaría hablar sobre una vacante disponible. ¡Gracias!",
        email="user@example.com",
    )
    assert score <= 30


def test_spam_score_heavy_query_string_url_not_false_positive():
    """
    A legit message containing a param-heavy URL must not be penalized by
    the density rule — URLs are stripped before computing the ratio.
    """
    from app.core.spam_check import calculate_spam_score

    score = calculate_spam_score(
        message="Mira esto https://example.com/?a=1&b=2&c=3&d=4&e=5 saludos",
        email="client@empresa.com",
    )
    assert score <= 30


def test_spam_score_uppercase_url_scheme_not_false_positive():
    """URL stripping must be case-insensitive (HTTP:// as well as http://)."""
    from app.core.spam_check import calculate_spam_score

    score = calculate_spam_score(
        message="Visit HTTP://example.com/?x=1&y=2&z=3 thanks",
        email="dev@co.com",
    )
    assert score <= 30
