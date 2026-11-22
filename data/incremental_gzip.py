"""Reuse generated gzip files when their source content has not changed."""

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
            if key in before and key in after:
                if before[key] == after[key]:
                    continue
                _write_json_changes(report, before[key], after[key], child, set_names, skip_blank)
            else:
                value = before[key] if key in before else after[key]
                empty = {} if isinstance(value, dict) else [] if isinstance(value, list) else None
                if key in before:
                    _write_json_changes(report, value, empty, child, set_names, skip_blank)
                else:
                    _write_json_changes(report, empty, value, child, set_names, skip_blank)
    elif isinstance(before, list) and isinstance(after, list):
        if path.endswith(" > Tags") or path == "Tags":
            old_sets = {value for value in before if isinstance(value, str) and value.startswith("Cosmetics.Set.")}
            new_sets = {value for value in after if isinstance(value, str) and value.startswith("Cosmetics.Set.")}
            for set_id in sorted(old_sets - new_sets):
                name = set_names[0].get(set_id, set_id) if set_names else set_id
                report.write(f"  Removed set: {json.dumps(name, ensure_ascii=False)}\n")
            for set_id in sorted(new_sets - old_sets):
                name = set_names[1].get(set_id, set_id) if set_names else set_id
                report.write(f"  Added set: {json.dumps(name, ensure_ascii=False)}\n")
        else:
            for index in range(max(len(before), len(after))):
                child = f"{path} > item {index + 1}" if path else f"item {index + 1}"
                if index >= len(before):
                    value = after[index]
                    _write_json_changes(report, {} if isinstance(value, dict) else [] if isinstance(value, list) else None,
                                        value, child, set_names, skip_blank)
                elif index >= len(after):
                    value = before[index]
                    _write_json_changes(report, value,
                                        {} if isinstance(value, dict) else [] if isinstance(value, list) else None,
                                        child, set_names, skip_blank)
                elif before[index] != after[index]:
                    _write_json_changes(report, before[index], after[index], child, set_names, skip_blank)
    else:
        if (path.rsplit(" > ", 1)[-1] not in TEXT_FIELDS or "UnlockRequirements" in path
                or (skip_blank and (_is_blank(before) or _is_blank(after)))):
            return
        if not any(isinstance(value, str) and value for value in (before, after)):
            return
        if before is None or after is None:
            action = "Added" if before is None else "Removed"
            report.write(f"  {action} {_report_label(path)}: {json.dumps(after if before is None else before, ensure_ascii=False)}\n")
            return
        report.write(f"  Changed {_report_label(path)}:\n")
        report.write(f"    Before: {json.dumps(before, ensure_ascii=False)}\n")
        report.write(f"    After:  {json.dumps(after, ensure_ascii=False)}\n")


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

    def _report_originals(self, baseline_ref):
        repo = self.root.parent
        try:
            changed = subprocess.run(
                ["git", "diff-index", "--name-only", "-z", baseline_ref, "--", "data"],
                cwd=repo, capture_output=True, check=False
            )
            untracked = subprocess.run(
                ["git", "ls-files", "--others", "--exclude-standard", "-z", "--", "data"],
                cwd=repo, capture_output=True, check=False
            )
        except OSError:
            return self.originals
        if changed.returncode or untracked.returncode:
            return self.originals

        paths = set((changed.stdout + untracked.stdout).decode("utf-8").split("\0"))
        originals = {}
        for path in paths:
            if not path.startswith("data/") or not path.endswith(".gz"):
                continue
            key = path.removeprefix("data/")
            previous = subprocess.run(
                ["git", "show", f"{baseline_ref}:{path}"],
                cwd=repo, capture_output=True, check=False
            )
            if previous.returncode:
                originals[key] = (False, None)
            else:
                try:
                    originals[key] = (True, gzip.decompress(previous.stdout))
                except (OSError, EOFError):
                    originals[key] = (True, None)
        return originals

    def write_report(self, report_path, baseline_ref="HEAD"):
        report_path = Path(report_path)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = report_path.with_name(report_path.name + ".tmp")
        counts = {"ADDED": 0, "CHANGED": 0, "REMOVED": 0, "REPLACED": 0}
        set_names = (self.previous_set_names, _load_set_names(self.root / "CosmeticSets.json"))

        with temp_path.open("w", encoding="utf-8", newline="\n") as report:
            report.write("Data setup compressed JSON changes\n\n")
            for key, (existed, original) in sorted(self._report_originals(baseline_ref).items()):
                if key == "index.json.gz":
                    continue
                destination = self.root / key
                current = None
                if destination.is_file():
                    with gzip.open(destination, "rb") as current_file:
                        current = current_file.read()
                try:
                    current_json = json.loads(current) if current is not None else None
                    original_json = json.loads(original) if original is not None else None
                except (ValueError, TypeError):
                    current_json = original_json = None

                if current is None:
                    status = "REMOVED"
                elif existed and original is not None:
                    if current == original or (current_json is not None and current_json == original_json):
                        continue
                    status = "CHANGED"
                else:
                    status = "REPLACED" if existed else "ADDED"

                if original_json is None and current_json is None:
                    continue
                details = io.StringIO()
                before = original_json if original_json is not None else type(current_json)()
                after = current_json if current_json is not None else type(original_json)()
                _write_json_changes(details, before, after, set_names=set_names, skip_blank=key.startswith("cosmetics/"))
                if not details.getvalue():
                    continue

                counts[status] += 1
                heading = _changed_heading(key, current_json if current_json is not None else original_json)
                report.write(f"{status} {heading}\n")
                report.write(details.getvalue())
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
