def test_chaos_mild(api_client, chaos_teardown):
    """
    Simulate MILD preset (traffic spike).
    Validates that the system degrades acceptably and tracks error rate within a window.
    """
    # 1. Setup: Apply Chaos Preset MILD
    resp = api_client.post("/api/v1/chaos/spike")
    assert resp.status_code == 200
    spike_data = resp.json()
    assert spike_data["status"] == "completed"
    assert spike_data["requests_sent"] > 0

    # 2. Test: Validate degraded behavior
    metrics_resp = api_client.get("/api/v1/metrics/summary")
    assert metrics_resp.status_code == 200
    metrics = metrics_resp.json()

    assert metrics.get("system_lifecycle") in (
        "DEGRADED",
        "RECOVERING",
    ), (
        f"Expected DEGRADED or RECOVERING after spike, got {metrics.get('system_lifecycle')}"
    )
    assert 0.0 <= metrics.get("error_rate", 0.0) <= 0.15, (
        f"Error rate {metrics.get('error_rate')} exceeds MILD threshold"
    )
    assert metrics.get("p95_ms", 0) >= 0, "P95 must be non-negative"

    # 3. Teardown handles the recovery validation
