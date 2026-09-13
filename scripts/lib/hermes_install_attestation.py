"""Read-only private installation receipt validation before importing Hermes.

Receipt generation is an explicit installation operation outside this module.
It cannot bless drift, fetch packages, execute .pth files, or grant admission.
"""
import hashlib
import json
import os
from pathlib import Path


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def verify(root, receipt_sha256):
    root = Path(root)
    if not root.is_absolute() or any(x.is_symlink() for x in (root, *root.parents)):
        raise ValueError("installation_path_invalid")
    receipt = root / "receipts" / "installation.json"
    if digest(receipt) != receipt_sha256:
        raise ValueError("installation_receipt_drift")
    data = json.loads(receipt.read_bytes())
    if data["commit"] != "939e45c91d751fadd94dcd1b873ac3cb44846213" or data["version"] != "0.21.2":
        raise ValueError("installation_pin_drift")
    expected = data["files"]
    actual = {}
    for name in ("source", "venv", "tools"):
        for base, dirs, files in os.walk(root / name, followlinks=False):
            for leaf in dirs + files:
                path = Path(base) / leaf
                rel = path.relative_to(root).as_posix()
                if path.is_symlink():
                    actual[rel] = {"link": os.readlink(path)}
                elif path.is_file():
                    actual[rel] = {"sha256": digest(path)}
    if actual != expected:
        raise ValueError("installation_files_drift")
    interpreter = Path(data["interpreter"])
    if interpreter.resolve(strict=True) != interpreter or digest(interpreter) != data["interpreterSha256"]:
        raise ValueError("interpreter_drift")
    return data
