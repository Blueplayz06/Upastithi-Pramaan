"""CSV / text report helpers."""
import csv
import io
from typing import List, Dict, Any


def list_to_csv(rows: List[Dict[str, Any]], fieldnames: List[str]) -> str:
    """Convert a list of dicts to a CSV string."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()
