"""
Supabase client singleton.
Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from .env.
The service-role key bypasses RLS — keep it server-side only.
"""
import os
import time
from functools import lru_cache
from dotenv import load_dotenv

# ── Patch: Prevent Fastapi Thread Starvation & Errno 11 ──────────────────────
import httpx
try:
    import anyio.to_thread
    anyio.to_thread.current_default_thread_limiter().total_tokens = 100
except Exception:
    pass

_original_send = httpx.Client.send
def _resilient_send(self, request, *args, **kwargs):
    retries = 3
    for attempt in range(retries):
        try:
            return _original_send(self, request, *args, **kwargs)
        except (httpx.ReadError, httpx.ConnectError, httpx.PoolTimeout) as e:
            if attempt == retries - 1:
                raise
            time.sleep(0.5 * (2 ** attempt))
httpx.Client.send = _resilient_send
# ─────────────────────────────────────────────────────────────────────────────

from supabase import create_client, Client

load_dotenv()


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in your .env file."
        )
    return create_client(url, key)


def safe_data(res):
    """
    Safely extract .data from a Supabase response object.

    In supabase-py 2.7.x, .maybe_single().execute() returns None
    (not an object with .data = None) when no row matches the query.
    Calling .data on None causes AttributeError, so always go through
    this helper instead of accessing res.data directly.
    """
    if res is None:
        return None
    return res.data
