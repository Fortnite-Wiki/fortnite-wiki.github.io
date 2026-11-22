"""Reuse generated gzip files when their source content has not changed."""

from collections import Counter
import gzip
import hashlib
import io
import json
import os
import re
import subprocess
from pathlib import Path


def _load_set_names(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _report_label(path):
    parts = path.split(" > ")
    if parts[-1] in ("LocalizedString", "SourceString"):
        parent = next((part for part in reversed(parts[:-1])
                       if part != "Properties" and not part.startswith("item ")), "Text")
        return f"{parent} {parts[-1]}"
    return path


TEXT_FIELDS = {"LocalizedString", "SourceString", "CultureInvariantString"}
BLANK_BYTES = re.compile(rb'"blank"', re.IGNORECASE)


def _is_blank(value):
    return isinstance(value, str) and value.strip().casefold() == "blank"


def _has_blank_text(data):
    if isinstance(data, dict):
        return any((_is_blank(value) if key in TEXT_FIELDS else _has_blank_text(value))
                   for key, value in data.items())
    if isinstance(data, list):
        return any(_has_blank_text(value) for value in data)
    return False


def _preserve_text(data, previous):
    changed = 0
    if isinstance(data, dict) and isinstance(previous, dict):
        for key, value in data.items():
            old = previous.get(key)
            if key in TEXT_FIELDS and _is_blank(value) and isinstance(old, str) and old and not _is_blank(old):
                data[key] = old
                changed += 1
            else:
                changed += _preserve_text(value, old)
    elif isinstance(data, list) and isinstance(previous, list):
        named = {(item.get("Type"), item.get("Name")): item for item in previous
                 if isinstance(item, dict) and item.get("Name")}
        for index, item in enumerate(data):
            old = None
            if isinstance(item, dict) and item.get("Name"):
                old = named.get((item.get("Type"), item.get("Name")))
            if old is None and index < len(previous):
                old = previous[index]
            changed += _preserve_text(item, old)
    return changed


def _write_json_changes(report, before, after, path="", set_names=None, skip_blank=False):
    if isinstance(before, dict) and isinstance(after, dict):
        for key in sorted(before.keys() | after.keys()):
            if key == "GeneratedTagsIndexes":
                continue
            child = f"{path} > {key}" if path else str(key)
            if key not in before:
                report.write(f"  Added {_report_label(child)}: {json.dumps(after[key], ensure_ascii=False)}\n")
            elif key not in after:
                report.write(f"  Removed {_report_label(child)}: {json.dumps(before[key], ensure_ascii=False)}\n")
            elif before[key] != after[key]:
                _write_json_changes(report, before[key], after[key], child, set_names, skip_blank)
    elif isinstance(before, list) and isinstance(after, list):
        if all(not isinstance(value, (dict, list)) for value in before + after):
            label = "tag" if path.endswith(" > Tags") or path == "Tags" else f"value in {path.rsplit(' > ', 1)[-1] or 'list'}"
            old_counts = Counter(json.dumps(value, ensure_ascii=False) for value in before)
            new_counts = Counter(json.dumps(value, ensure_ascii=False) for value in after)
            for value, count in (old_counts - new_counts).items():
                for _ in range(count):
                    set_id = json.loads(value)
                    name = set_names[0].get(set_id) if set_names and isinstance(set_id, str) else None
                    if label == "tag" and name and set_id.startswith("Cosmetics.Set."):
                        report.write(f"  Removed set: {json.dumps(name, ensure_ascii=False)}\n")
                    else:
                        report.write(f"  Removed {label}: {value}\n")
            for value, count in (new_counts - old_counts).items():
                for _ in range(count):
                    set_id = json.loads(value)
                    name = set_names[1].get(set_id) if set_names and isinstance(set_id, str) else None
                    if label == "tag" and name and set_id.startswith("Cosmetics.Set."):
                        report.write(f"  Added set: {json.dumps(name, ensure_ascii=False)}\n")
                    else:
                        report.write(f"  Added {label}: {value}\n")
            if old_counts == new_counts:
                report.write(f"  Reordered {path.rsplit(' > ', 1)[-1] or 'list'} (same values)\n")
        else:
            for index in range(max(len(before), len(after))):
                child = f"{path} > item {index + 1}" if path else f"item {index + 1}"
                if index >= len(before):
                    report.write(f"  Added {child}: {json.dumps(after[index], ensure_ascii=False)}\n")
                elif index >= len(after):
                    report.write(f"  Removed {child}: {json.dumps(before[index], ensure_ascii=False)}\n")
                elif before[index] != after[index]:
                    _write_json_changes(report, before[index], after[index], child, set_names, skip_blank)
    else:
        if skip_blank and (_is_blank(before) or _is_blank(after)):
            return
        report.write(f"  Changed {_report_label(path) or 'value'}:\n")
        report.write(f"    Before: {json.dumps(before, ensure_ascii=False)}\n")
        report.write(f"    After:  {json.dumps(after, ensure_ascii=False)}\n")


def _index_entries(entries):
    indexed = {}
    seen = {}
    for position, entry in enumerate(entries):
        if not isinstance(entry, dict):
            indexed[f"position {position}"] = entry
            continue
        identity = entry.get("id") or entry.get("bundle_id") or entry.get("banner_id") or f"position {position}"
        source = entry.get("path") or entry.get("dav2_path") or entry.get("banner_path") or ""
        key = f"{identity} @ {source}" if source else str(identity)
        seen[key] = seen.get(key, 0) + 1
        if seen[key] > 1:
            key = f"{key} #{seen[key]}"
        indexed[key] = entry
    return indexed


def _changed_heading(key, data):
    item_id = Path(key).name.removesuffix(".json.gz")
    if key.startswith("cosmetics/") and isinstance(data, list) and data and isinstance(data[0], dict):
        item = data[0]
        item_id = item.get("Name") or item_id
        properties = item.get("Properties") or {}
        name_field = properties.get("ItemName") or {}
        name = name_field.get("LocalizedString") or name_field.get("SourceString")
        if name:
            return f"{item_id} ({name})"
    return item_id


class IncrementalGzip:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.cache_path = self.root / ".datasetup-gzip-cache.json"
        try:
            cached = json.loads(self.cache_path.read_text(encoding="utf-8"))
            self.entries = (
                cached["entries"]
                if isinstance(cached, dict)
                and cached.get("version") == 1
                and isinstance(cached.get("entries"), dict)
                else {}
            )
        except (OSError, ValueError):
            self.entries = {}
        self.written = 0
        self.reused = 0
        self.originals = {}
        self.previous_set_names = _load_set_names(self.root / "CosmeticSets.json")
        self._baseline_json = {}

    def _key(self, destination):
        return Path(destination).resolve().relative_to(self.root).as_posix()

    def compress(self, source, destination, *, equivalent_json=True):
        return self.compress_bytes(Path(source).read_bytes(), destination, equivalent_json=equivalent_json)

    def compress_bytes(self, raw, destination, *, equivalent_json=True):
        destination = Path(destination)
        key = self._key(destination)
        if key.startswith("cosmetics/") and BLANK_BYTES.search(raw):
            try:
                data = json.loads(raw)
                if self.preserve_blank_text(data, destination):
                    raw = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
            except ValueError:
                pass
        digest = hashlib.sha256(raw).hexdigest()
        previous = self.entries.get(key)

        existed = destination.is_file()
        existing = None
        if existed:
            stat = destination.stat()
            if (previous and previous.get("sha256") == digest and
                    previous.get("size") == stat.st_size and
                    previous.get("mtime_ns") == stat.st_mtime_ns):
                self.reused += 1
                return False

            # Bootstrap the cache against existing outputs on the first run.
            try:
                with gzip.open(destination, "rb") as existing_file:
                    existing = existing_file.read()
                matches = existing == raw
                if equivalent_json and not matches:
                    matches = json.loads(existing) == json.loads(raw)
                if matches:
                    self.entries[key] = {
                        "sha256": digest,
                        "size": stat.st_size,
                        "mtime_ns": stat.st_mtime_ns,
                    }
                    self.reused += 1
                    return False
            except (OSError, EOFError, ValueError):
                pass

        self.originals.setdefault(key, (existed, existing))
        destination.parent.mkdir(parents=True, exist_ok=True)
        compressed = gzip.compress(raw, mtime=0)
        temp_path = destination.with_name(destination.name + ".datasetup-tmp")
        try:
            temp_path.write_bytes(compressed)
            os.replace(temp_path, destination)
        finally:
            if temp_path.exists():
                temp_path.unlink()
        stat = destination.stat()
        self.entries[key] = {
            "sha256": digest,
            "size": stat.st_size,
            "mtime_ns": stat.st_mtime_ns,
        }
        self.written += 1
        return True

    def preserve_blank_text(self, data, destination):
        if not _has_blank_text(data):
            return 0
        destination = Path(destination)
        try:
            with gzip.open(destination, "rb") as source:
                previous = json.load(source)
        except (OSError, EOFError, ValueError):
            previous = None
        changed = _preserve_text(data, previous)
        if destination.is_file() and _has_blank_text(data):
            key = self._key(destination)
            if key not in self._baseline_json:
                try:
                    result = subprocess.run(
                        ["git", "show", f"HEAD:data/{key}"],
                        cwd=self.root.parent, capture_output=True, check=False
                    )
                except OSError:
                    result = None
                try:
                    self._baseline_json[key] = json.loads(gzip.decompress(result.stdout)) if result and result.returncode == 0 else None
                except (OSError, EOFError, ValueError):
                    self._baseline_json[key] = None
            changed += _preserve_text(data, self._baseline_json[key])
        return changed

    def remove(self, destination):
        key = self._key(destination)
        if key not in self.originals:
            try:
                with gzip.open(destination, "rb") as existing_file:
                    existing = existing_file.read()
            except (OSError, EOFError):
                existing = None
            self.originals[key] = (True, existing)
        Path(destination).unlink()
        self.entries.pop(key, None)

    def write_report(self, report_path):
        report_path = Path(report_path)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = report_path.with_name(report_path.name + ".tmp")
        counts = {"ADDED": 0, "CHANGED": 0, "REMOVED": 0, "REPLACED": 0}
        set_names = (self.previous_set_names, _load_set_names(self.root / "CosmeticSets.json"))

        with temp_path.open("w", encoding="utf-8", newline="\n") as report:
            report.write("Data setup compressed JSON changes\n\n")
            for key, (existed, original) in sorted(self.originals.items()):
                destination = self.root / key
                if not destination.is_file():
                    if existed:
                        report.write(f"REMOVED data/{key}\n\n")
                        counts["REMOVED"] += 1
                    continue

                with gzip.open(destination, "rb") as current_file:
                    current = current_file.read()
                try:
                    current_json = json.loads(current)
                    original_json = json.loads(original) if original is not None else None
                except (ValueError, TypeError):
                    current_json = original_json = None

                if existed and original is not None:
                    if current == original or (current_json is not None and current_json == original_json):
                        continue
                    status = "CHANGED"
                else:
                    status = "REPLACED" if existed else "ADDED"

                if status == "CHANGED":
                    if original_json is not None and current_json is not None:
                        details = io.StringIO()
                        if key == "index.json.gz" and isinstance(original_json, list) and isinstance(current_json, list):
                            _write_json_changes(details, _index_entries(original_json), _index_entries(current_json), set_names=set_names, skip_blank=True)
                        else:
                            _write_json_changes(details, original_json, current_json, set_names=set_names, skip_blank=key.startswith("cosmetics/"))
                        if not details.getvalue():
                            continue
                    else:
                        details = None

                counts[status] += 1
                heading = _changed_heading(key, current_json) if status == "CHANGED" else f"data/{key}"
                report.write(f"{status} {heading}\n")
                if status == "CHANGED":
                    if details is not None:
                        report.write(details.getvalue())
                    else:
                        before = original.decode("utf-8", errors="replace")
                        after = current.decode("utf-8", errors="replace")
                        report.write(f"  Previous text: {before}\n  Current text: {after}\n")
                elif status == "ADDED" and isinstance(current_json, list):
                    report.write(f"  {len(current_json)} JSON entries\n")
                    if len(current_json) == 1 and isinstance(current_json[0], dict):
                        item = current_json[0]
                        report.write(f"  Type: {item.get('Type', '')}; Name: {item.get('Name', '')}\n")
                elif status == "REPLACED":
                    report.write("  Previous gzip could not be read.\n")
                report.write("\n")

            if not any(counts.values()):
                report.write("No compressed JSON files changed.\n\n")
            report.write("Summary: " + ", ".join(f"{count} {status.lower()}" for status, count in counts.items()) + "\n")

        os.replace(temp_path, report_path)
        return counts

    def save(self):
        payload = {"version": 1, "entries": self.entries}
        temp_path = self.cache_path.with_name(self.cache_path.name + ".tmp")
        temp_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        os.replace(temp_path, self.cache_path)
