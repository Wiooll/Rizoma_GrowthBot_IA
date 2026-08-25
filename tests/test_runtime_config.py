import os
import shutil
import unittest
from pathlib import Path


class RuntimeConfigTest(unittest.TestCase):
    def test_env_secrets_do_not_get_persisted_to_file(self):
        scratch_dir = Path("tests/.tmp-runtime-config")
        scratch_dir.mkdir(parents=True, exist_ok=True)
        config_path = scratch_dir / "config.yaml"
        previous = {
            "RIZOMA_CONFIG_PATH": os.environ.get("RIZOMA_CONFIG_PATH"),
            "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY"),
        }
        try:
            os.environ["RIZOMA_CONFIG_PATH"] = str(config_path)
            os.environ["OPENAI_API_KEY"] = "test-secret-from-env"

            from backend import llm

            llm.CONFIG_PATH = config_path
            llm.save_config(
                {
                    "llm": {
                        "provider": "openai",
                        "openai_api_key": "should-not-be-written",
                        "openai_model": "gpt-4o-mini",
                    }
                }
            )

            saved = config_path.read_text(encoding="utf-8")
            self.assertNotIn("test-secret-from-env", saved)
            self.assertNotIn("should-not-be-written", saved)
            self.assertIn("provider: openai", saved)
        finally:
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
            shutil.rmtree(scratch_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()