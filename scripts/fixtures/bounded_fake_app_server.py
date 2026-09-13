"""Fixed offline protocol fixture. Never invokes Codex, a model, or a tool."""
import hashlib
import json
import os
import signal
import sys
import time

CASES = {"positive", "line_overflow", "aggregate_overflow", "notification_flood", "stderr_flood",
         "malformed_json", "wrong_order", "unknown_terminal", "missing_status", "two_completions",
         "startup_hang", "turn_hang", "outer_hang", "descendant", "missing_terminal", "late_terminal",
         "server_request", "wrong_scope", "nonzero_exit", "truncated_line", "duplicate_key", "no_read"}


def emit(value):
    sys.stdout.write(json.dumps(value, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def note(method, **params):
    emit({"jsonrpc": "2.0", "method": method,
          "params": {"threadId": "synthetic-thread", "turnId": "synthetic-turn", **params}})


def hang():
    time.sleep(90)  # The Worker deadline must stop this process before it returns.


def main():
    case = sys.argv[1]
    assert case in CASES and len(sys.argv) == 2
    if case in {"startup_hang", "no_read"}:
        hang()
    methods = []
    for line in sys.stdin:
        request = json.loads(line)
        method, params = request["method"], request["params"]
        methods.append(method)
        assert methods == ["initialize", "initialized", "thread/start", "turn/start"][:len(methods)]
        if method == "initialized":
            continue
        if method == "initialize":
            emit({"jsonrpc": "2.0", "id": request["id"], "result": {
                "environmentNames": sorted(os.environ),
                "cwdSha256": hashlib.sha256(os.getcwd().encode()).hexdigest()}})
        elif method == "thread/start":
            assert params == {"cwd": os.getcwd(), "model": "synthetic-model", "approvalPolicy": "never",
                              "sandbox": "read-only", "ephemeral": True, "dynamicTools": []}
            emit({"jsonrpc": "2.0", "id": request["id"], "result": {"thread": {"id": "synthetic-thread"}}})
        elif method == "turn/start":
            assert params == {"threadId": "synthetic-thread", "input": [{"type": "text", "text": "SYNTHETIC ENVELOPE"}],
                              "model": "synthetic-model", "effort": "low"}
            if case == "wrong_order":
                note("turn/completed", turn={"id": "synthetic-turn", "status": "completed"})
                return
            emit({"jsonrpc": "2.0", "id": request["id"], "result": {"turn": {"id": "synthetic-turn"}}})
            if case in {"turn_hang", "outer_hang"}:
                hang()
            if case == "descendant":
                signal.signal(signal.SIGTERM, signal.SIG_IGN)
                child = os.fork()
                if child == 0:
                    hang()
                    os._exit(0)
                note("item/agentMessage/delta", delta="child-created", itemId=str(child))
                hang()
            if case == "line_overflow":
                os.write(1, b" " * 8193 + b"\n")
                return
            if case in {"aggregate_overflow", "stderr_flood", "notification_flood"}:
                for _ in range(80):
                    if case == "notification_flood":
                        note("item/agentMessage/delta", delta="x" * 1000)
                    else:
                        os.write(2, b"x" * 1000 + b"\n")
                return
            if case == "malformed_json":
                os.write(1, b"{invalid}\n")
                return
            if case == "duplicate_key":
                os.write(1, b'{"jsonrpc":"2.0","method":"x","method":"y","params":{}}\n')
                return
            if case == "truncated_line":
                os.write(1, b'{"jsonrpc":')
                return
            if case == "server_request":
                emit({"jsonrpc": "2.0", "id": 9, "method": "item/commandExecution/requestApproval", "params": {}})
                hang()
            if case == "wrong_scope":
                note("turn/started", threadId="foreign-thread")
                return
            note("turn/started")
            note("item/completed", item={"id": "synthetic-item", "type": "agentMessage", "text": "SYNTHETIC OK"})
            if case == "missing_terminal":
                return
            if case == "late_terminal":
                time.sleep(.4)
            turn = {"id": "synthetic-turn", "status": "completed"}
            if case == "unknown_terminal":
                turn["status"] = "unknown"
            if case == "missing_status":
                turn.pop("status")
            note("turn/completed", turn=turn)
            if case == "two_completions":
                time.sleep(.04)
                note("turn/completed", turn=turn)
            if case == "nonzero_exit":
                sys.exit(3)
            return


if __name__ == "__main__":
    main()
