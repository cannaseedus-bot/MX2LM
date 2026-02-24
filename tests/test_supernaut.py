import unittest

from supernaut import Supernaut


class SupernautTests(unittest.TestCase):
    def test_awaken_loads_mx2lm_experts(self):
        s = Supernaut(moe_manifest_path="moe-manifest.xjson")
        status = s.awaken()
        self.assertTrue(status["body_active"])
        self.assertIn("CODE", status["core"]["experts"])
        self.assertIn("CLARIFY", status["core"]["experts"])

    def test_query_produces_integrated_response(self):
        s = Supernaut()
        s.awaken()
        out = s.query("Write a fibonacci function")
        self.assertIn("code", out)
        self.assertIn("thought_process", out)
        self.assertIn("fib", out["code"])


if __name__ == "__main__":
    unittest.main()
