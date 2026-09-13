"""Offline structural checks for RF-HERMES-005; never runs an agent or network."""
import json
import pathlib
import re
import sys
from urllib.parse import unquote

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = "docs/architecture/direct-codex-app-server-contract-v1.md"
MATRIX = "docs/architecture/direct-codex-app-server-acceptance-v1.md"
INDEXES = (
    "docs/architecture/adopt-before-build.md",
    "docs/architecture/local-codex-agent-runtime.md",
    "docs/architecture/architecture-source-of-truth.md",
    "docs/architecture/traceability-matrix.md",
    "docs/decisions/ADR-001-direct-codex-app-server-pilot.md",
)


def require(condition, code):
    if not condition:
        raise ValueError(code)


def read(relative):
    path = ROOT / relative
    require(path.stat().st_size < 262144, "document_size")
    return path.read_text(encoding="utf-8")


def anchors(text):
    found = set(re.findall(r'<a\s+id="([^"]+)"', text))
    counts = {}
    for title in re.findall(r"^#{1,6} (.+)$", text, re.M):
        title = title.lower().replace("`", "")
        slug = "".join(c for c in title if c in "-_ " or c.isalnum())
        slug = slug.replace(" ", "-")
        number = counts.get(slug, 0)
        found.add(slug if number == 0 else f"{slug}-{number}")
        counts[slug] = number + 1
    return found


def validate():
    spec, matrix = read(SPEC), read(MATRIX)
    expected_r = {f"CAS-R{i:02}" for i in range(1, 31)}
    expected_t = {f"CAS-T{i:02}" for i in range(1, 31)}
    requirements = re.findall(r"^## (CAS-R\d{2}) — ", spec, re.M)
    require(len(requirements) == 30 and set(requirements) == expected_r, "requirement_ids")
    rows = [line for line in matrix.splitlines() if line.startswith("| CAS-T")]
    require(len(rows) == 30, "matrix_size")
    seen = set()
    for number, row in enumerate(rows, 1):
        cells = [cell.strip() for cell in row.strip("|").split("|")]
        require(len(cells) == 5, "matrix_columns")
        tid = f"CAS-T{number:02}"
        require(cells[0] == tid and tid not in seen, "test_ids")
        require(f"[CAS-R{number:02}]" in cells[1], "requirement_test_mapping")
        require(len(cells[2]) > 25 and len(cells[3]) > 50, "positive_negative_cases")
        require(set(cells[4].split(",")) <= {"D", "S", "C", "O", "A"}, "evidence_levels")
        require(bool(cells[4]), "missing_evidence_level")
        seen.add(tid)
    require(seen == expected_t, "test_coverage")
    decisions = re.findall(r"^\| (D\d{2}) \|", spec, re.M)
    require(decisions == [f"D{i:02}" for i in range(1, 8)], "decision_ids")
    require("SPECIFIED, NOT QUALIFIED" in matrix, "evidence_status")
    for flag in ("executionSupported=false", "pilotReady=false", "liveAdmissionAllowed=false", "implementationReady=false"):
        require(flag in spec, "retained_gate")
    require("direct-codex-qualification-decisions-v1.md" in spec and "RF-HERMES-006" in spec, "decision_owner")
    require("research" in spec and "BLOCKED" in spec and "RF002" in spec, "limit_provenance")
    status_rows = re.findall(r"^\| (D\d{2}) \|[^\n]+\| (BLOCKED|DECIDED)\b", spec, re.M)
    require(dict(status_rows) == {f"D{i:02}": "DECIDED" if i == 7 else "BLOCKED" for i in range(1, 8)}, "decision_status")

    # Structural completeness only: no claim that prose proves enforcement.
    sections = re.split(r"^## CAS-R\d{2} — .*\n", spec, flags=re.M)[1:]
    require(len(sections) == 30 and all(len(s.strip()) >= 200 for s in sections), "requirement_body")
    for field in ("version", "identity", "input", "pins", "admission", "profile", "executable", "argv", "environment", "filesystem", "policy", "modelSelection", "session", "budgets", "evidence", "credentialRef", "displayLabel"):
        require(re.search(r"^\| `" + re.escape(field) + r"`", sections[1], re.M), "envelope_field")
    require("unknown fields recursively" in sections[1], "strict_envelope")
    require("One writing attempt across the whole" in sections[14], "writer_requirement")

    links = 0
    for relative, text in ((SPEC, spec), (MATRIX, matrix)):
        require(text.count("```") % 2 == 0, "fence_balance")
        require(not re.search(r"(?i)(\b[a-z]:[\\/]|/home/|/mnt/[a-z]/|BEGIN .*PRIVATE KEY)", text), "private_path_or_key")
        require(not re.search(r"(?i)(api[_-]?key|access[_-]?token)\s*[:=]\s*['\"][^<]", text), "secret_literal")
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
            if "://" in target:
                require(target.startswith("https://learn.chatgpt.com/"), "unexpected_remote_source")
                continue
            filename, _, fragment = unquote(target).partition("#")
            dest = ((ROOT / relative).parent / filename).resolve()
            require(dest.is_relative_to(ROOT) and dest.is_file(), "local_link")
            if fragment:
                require(fragment in anchors(dest.read_text(encoding="utf-8")), "local_anchor")
            links += 1
    for relative in INDEXES:
        require("direct-codex-app-server-contract-v1.md" in read(relative), "canonical_index_link")

    registry = json.loads(read("src/modules/agent-runtime/execution-providers.json"))
    require(registry["contractVersion"] == 5 and registry["requiredPilotProvider"] == "hermes_codex" and registry["pilotReady"] is False, "legacy_registry_guard")
    contract = json.loads(read("docs/documentation-contract.json"))
    default_bytes = sum((ROOT / p).stat().st_size for p in contract["defaultAgentContext"])
    require(default_bytes <= contract["budgets"]["maxDefaultContextBytes"], "default_context_budget")
    return {"result": "PASS", "scope": "documentation_structure_only", "requirements": 30, "testFamilies": 30, "blockedDecisions": 6, "decidedDocumentSchemas": 1, "localLinksAndAnchors": links, "defaultContextBytes": default_bytes, "runtimeQualified": False}


if __name__ == "__main__":
    try:
        print(json.dumps(validate()))
    except (OSError, ValueError, KeyError, TypeError):
        print(json.dumps({"result": "FAIL", "scope": "documentation_structure_only"}))
        sys.exit(1)
