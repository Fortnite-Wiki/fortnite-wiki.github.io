"""Validate a collector snapshot before publishing it with the site."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def sync_snapshot(source: Path, target: Path) -> bool:
    raw = source.read_bytes()
    data = json.loads(raw)
    if not isinstance(data, dict) or data.get("schemaVersion") != 1:
        raise ValueError("Unsupported hotfix schema")
    replacements = data.get("replacements")
    if (not isinstance(replacements, list) or not replacements or
            data.get("count") != len(replacements)):
        raise ValueError("Hotfix replacement count is missing or inconsistent")
    checked_at = datetime.fromisoformat(data["checkedAt"].replace("Z", "+00:00"))
    if checked_at.tzinfo is None or checked_at > datetime.now(timezone.utc):
        raise ValueError("Invalid hotfix checkedAt timestamp")
    for record in replacements:
        if (not isinstance(record, dict) or not isinstance(record.get("key"), str) or
                not record["key"] or not isinstance(record.get("namespace"), str) or
                not isinstance(record.get("category"), str) or
                not isinstance(record.get("localizedStrings"), dict) or
                any(not isinstance(value, str) for value in record["localizedStrings"].values())):
            raise ValueError("Invalid hotfix replacement")

    if target.exists() and target.read_bytes() == raw:
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".tmp")
    temporary.write_bytes(raw)
    temporary.replace(target)
    return True


if __name__ == "__main__":
    changed = sync_snapshot(Path(sys.argv[1]), Path(sys.argv[2]))
    print("Hotfix snapshot updated." if changed else "Hotfix snapshot unchanged.")
