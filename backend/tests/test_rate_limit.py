"""Tests for get_client_ip XFF index logic."""

from unittest.mock import MagicMock, patch

import pytest

from app.core.rate_limit import get_client_ip


def _make_request(xff: str | None = None, peer_ip: str = "10.0.0.1") -> MagicMock:
    request = MagicMock()
    request.client.host = peer_ip
    headers = {}
    if xff is not None:
        headers["x-forwarded-for"] = xff
    headers.setdefault("x-real-ip", None)
    request.headers.get = lambda key, default=None: headers.get(key, default)
    return request


class TestGetClientIpLegacyMode:
    """Tests for the depth-based (non-strict) proxy mode."""

    @pytest.fixture(autouse=True)
    def _disable_strict_mode(self):
        with patch("app.core.rate_limit.settings") as mock_settings:
            mock_settings.strict_proxy_mode = False
            mock_settings.trusted_proxy_depth = 1
            self.settings = mock_settings
            yield

    def test_single_ip_no_spoofing(self):
        request = _make_request(xff="192.168.1.100")
        assert get_client_ip(request) == "192.168.1.100"

    def test_two_ips_returns_real_not_spoofed(self):
        request = _make_request(xff="1.2.3.4, 5.6.7.8")
        assert get_client_ip(request) == "5.6.7.8"

    def test_three_ips_returns_proxy_appended_ip(self):
        request = _make_request(xff="fake1, fake2, 5.6.7.8")
        assert get_client_ip(request) == "5.6.7.8"

    def test_spoofed_header_does_not_bypass(self):
        request = _make_request(xff="attacker_ip, real_client_ip")
        assert get_client_ip(request) == "real_client_ip"

    def test_depth_zero_ignores_xff(self):
        self.settings.trusted_proxy_depth = 0
        request = _make_request(xff="1.2.3.4", peer_ip="10.0.0.1")
        result = get_client_ip(request)
        assert result == "10.0.0.1"

    def test_no_xff_header_falls_back_to_peer(self):
        request = _make_request(xff=None, peer_ip="172.16.0.5")
        result = get_client_ip(request)
        assert result == "172.16.0.5"

    def test_x_real_ip_ignored_when_depth_zero(self):
        self.settings.trusted_proxy_depth = 0
        request = _make_request(peer_ip="10.0.0.1")
        request.headers.get = lambda key, default=None: {
            "x-forwarded-for": None,
            "x-real-ip": "attacker_ip",
        }.get(key, default)
        result = get_client_ip(request)
        assert result == "10.0.0.1"

    def test_depth_two_with_two_proxies(self):
        self.settings.trusted_proxy_depth = 2
        # untrusted1/untrusted2: attacker-injected (depth=2 trusts only last 2 hops).
        # real_client: appended by proxy1 (= real client IP seen by proxy1).
        # proxy1_egress: appended by proxy2 (= proxy1 outbound IP seen by proxy2).
        request = _make_request(xff="untrusted1, untrusted2, real_client, proxy1_egress")
        assert get_client_ip(request) == "real_client"
