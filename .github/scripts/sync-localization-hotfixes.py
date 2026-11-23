"""Validate a collector snapshot before publishing it with the site."""

import json
import sys
import gzip
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


def replacement_groups(snapshot):
    groups = defaultdict(list)
    for record in snapshot.get("replacements", []):
        identity = (record["category"], record["namespace"], record["key"])
        groups[identity].append(record)
    return groups


def cosmetic_titles(data_dir):
    titles = defaultdict(list)
    try:
        with gzip.open(data_dir / "index.json.gz", "rt", encoding="utf-8") as file:
            entries = json.load(file)
        with gzip.open(data_dir / "hotfixes/cosmetic-keys.json.gz", "rt", encoding="utf-8") as file:
            keys = json.load(file)
        for entry in entries:
            path = entry.get("path") or entry.get("da_path")
            field = keys.get(path, {})
            key = field.get("Key")
            item_id = entry.get("id") or entry.get("bundle_id")
            if key and item_id:
                titles[(key, field.get("Namespace", ""))].append(
                    (item_id, entry.get("name") or entry.get("bundle_name") or item_id))
    except (OSError, ValueError, TypeError, KeyError) as error:
        print(f"Could not map hotfix keys to cosmetic names: {error}")

    try:
        set_keys = json.loads((data_dir / "CosmeticSetLocalizations.json").read_text(encoding="utf-8"))
        set_names = json.loads((data_dir / "CosmeticSets.json").read_text(encoding="utf-8"))
        for set_id, key in set_keys.items():
            titles[(key, "")].append((set_id, set_names.get(set_id, set_id)))
    except (OSError, ValueError, TypeError) as error:
        print(f"Could not map hotfix keys to set names: {error}")
    return titles


def format_hotfix_changes(previous, current, titles):
    old_groups = replacement_groups(previous)
    new_groups = replacement_groups(current)
    entries = []
    for category, namespace, key in sorted(old_groups.keys() | new_groups.keys()):
        old = old_groups.get((category, namespace, key), [])
        new = new_groups.get((category, namespace, key), [])
        if old == new:
            continue
        status = "ADDED" if not old else "REMOVED" if not new else "CHANGED"
        records = new or old
        english = next((record["localizedStrings"].get("en") for record in records
                        if record["localizedStrings"].get("en")), None)
        matched = titles.get((key, namespace), []) if category == "Game" else []
        if matched:
            label = ", ".join(f"{item_id} ({' '.join((english or name).split())})" for item_id, name in matched)
        else:
            label = f"Localization key {key} ({category}/{namespace or 'default'})"
        lines = [f"{status} {label} [hotfix]"]

        if len(old) > 1 or len(new) > 1:
            lines.append("  Duplicate hotfix records:")
            lines.append(f"    Before: {json.dumps(old, ensure_ascii=False, sort_keys=True)}")
            lines.append(f"    After: {json.dumps(new, ensure_ascii=False, sort_keys=True)}")
        else:
            old_strings = old[0]["localizedStrings"] if old else {}
            new_strings = new[0]["localizedStrings"] if new else {}
            for language in sorted(old_strings.keys() | new_strings.keys()):
                before = old_strings.get(language)
                after = new_strings.get(language)
                if before == after:
                    continue
                if before is None:
                    lines.append(f"  Added {language} hotfix: {json.dumps(after, ensure_ascii=False)}")
                elif after is None:
                    lines.append(f"  Removed {language} hotfix: {json.dumps(before, ensure_ascii=False)}")
                else:
                    lines.append(f"  Changed {language} hotfix:")
                    lines.append(f"    Before: {json.dumps(before, ensure_ascii=False)}")
                    lines.append(f"    After: {json.dumps(after, ensure_ascii=False)}")
        if len(lines) > 1:
            entries.append("\n".join(lines))
    return entries


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
    previous = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {"replacements": []}
    data_dir = target.parent.parent
    changes = format_hotfix_changes(previous, data, cosmetic_titles(data_dir))
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".tmp")
    temporary.write_bytes(raw)
    temporary.replace(target)
    if changes:
        report = data_dir / "datasetup-changes.txt"
        existing = report.read_text(encoding="utf-8") if report.exists() else ""
        heading = "Data setup compressed JSON changes\n\n"
        if existing.startswith(heading):
            existing = existing[len(heading):]
        report.write_text(heading + "\n\n".join(changes) + "\n\n" + existing, encoding="utf-8")
        print(f"Added {len(changes)} hotfix changes to {report}.")
    return True


if __name__ == "__main__":
    changed = sync_snapshot(Path(sys.argv[1]), Path(sys.argv[2]))
    print("Hotfix snapshot updated." if changed else "Hotfix snapshot unchanged.")
