"""
Centralized process start time.

Both /metrics/summary and /health derive uptime from this single constant.
On multi-replica deployments each replica reports its own process uptime.
"""

import time

APP_START_TIME: float = time.time()
