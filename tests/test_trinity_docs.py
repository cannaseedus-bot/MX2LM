import json
import unittest
from pathlib import Path


class TrinityScaffoldTests(unittest.TestCase):
    def test_trinity_manifest_valid_json(self):
        data = json.loads(Path('manifest.xjson').read_text(encoding='utf-8'))
        self.assertIn('@context', data)
        self.assertIn('@runtime', data)

    def test_architecture_doc_mentions_trinity_files(self):
        text = Path('docs/ARCHITECTURE.md').read_text(encoding='utf-8')
        self.assertIn('TrinityShell.psm1', text)
        self.assertIn('trinity.ps1', text)


if __name__ == '__main__':
    unittest.main()
