"""Check Resend configuration; send a test email only with --send."""

import argparse
import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.adapters.email_adapter import ResendEmailAdapter
from app.entities.message import Message
from app.settings import settings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--send", action="store_true", help="Send a real test email")
    args = parser.parse_args(argv)

    configured = True
    for name, value in (
        ("RESEND_API_KEY", settings.resend_api_key),
        ("RESEND_FROM_EMAIL", settings.resend_from_email),
        ("RESEND_TO_EMAIL", settings.resend_to_email),
    ):
        present = bool(value.strip()) and "your_api_key" not in value
        print(f"{name}: {'configured' if present else 'missing'}")
        configured = configured and present

    if not configured:
        return 1
    if not args.send:
        return 0

    adapter = ResendEmailAdapter(
        settings.resend_api_key,
        settings.resend_from_email,
        settings.resend_to_email,
    )
    message = Message(
        name="Portfolio Test",
        email=settings.resend_to_email,
        subject="Portfolio - Resend configuration test",
        message="This test email was explicitly requested with check_resend.py --send.",
    )
    success = asyncio.run(adapter.send_message(message))
    print("Test email sent." if success else "Test email failed.")
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
