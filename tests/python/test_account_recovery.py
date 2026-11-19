import contextlib
import io
import json
from pathlib import Path
import runpy
import subprocess
import sys
import unittest
from unittest.mock import patch

helper = runpy.run_path(str(Path(__file__).resolve().parents[2] / "scripts/recover-finca-account.py"))
secret = "Fictitious_secret_only_for_tests_123"

class RecoveryInputTests(unittest.TestCase):
    def test_refuses_non_interactive_input(self):
        with patch.object(sys.stdin, "isatty", return_value=False), patch("getpass.getpass") as read:
            with self.assertRaises(ValueError):
                helper["read_credentials"]()
            read.assert_not_called()

    def test_mismatch_never_runs_docker(self):
        calls = []
        def run(args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0)
        with patch.object(sys.stdin, "isatty", return_value=True), patch("builtins.input", return_value="a@example.test"), patch("getpass.getpass", side_effect=[secret, secret + "different"]), patch("subprocess.run", side_effect=run), contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(ValueError):
                helper["main"]()
        self.assertEqual(calls, [["sudo", "-v"]])

    def test_secret_only_on_standard_input_and_browser_uses_actual_port(self):
        calls = []
        def run(args, **kwargs):
            calls.append((args, kwargs))
            if "exec" in args:
                self.assertNotIn(secret, " ".join(args))
                self.assertEqual(json.loads(kwargs["input"])["password"], secret)
                self.assertNotIn("env", kwargs)
                return subprocess.CompletedProcess(args, 0, '{"ok":true}', "")
            if "port" in args:
                return subprocess.CompletedProcess(args, 0, "0.0.0.0:18080\n[::]:18080\n", "")
            return subprocess.CompletedProcess(args, 0)
        output = io.StringIO()
        with patch.object(sys.stdin, "isatty", return_value=True), patch("builtins.input", return_value="a@example.test"), patch("getpass.getpass", side_effect=[secret, secret]), patch("subprocess.run", side_effect=run), patch("subprocess.Popen") as browser, contextlib.redirect_stdout(output):
            helper["main"]()
            self.assertEqual(browser.call_args.args[0], ["xdg-open", "http://localhost:18080"])
        self.assertNotIn(secret, output.getvalue())
        self.assertIn("Mot de passe modifié", output.getvalue())

    def test_invisible_input_must_be_available(self):
        import getpass
        with patch.object(sys.stdin, "isatty", return_value=True), patch("builtins.input", return_value="a@example.test"), patch("getpass.getpass", side_effect=getpass.GetPassWarning("fixture")):
            with self.assertRaises(getpass.GetPassWarning):
                helper["read_credentials"]()

if __name__ == "__main__":
    unittest.main()
