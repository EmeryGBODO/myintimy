from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.exceptions import ApiException


class InMemoryRateLimiter:
    """Small per-process limiter used as application defense in depth.

    Production reverse proxies should enforce equivalent limits globally because
    this state is intentionally not shared between multiple application workers.
    """

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, *, key: str, limit: int, window_seconds: int) -> None:
        if limit <= 0 or window_seconds <= 0:
            return
        now = time.monotonic()
        threshold = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= threshold:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, int(window_seconds - (now - events[0])))
                raise ApiException(
                    status_code=429,
                    code="RATE_LIMITED",
                    message="Trop de tentatives. Réessayez plus tard.",
                    headers={"Retry-After": str(retry_after)},
                )
            events.append(now)

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


rate_limiter = InMemoryRateLimiter()


def request_ip(request: Request) -> str:
    # Do not trust X-Forwarded-For here. The reverse proxy must normalize the
    # client address before the application relies on forwarded headers.
    return request.client.host if request.client else "unknown"


def limit_request(request: Request, *, scope: str, discriminator: str = "", limit: int, window_seconds: int) -> None:
    identity = request_ip(request)
    suffix = discriminator.strip().lower()
    key = f"{scope}:{identity}:{suffix}"
    rate_limiter.check(key=key, limit=limit, window_seconds=window_seconds)
