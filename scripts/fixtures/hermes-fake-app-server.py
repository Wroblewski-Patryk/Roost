"""Fixed local fixture: no provider connection, credentials, model or tools."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys


methods = []
selection = None
seal = None
input_hash = None


def emit(value):
    print(json.dumps(value), flush=True)


for line in sys.stdin:
    message = json.loads(line)
    method = message["method"]
    methods.append(method)
    params = message.get("params", {})
    if method == "initialized":
        continue
    if method == "initialize":
        result = {"userAgent": "offline-fixture"}
    elif method == "thread/start":
        assert params["ephemeral"] is True and params["dynamicTools"] == []
        assert params["approvalPolicy"] == "never" and params["sandbox"] == "read-only"
        result = {"thread": {"id": "synthetic-thread"}}
    elif method == "turn/start":
        assert methods.count(method) == 1
        assert params["threadId"] == "synthetic-thread"
        text = params["input"][0]["text"]
        envelope = json.loads(text)
        selection = {"model": params["model"], "reasoningEffort": params["effort"]}
        assert selection == envelope["contract"]["modelSelection"]
        assert envelope["startupTools"] == []
        seal = envelope["seal"]
        input_hash = hashlib.sha256(text.encode()).hexdigest()
        result = {"turn": {"id": "synthetic-turn"}}
    elif method == "boundary/probe":
        # The nested process can only sleep and exit. It has no code/input from
        # an agent and deliberately outlives the fake server's close by seconds.
        child = subprocess.Popen([sys.executable, "-I", "-B", "-c", "import time; time.sleep(4)"],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW)
        forbidden = [name for name in os.environ if name.upper().startswith((
            "ROOST_", "OPENAI_", "ANTHROPIC_", "MCP_", "PYTHONPATH", "PYTHONHOME", "NODE_OPTIONS"))]
        Path("wire-summary.json").write_text(json.dumps({"methods": methods,
            "modelSelection": selection, "inputSha256": input_hash, "seal": seal,
            "turnStarts": methods.count("turn/start"), "dynamicTools": 0,
            "forbiddenInheritedVariables": len(forbidden)}))
        emit({"method": "boundary/oversize", "params": {"payload": "x" * 32769}})
        sys.stderr.write("x" * 32769 + "\n")
        sys.stderr.flush()
        result = {"descendantPid": child.pid}
    else:
        raise RuntimeError("unexpected_offline_method")
    emit({"id": message["id"], "result": result})
