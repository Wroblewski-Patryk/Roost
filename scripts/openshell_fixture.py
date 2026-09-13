"""Offline v2 artifact validation. Never executes ELF, Docker, WSL or a loader."""
import argparse
import hashlib
import json
import pathlib
import re
import struct

import openshell_minimal_policy as base

POLICY_ID = 'roost.synthetic-isolation.v2'
POLICY_SHA256 = '79082418e3e24beb7c3ba22b8d01fc8c3e0408f4def7e68ca1974d3b98b4372e'
CONTRACT_SHA256 = '7f3e0061e305e6ed5a672a451ad4881d2d76e083990c863d6b0ae495241031f8'
MAX_ELF = 4194304
ROOT = pathlib.Path(__file__).resolve().parents[1]


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def source_bytes(raw, maximum):
    base.need(type(raw) is bytes and 0 < len(raw) <= maximum, 'source_size')
    raw = raw.replace(b'\r\n', b'\n')
    base.need(raw.isascii() and b'\r' not in raw and b'\x00' not in raw, 'source_encoding')
    return raw


def inspect_elf(raw):
    """Strict ELF64 ET_EXEC subset; integer/range checks before all unpacking.

    Reject any dynamic segment/section, including DT_NEEDED/RPATH/RUNPATH.
    This is structural validation, not disassembly or proof of runtime behavior.
    """
    base.need(type(raw) is bytes and 64 <= len(raw) <= MAX_ELF, 'elf_size')
    header = struct.unpack_from('<16sHHIQQQIHHHHHH', raw)
    ident, kind, machine, version, entry, phoff, shoff, flags, ehsize, phsize, phnum, shsize, shnum, shstr = header
    base.need(ident == b'\x7fELF\x02\x01\x01' + bytes(9), 'elf_identity')
    base.need(kind == 2 and machine == 62 and version == 1 and flags == 0, 'elf_architecture')
    base.need(ehsize == 64 and phsize == 56 and shsize == 64, 'elf_header_size')
    base.need(1 <= phnum <= 32 and 1 <= shnum <= 64 and 0 < shstr < shnum, 'elf_table_count')

    def region(offset, size):
        base.need(0 <= offset <= len(raw) and 0 <= size <= len(raw) - offset, 'elf_range')
        return raw[offset:offset + size]

    base.need(phoff >= 64 and shoff >= 64, 'elf_table_offset')
    region(phoff, phnum * phsize)
    region(shoff, shnum * shsize)
    entry_ok = False
    stack_count = 0
    load_count = 0
    memory = 0
    for i in range(phnum):
        typ, bits, offset, address, physical, size, memsize, align = struct.unpack_from('<IIQQQQQQ', raw, phoff + i * phsize)
        base.need(typ not in (2, 3), 'elf_dynamic_or_interpreter')
        base.need(typ in (1, 4, 0x6474e551, 0x6474e553), 'elf_segment_type')
        base.need(bits in (4, 5, 6), 'elf_segment_permissions')
        region(offset, size)
        base.need(size <= memsize <= MAX_ELF and address + memsize < 2**64, 'elf_memory')
        base.need(align in (0, 1) or (align & (align - 1) == 0 and align <= 2097152), 'elf_alignment')
        if typ == 1:
            load_count += 1
            memory += memsize
            base.need(align <= 1 or offset % align == address % align, 'elf_load_alignment')
            entry_ok |= bits == 5 and address <= entry < address + size
        elif typ == 0x6474e551:
            stack_count += 1
            base.need(bits == 6 and size == memsize == 0, 'elf_executable_stack')
        if typ == 4:
            notes = region(offset, size)
            cursor = 0
            while cursor < len(notes):
                base.need(cursor + 12 <= len(notes), 'elf_note')
                namesize, descsize, note_type = struct.unpack_from('<III', notes, cursor)
                cursor += 12
                endname = cursor + namesize
                enddesc = cursor + ((namesize + 3) & ~3) + ((descsize + 3) & ~3)
                base.need(enddesc <= len(notes), 'elf_note')
                base.need(notes[cursor:endname] == b'GNU\0' and note_type == 5, 'elf_unapproved_note')
                cursor = enddesc
    base.need(entry_ok and stack_count == 1 and load_count >= 1 and memory <= MAX_ELF, 'elf_load_contract')
    sections = [struct.unpack_from('<IIQQQQIIQQ', raw, shoff + i * shsize) for i in range(shnum)]
    base.need(sections[0] == (0,) * 10 and sections[shstr][1] == 3, 'elf_section_table')
    names = region(sections[shstr][4], sections[shstr][5])
    allowed_names = {b'', b'.text', b'.rodata', b'.data', b'.bss', b'.shstrtab', b'.note.gnu.property'}
    for name, typ, bits, address, offset, size, link, info, align, entsize in sections:
        base.need(typ not in (4, 6, 9, 11), 'elf_dynamic_section')
        base.need(typ in (0, 1, 3, 7, 8), 'elf_section_type')
        base.need(bits & 5 != 5 and size <= MAX_ELF, 'elf_section_permissions')
        if typ != 8:
            region(offset, size)
        base.need(name < len(names) and b'\0' in names[name:], 'elf_section_name')
        base.need(names[name:].split(b'\0', 1)[0] in allowed_names, 'elf_unapproved_section')
    lower = raw.lower()
    for marker in (b'/home/', b'/users/', b'/mnt/', b'/build', b'/tmp/', b'c:\\',
                   b'api.openai', b'anthropic', b'codex', b'claude', b'copilot',
                   b'opencode', b'hermes', b'private key', b'github_pat_', b'ghp_'):
        base.need(marker not in lower, 'elf_forbidden_marker')
    base.need(not re.search(rb'(?:token|password|secret|api_key)\s*[:=]', lower), 'elf_secret_marker')
    return {'format': 'ELF64-LE-x86_64-ET_EXEC', 'bytes': len(raw), 'sha256': sha256(raw),
            'dynamic': False, 'interpreter': False, 'needed': False, 'rpath': False,
            'runpath': False, 'executableStack': False, 'executed': False}


def lint(policy_raw, contract_raw, fixture_raw, source_raw, recipe_raw):
    try:
        policy = base.load_json(policy_raw, base.MAX_POLICY_BYTES)
        contract = base.load_json(contract_raw, base.MAX_CONTRACT_BYTES)
        # Exact whole-object hashes reject every unknown/missing field and type,
        # including nested build fields. A caller cannot supply new trust pins.
        base.need(base.digest(policy) == POLICY_SHA256, 'unapproved_policy_hash')
        base.need(base.digest(contract) == CONTRACT_SHA256, 'unapproved_contract_hash')
        base.exact(contract['policyId'], POLICY_ID, 'policy_identity')
        base.exact(contract['policyVersion'], 2, 'policy_revision')
        base.exact(contract['policySha256'], POLICY_SHA256, 'policy_hash')
        base.exact(contract['fixture']['materialized'], True, 'fixture_unmaterialized')
        for flag in ('executionSupported', 'pilotReady', 'liveAdmissionAllowed'):
            base.exact(contract[flag], False, 'execution_activation')
        build = contract['build']
        base.need(sha256(source_bytes(source_raw, 32768)) == build['sourceSha256'], 'source_hash')
        base.need(sha256(source_bytes(recipe_raw, 8192)) == build['recipeSha256'], 'recipe_hash')
        evidence = inspect_elf(fixture_raw)
        base.need(evidence['bytes'] == contract['fixture']['bytes'], 'fixture_bytes')
        base.need(evidence['sha256'] == contract['fixture']['sha256'], 'fixture_hash')
        return {'verdict': 'REPRODUCIBLE-FIXTURE-READY', 'code': 'materialized_artifact_valid',
                'policyId': POLICY_ID, 'policySha256': POLICY_SHA256, 'contractSha256': CONTRACT_SHA256,
                'fixtureSha256': evidence['sha256'], 'fixtureBytes': evidence['bytes'],
                'liveAdmissionAllowed': False, 'executionSupported': False, 'pilotReady': False,
                'officialRuntimeParserExecuted': False, 'fixtureExecuted': False}
    except base.PolicyError as error:
        return blocked(str(error))


def blocked(code):
    return {'verdict': 'REPRODUCIBLE-FIXTURE-BLOCKED', 'code': code,
            'liveAdmissionAllowed': False, 'executionSupported': False, 'pilotReady': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--policy', type=pathlib.Path, default=ROOT / 'config/openshell/synthetic-isolation-v2.policy.json')
    parser.add_argument('--contract', type=pathlib.Path, default=ROOT / 'config/openshell/synthetic-isolation-v2.contract.json')
    parser.add_argument('--source', type=pathlib.Path, default=ROOT / 'fixtures/openshell/fake-app-server.c')
    parser.add_argument('--recipe', type=pathlib.Path, default=ROOT / 'fixtures/openshell/build-fixture.sh')
    parser.add_argument('--fixture', type=pathlib.Path)
    args = parser.parse_args()
    try:
        if args.fixture is None:
            result = blocked('fixture_required')
        else:
            result = lint(base.read_bounded(args.policy, base.MAX_POLICY_BYTES),
                          base.read_bounded(args.contract, base.MAX_CONTRACT_BYTES),
                          base.read_bounded(args.fixture, MAX_ELF),
                          base.read_bounded(args.source, 32768), base.read_bounded(args.recipe, 8192))
    except OSError:
        result = blocked('input_unreadable')
    print(json.dumps(result, sort_keys=True))
    return 0 if result['verdict'] == 'REPRODUCIBLE-FIXTURE-READY' else 2


if __name__ == '__main__':
    raise SystemExit(main())
