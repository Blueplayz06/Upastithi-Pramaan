"""
Supabase client singleton.
Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from .env.
The service-role key bypasses RLS — keep it server-side only.
"""
import os
from functools import lru_cache
from dotenv import load_dotenv
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
