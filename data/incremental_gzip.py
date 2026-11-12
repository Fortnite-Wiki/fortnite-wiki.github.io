"""Reuse generated gzip files when their source content has not changed."""

import gzip
import hashlib
import json
import os
from pathlib import Path


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

    def _key(self, destination):
        return Path(destination).resolve().relative_to(self.root).as_posix()

    def compress(self, source, destination, *, equivalent_json=True):
        return self.compress_bytes(Path(source).read_bytes(), destination, equivalent_json=equivalent_json)

    def compress_bytes(self, raw, destination, *, equivalent_json=True):
        destination = Path(destination)
        key = self._key(destination)
        digest = hashlib.sha256(raw).hexdigest()
        previous = self.entries.get(key)

        if destination.is_file():
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

    def remove(self, destination):
        key = self._key(destination)
        Path(destination).unlink()
        self.entries.pop(key, None)

    def save(self):
        payload = {"version": 1, "entries": self.entries}
        temp_path = self.cache_path.with_name(self.cache_path.name + ".tmp")
        temp_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        os.replace(temp_path, self.cache_path)
