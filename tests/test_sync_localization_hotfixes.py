import gzip
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / ".github/scripts/sync-localization-hotfixes.py"
spec = importlib.util.spec_from_file_location("sync_localization_hotfixes", SCRIPT)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def record(key, strings, namespace=""):
    return {
        "sourceFile": "DefaultGame.ini", "category": "Game", "namespace": namespace,
        "key": key, "nativeCulture": "en", "nativeString": "Blank",
        "isMinimalPatch": True, "localizedStrings": strings,
    }


def snapshot(*records):
    return {
        "schemaVersion": 1, "checkedAt": "2026-11-22T20:00:00Z",
        "count": len(records), "replacements": list(records),
    }


class HotfixChangelogTests(unittest.TestCase):
    def test_reports_only_changed_localized_strings(self):
        old = snapshot(record("NAME", {"en": "Blank", "fr": "Ancien"}),
                       record("OTHER", {"en": "Same"}, "Other"))
        new = snapshot(record("NAME", {"en": "Golden Llama Crew", "fr": "Ancien", "de": "Gold"}),
                       record("OTHER", {"en": "Same"}, "Other"))
        changes = sync.format_hotfix_changes(old, new, {("NAME", ""): [("CarSkin_Test", "Blank")]})
        self.assertEqual(len(changes), 1)
        self.assertIn("CHANGED CarSkin_Test (Golden Llama Crew) [hotfix]", changes[0])
        self.assertIn("Changed en hotfix:", changes[0])
        self.assertIn('Added de hotfix: "Gold"', changes[0])
        self.assertNotIn("fr hotfix", changes[0])

    def test_sync_prepends_changes_and_skips_unchanged_snapshot(self):
        with tempfile.TemporaryDirectory() as folder:
            data = Path(folder) / "data"
            hotfixes = data / "hotfixes"
            hotfixes.mkdir(parents=True)
            target = hotfixes / "current.json"
            source = Path(folder) / "collector.json"
            report = data / "datasetup-changes.txt"
            target.write_text(json.dumps(snapshot(record("NAME", {"en": "Blank"}))), encoding="utf-8")
            source.write_text(json.dumps(snapshot(record("NAME", {"en": "New name"}))), encoding="utf-8")
            report.write_text("Data setup compressed JSON changes\n\nCHANGED Existing\n  Added set: Test\n", encoding="utf-8")
            with gzip.open(data / "index.json.gz", "wt", encoding="utf-8") as file:
                json.dump([{"id": "CID_Test", "name": "Blank", "path": "Test.json"}], file)
            with gzip.open(hotfixes / "cosmetic-keys.json.gz", "wt", encoding="utf-8") as file:
                json.dump({"Test.json": {"Key": "NAME", "Namespace": ""}}, file)
            (data / "CosmeticSetLocalizations.json").write_text("{}", encoding="utf-8")
            (data / "CosmeticSets.json").write_text("{}", encoding="utf-8")

            self.assertTrue(sync.sync_snapshot(source, target))
            result = report.read_text(encoding="utf-8")
            self.assertLess(result.index("CHANGED CID_Test"), result.index("CHANGED Existing"))
            self.assertFalse(sync.sync_snapshot(source, target))
            self.assertEqual(report.read_text(encoding="utf-8"), result)

    def test_added_and_removed_hotfixes_are_reported(self):
        previous = snapshot(record("OLD", {"en": "Old text"}))
        current = snapshot(record("NEW", {"fr": "Nouveau texte"}))
        changes = sync.format_hotfix_changes(previous, current, {})
        self.assertEqual(len(changes), 2)
        self.assertIn("ADDED Localization key NEW (Game/default) [hotfix]", changes)
        self.assertTrue(any("REMOVED Localization key OLD" in change and
                            'Removed en hotfix: "Old text"' in change for change in changes))


if __name__ == "__main__":
    unittest.main()
