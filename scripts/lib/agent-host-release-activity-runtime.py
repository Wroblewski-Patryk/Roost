"""Fixed, source-sealed activity runtime controller.

Only the trusted release adapter may supply policy/settings and fresh root facts.
Facts are observations, never authority. The parent authenticates release scope
and durable intent before invoking this program. Importing it has no effects.
No app files, secrets, provider calls, shell commands or replacement containers.
Restoration facts do not certify external health, schema/data parity or loop ticks.
"""
import hashlib
import ipaddress
import json
import re
import shlex
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

POLICY_SCHEMA = "roost-activity-runtime-policy-v1"
SETTINGS_SCHEMA = "roost-activity-runtime-settings-private-v1"
OPS = {"read_runtime_fence", "read_runtime_settings", "hold_ingress",
       "open_fixture_window", "refence_fixture_window", "restore_runtime",
       "read_browser_access", "cadence_tick_read", "read_health"}
ROLES = {"app": "app", "migrate": "migration", "db": "database",
         "maintenance_cadence": "cadence", "proactive_cadence": "cadence"}
MAX_INPUT, MAX_OUTPUT = 65536, 65536
HASH = re.compile(r"[a-f0-9]{64}")
IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]{0,62}")
CADENCE_SOURCES = (("settingsSourcePath", "settingsSourceDigest"),
                   ("schedulerSourcePath", "schedulerSourceDigest"),
                   ("maintenanceEntrypointPath", "maintenanceEntrypointDigest"),
                   ("proactiveEntrypointPath", "proactiveEntrypointDigest"))


class Refusal(Exception):
    pass


def require(ok, code):
    if not ok:
        raise Refusal("release_activity_runtime_" + code)


def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def digest(v):
    return hashlib.sha256(v).hexdigest()


def keys(v, expected):
    require(isinstance(v, dict) and set(v) == set(expected), "fields")


def hash_value(v):
    require(isinstance(v, str) and HASH.fullmatch(v), "hash")


def uuid(v):
    require(isinstance(v, str) and re.fullmatch(r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", v)
            and str(UUID(v)) == v, "uuid")


def utc(v):
    require(isinstance(v, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z", v), "utc")
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError:
        raise Refusal("release_activity_runtime_utc") from None


def settings_digests(s):
    """Only original installed settings, never current role fence/owned rule.

    These canonical hashes use private-v1 projections and are not claims that
    the public adapter's separately sealed digests use the same byte protocol.
    The trusted parent maps these observed facts to its installation contract.
    """
    return {"databaseSettingsDigest": digest(canonical(normalized_database(s["database"]))),
            "ingressSettingsDigest": digest(canonical(normalized_ingress(s["ingress"]))),
            "cadenceSettingsDigest": digest(canonical(normalized_cadences(s["cadences"])))}


def normalized_database(database):
    return {k: v for k, v in database.items() if k != "containerId"}


def normalized_ingress(ingress):
    return {k: v for k, v in ingress.items() if k != "appContainerId"}


def normalized_cadences(cadences):
    return sorted([{k: v for k, v in c.items() if k not in {"containerId", "imageDigest"}}
                   for c in cadences], key=lambda c: c["name"])


def validate_input(v, now=None, source_digest=None):
    require(isinstance(v, dict), "input")
    keys(v, {"operation", "policy", "runtimeSettings", "facts"}
         | ({"observation"} if v.get("operation") == "cadence_tick_read" else set()))
    require(v["operation"] in OPS, "operation")
    p, s, f = v["policy"], v["runtimeSettings"], v["facts"]
    keys(p, {"schemaVersion", "targetId", "coolifyApplicationId", "releaseId", "operationId", "fixtureId",
             "commit", "tree", "manifestDigest", "controllerProgramDigest", "createdAt", "expiresAt", "expectedRuntime"})
    require(p["schemaVersion"] == POLICY_SCHEMA and isinstance(p["targetId"], str)
            and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", p["targetId"]), "policy_identity")
    require(isinstance(p["coolifyApplicationId"], str) and re.fullmatch(r"[1-9][0-9]{0,9}", p["coolifyApplicationId"]), "application_identity")
    for k in ("releaseId", "operationId", "fixtureId"):
        uuid(p[k])
    require(len({p[k] for k in ("releaseId", "operationId", "fixtureId")}) == 3, "distinct_ids")
    for k in ("commit", "tree"):
        require(isinstance(p[k], str) and re.fullmatch(r"[a-f0-9]{40}", p[k]), "git")
    for k in ("manifestDigest", "controllerProgramDigest"):
        hash_value(p[k])
    if source_digest is not None:
        require(p["controllerProgramDigest"] == source_digest, "source_seal")
    created, expires = utc(p["createdAt"]), utc(p["expiresAt"])
    now = now or datetime.now(timezone.utc)
    require(0 < (expires - created).total_seconds() <= 7200 and created.timestamp() <= now.timestamp() + 120, "window")
    if v["operation"] in {"hold_ingress", "open_fixture_window"}:
        require(now < expires, "expired")
    rows = p["expectedRuntime"]
    require(isinstance(rows, list) and len(rows) == 5
            and {r.get("name") for r in rows if isinstance(r, dict)} == set(ROLES), "five_services")
    for r in rows:
        keys(r, {"name", "role", "containerId", "imageDigest", "mountDigest"})
        require(r["role"] == ROLES[r["name"]], "role")
        hash_value(r["containerId"])
        hash_value(r["mountDigest"])
        require(isinstance(r["imageDigest"], str) and re.fullmatch(r"sha256:[a-f0-9]{64}", r["imageDigest"]), "image")
    require(len({r["containerId"] for r in rows}) == 5, "distinct_containers")
    required_settings = {"schemaVersion", "targetId", "database", "ingress", "cadences"}
    require(isinstance(s, dict) and required_settings <= set(s)
            and set(s) <= required_settings | {"browserAccess", "cadenceEvidence", "internalHealth"}, "settings_fields")
    require(s["schemaVersion"] == SETTINGS_SCHEMA and s["targetId"] == p["targetId"], "settings_identity")
    db = s["database"]
    keys(db, {"containerId", "adminUser", "adminDatabase", "applicationUser", "applicationDatabase", "originalRoleConfig"})
    require(db["containerId"] == next(r["containerId"] for r in rows if r["name"] == "db"), "db_container")
    require(db["adminUser"] != db["applicationUser"] or db["adminDatabase"] != db["applicationDatabase"], "admin_connection_must_not_inherit_owned_database_role")
    for k in ("adminUser", "adminDatabase", "applicationUser", "applicationDatabase"):
        require(isinstance(db[k], str) and IDENT.fullmatch(db[k]), "pg_identifier")
    cfg = db["originalRoleConfig"]
    require(isinstance(cfg, list) and len(cfg) <= 32 and all(isinstance(a, str) and len(a) <= 1024
            and "=" in a and not re.search(r"[\x00\r\n]", a) for a in cfg), "original_role_config")
    require(len({a.split("=", 1)[0] for a in cfg}) == len(cfg), "unique_role_config")
    require(all(a in {"default_transaction_read_only=on", "default_transaction_read_only=off"}
                for a in cfg if a.startswith("default_transaction_read_only=")), "original_role_readonly")
    ingress = s["ingress"]
    keys(ingress, {"chain", "port", "protocol", "appContainerId", "networkId", "originalOwnedRuleAbsent", "originalRulesDigest"}
         | ({"namespace"} if "namespace" in ingress else set()))
    require(ingress["chain"] in {"DOCKER-USER", "INPUT"} and ingress["port"] == 8000 and type(ingress["port"]) is int
            and ingress["protocol"] == "tcp" and ingress["originalOwnedRuleAbsent"] is True
            and ingress["appContainerId"] == next(r["containerId"] for r in rows if r["name"] == "app"), "ingress_scope")
    hash_value(ingress["networkId"])
    hash_value(ingress["originalRulesDigest"])
    require((ingress["chain"] == "INPUT") == ("namespace" in ingress), "ingress_namespace_mode")
    if "namespace" in ingress:
        namespace = ingress["namespace"]
        keys(namespace, {"proxyContainerId", "proxyImageDigest", "proxyNetworkDigest"})
        hash_value(namespace["proxyContainerId"])
        hash_value(namespace["proxyNetworkDigest"])
        require(namespace["proxyContainerId"] not in {r["containerId"] for r in rows}
                and isinstance(namespace["proxyImageDigest"], str)
                and re.fullmatch(r"sha256:[a-f0-9]{64}", namespace["proxyImageDigest"]), "ingress_proxy_identity")
    cadences = s["cadences"]
    require(isinstance(cadences, list) and len(cadences) == 2
            and {c.get("name") for c in cadences if isinstance(c, dict)} == {"maintenance_cadence", "proactive_cadence"}, "cadences")
    for c in cadences:
        keys(c, {"name", "containerId", "imageDigest", "mountDigest", "originalState", "originalExitCode", "behavior", "behaviorDigest"})
        r = next(r for r in rows if r["name"] == c["name"])
        require(all(c[k] == r[k] for k in ("containerId", "imageDigest", "mountDigest")), "cadence_scope")
        require(c["originalState"] in {"running", "paused", "exited", "created"}
                and type(c["originalExitCode"]) is int and c["originalExitCode"] == 0
                and c["behavior"] == "restore_existing_loop", "cadence_original")
        hash_value(c["behaviorDigest"])
    keys(f, {"ingressBlockedByRoot", "fixtureAbsentByRoot", "parityVerifiedByRoot", "proofDigest", "observedAt"})
    require(all(type(f[k]) is bool for k in ("ingressBlockedByRoot", "fixtureAbsentByRoot", "parityVerifiedByRoot")), "facts_bool")
    hash_value(f["proofDigest"])
    require(-2 <= (now - utc(f["observedAt"])).total_seconds() <= 60, "facts_fresh")
    if "browserAccess" in s:
        access = s["browserAccess"]
        keys(access, {"kind", "settingsSourcePath", "routesSourcePath", "settingsSourceDigest", "routesSourceDigest"})
        require(access["kind"] == "pydantic_settings_auth_cookie_v1", "cookie_contract")
        for k in ("settingsSourcePath", "routesSourcePath"):
            require(isinstance(access[k], str) and re.fullmatch(r"/app/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+\.py", access[k]), "cookie_source_path")
        for k in ("settingsSourceDigest", "routesSourceDigest"):
            hash_value(access[k])
    if "cadenceEvidence" in s:
        evidence = s["cadenceEvidence"]
        keys(evidence, {"schema", "table", "expectedOwner", "expectedMode"}
             | ({"expectedSources"} if "expectedSources" in evidence else set()))
        require(evidence["schema"] == "public" and isinstance(evidence["table"], str)
                and IDENT.fullmatch(evidence["table"]) and evidence["expectedOwner"] == "external_scheduler"
                and evidence["expectedMode"] == "externalized", "cadence_evidence_contract")
        if "expectedSources" in evidence:
            sources = evidence["expectedSources"]
            keys(sources, {key for pair in CADENCE_SOURCES for key in pair})
            for path_key, digest_key in CADENCE_SOURCES:
                require(isinstance(sources[path_key], str) and re.fullmatch(r"/app/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+\.py", sources[path_key]), "cadence_source_path")
                hash_value(sources[digest_key])
            require(len({sources[path] for path, _ in CADENCE_SOURCES}) == 4, "cadence_distinct_sources")
    if "internalHealth" in s:
        health = s["internalHealth"]
        keys(health, {"frontendMetaName"})
        require(isinstance(health["frontendMetaName"], str)
                and re.fullmatch(r"[A-Za-z0-9._:-]{1,80}", health["frontendMetaName"]), "health_metadata")
    if v["operation"] == "read_health":
        require("internalHealth" in s, "health_installation_required")
    if v["operation"] == "read_browser_access":
        require("browserAccess" in s, "cookie_contract_required")
    if v["operation"] == "cadence_tick_read":
        require("cadenceEvidence" in s, "cadence_evidence_required")
        o = v["observation"]
        keys(o, {"startedAt", "observationSeconds"})
        elapsed = (now - utc(o["startedAt"])).total_seconds()
        require(type(o["observationSeconds"]) is int and 1 <= o["observationSeconds"] <= 300
                and o["observationSeconds"] <= elapsed <= 300, "cadence_observation_window")
    return v


def bounded_process(argv, payload=None, timeout=10):
    namespace = (isinstance(argv, list) and len(argv) >= 11 and argv[:4] == ["sudo", "-n", "/usr/bin/nsenter", "-t"]
                 and isinstance(argv[4], str) and re.fullmatch(r"[1-9][0-9]{0,9}", argv[4]) and int(argv[4]) <= 2147483647
                 and argv[5:9] == ["-n", "/usr/sbin/iptables", "-w", "3"]
                 and argv[9] in {"-S", "-I", "-D"} and argv[10] == "INPUT")
    if namespace:
        action = argv[9]
        if action == "-S":
            namespace = len(argv) == 11
        else:
            offset = 12 if action == "-I" else 11
            tail = argv[offset:]
            namespace = (len(tail) == 18 and (action != "-I" or argv[11] == "1")
                         and tail[0] == "-s" and tail[2] == "-d"
                         and tail[4:13] == ["-p", "tcp", "-m", "tcp", "--dport", "8000", "-m", "comment", "--comment"]
                         and re.fullmatch(r"roost-activity-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", tail[13])
                         and tail[14:] == ["-j", "REJECT", "--reject-with", "tcp-reset"])
            if namespace:
                for address in (tail[1], tail[3]):
                    require(isinstance(address, str) and address.endswith("/32"), "fixed_rule_address")
                    ipv4(address[:-3])
    require(isinstance(argv, list) and argv and (argv[0] == "docker" or argv[:3] == ["sudo", "-n", "/usr/sbin/iptables"] or namespace), "fixed_executable")
    try:
        r = subprocess.run(argv, input=payload, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                           timeout=timeout, check=False, shell=False)
    except BaseException:
        raise Refusal("release_activity_runtime_transport") from None
    require(r.returncode == 0 and len(r.stdout) <= MAX_OUTPUT, "native_process")
    return r.stdout


INSPECT = ('{"id":{{json .Id}},"image":{{json .Image}},'
           '"state":{"Status":{{json .State.Status}},"Running":{{json .State.Running}},'
           '"Paused":{{json .State.Paused}},"ExitCode":{{json .State.ExitCode}},'
           '"Health":{{with (index .State "Health")}}{"Status":{{json .Status}}}{{else}}null{{end}}},'
           '"project":{{json (index .Config.Labels "com.docker.compose.project")}},'
           '"service":{{json (index .Config.Labels "com.docker.compose.service")}},'
           '"application":{{json (index .Config.Labels "coolify.applicationId")}},'
           '"entrypoint":{{json .Config.Entrypoint}},"command":{{json .Config.Cmd}},'
           '"workingDirectory":{{json .Config.WorkingDir}},'
           '"mounts":{{json .Mounts}},"networks":{{json .NetworkSettings.Networks}},'
           '"pid":{{json .State.Pid}},"sandboxKey":{{json .NetworkSettings.SandboxKey}},'
           '"ports":{{json .NetworkSettings.Ports}},"portBindings":{{json .HostConfig.PortBindings}},'
           '"networkMode":{{json .HostConfig.NetworkMode}}}')

PROXY_INSPECT = ('{"id":{{json .Id}},"image":{{json .Image}},'
                 '"running":{{json .State.Running}},"paused":{{json .State.Paused}},'
                 '"networks":{{json .NetworkSettings.Networks}}}')


def ipv4(v):
    try:
        ip = ipaddress.ip_address(v)
    except ValueError:
        raise Refusal("release_activity_runtime_ipv4") from None
    require(ip.version == 4 and ip.is_private and not (ip.is_loopback or ip.is_link_local
            or ip.is_multicast or ip.is_unspecified or ip.is_reserved), "private_docker_ipv4")
    return str(ip)


def qident(v):
    require(IDENT.fullmatch(v) is not None, "pg_identifier")
    return '"' + v + '"'


def literal(v):
    require(isinstance(v, str) and not re.search(r"['\x00\r\n]", v), "fixed_sql_literal")
    return "'" + v + "'"


COOKIE_PROGRAM = r'''
import ast,hashlib,json,os,re,sys
from pathlib import Path
try:
    p=json.loads(sys.stdin.buffer.read(8193))
    def read(path,expected):
        b=Path(path).read_bytes()
        if len(b)>131072 or hashlib.sha256(b).hexdigest()!=expected:raise ValueError()
        return ast.parse(b.decode('utf-8'))
    config=read(p['settingsSourcePath'],p['settingsSourceDigest'])
    routes=read(p['routesSourcePath'],p['routesSourceDigest'])
    classes=[n for n in config.body if isinstance(n,ast.ClassDef) and n.name=='Settings']
    if len(classes)!=1:raise ValueError()
    nodes=classes[0].body;fields=[n for n in nodes if isinstance(n,ast.AnnAssign) and isinstance(n.target,ast.Name) and n.target.id=='auth_session_cookie_name']
    defaults=[n.value for n in routes.body if isinstance(n,(ast.Assign,ast.AnnAssign)) and
        any(isinstance(t,ast.Name) and t.id=='AUTH_SESSION_COOKIE_DEFAULT' for t in (n.targets if isinstance(n,ast.Assign) else [n.target]))]
    if len(defaults)!=1:raise ValueError()
    fallback=ast.literal_eval(defaults[0])
    if not isinstance(fallback,str):raise ValueError()
    source='route_default';cookie=fallback
    if fields:
        if len(fields)!=1:raise ValueError()
        value=ast.literal_eval(fields[0].value)
        if not isinstance(value,str):raise ValueError()
        source='settings_default';cookie=value
        model=[n.value for n in nodes if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='model_config' for t in n.targets)]
        if len(model)>1 or model and not isinstance(model[0],ast.Call):raise ValueError()
        opts={k.arg:ast.literal_eval(k.value) for k in (model[0].keywords if model else []) if k.arg in ('env_prefix','env_file','case_sensitive')}
        prefix=opts.get('env_prefix','');case=opts.get('case_sensitive',False)
        if not isinstance(prefix,str) or not re.fullmatch('[A-Za-z0-9_]{0,80}',prefix) or not isinstance(case,bool):raise ValueError()
        name=prefix+'auth_session_cookie_name'
        matches=[os.environ[k] for k in os.environ if k==name or not case and k.lower()==name.lower()]
        if len(matches)>1:raise ValueError()
        if matches:source='environment';cookie=matches[0]
        elif opts.get('env_file') is not None:
            ep=opts['env_file']
            if not isinstance(ep,str) or ep!='.env':raise ValueError()
            path=Path.cwd()/ep
            if path.exists():
                if path.stat().st_size>65536:raise ValueError()
                # No settings/routes import and no runtime/provider construction.
                from dotenv import dotenv_values
                values=dotenv_values(path,interpolate=False)
                selected=[v for k,v in values.items() if k==name or not case and k.lower()==name.lower()]
                if len(selected)>1 or selected and (not isinstance(selected[0],str) or '${' in selected[0]):raise ValueError()
                if selected:source='dotenv';cookie=selected[0]
    cookie=cookie.strip() or fallback
    if not re.fullmatch('[A-Za-z_][A-Za-z0-9_-]{0,79}',cookie):raise ValueError()
    print(json.dumps({'cookieName':cookie,'settingsSourceDigest':p['settingsSourceDigest'],'routesSourceDigest':p['routesSourceDigest'],'source':source},separators=(',',':')))
except BaseException:
    print('{"error":"fixed_auth_cookie_read_unproven"}');sys.exit(1)
'''


EXPECTATION_PROGRAM = r'''
# Fixed AST/configuration reader: never import or execute application sources.
import ast,hashlib,json,os,re,sys
from pathlib import Path
PAIRS=(('settingsSourcePath','settingsSourceDigest'),('schedulerSourcePath','schedulerSourceDigest'),
       ('maintenanceEntrypointPath','maintenanceEntrypointDigest'),('proactiveEntrypointPath','proactiveEntrypointDigest'))
def check(ok):
    if not ok:raise ValueError()
def eq(node,text):
    return ast.dump(node,include_attributes=False).replace('ctx=Store()','ctx=Load()')==ast.dump(ast.parse(text,mode='eval').body,include_attributes=False)
def only(nodes,predicate):
    found=[n for n in nodes if predicate(n)];check(len(found)==1);return found[0]
def method(cls,name):
    return only(cls.body,lambda n:isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name==name)
def kw(call,name,text):
    return len([k for k in call.keywords if k.arg==name and eq(k.value,text)])==1
def named_call(nodes,text):
    return only((n for stmt in nodes for n in ast.walk(stmt)),lambda n:isinstance(n,ast.Call) and eq(n.func,text))
def summary_value(nodes,key,text):
    assignments=[n for n in nodes if isinstance(n,(ast.Assign,ast.AnnAssign)) and
       any(eq(t,'summary') for t in (n.targets if isinstance(n,ast.Assign) else [n.target]))]
    dictionaries=[n.value for n in assignments if isinstance(n.value,ast.Dict)]
    check(len(dictionaries)==1)
    entries=[v for k,v in zip(dictionaries[0].keys,dictionaries[0].values) if k is not None and eq(k,repr(key))]
    check(len(entries)==1 and eq(entries[0],text))
def recorded(nodes,kind,owner):
    call=named_call(nodes,'self._record_cadence_evidence')
    check(kw(call,'cadence_kind',repr(kind)) and kw(call,'execution_owner',owner)
          and kw(call,'summary','summary') and kw(call,'now','now'))
def semantic(settings,scheduler,maintenance,proactive):
    cls=only(settings.body,lambda n:isinstance(n,ast.ClassDef) and n.name=='Settings')
    check(len(cls.bases)==1 and eq(cls.bases[0],'BaseSettings'))
    selected=('proactive_enabled','scheduler_execution_mode')
    defaults={}
    for field in selected:
        n=only(cls.body,lambda n:isinstance(n,ast.AnnAssign) and eq(n.target,field))
        defaults[field]=ast.literal_eval(n.value)
    check(type(defaults['proactive_enabled']) is bool and defaults['scheduler_execution_mode'] in ('in_process','externalized'))
    # Literal declarations only: custom settings sources, validators, aliases or
    # field assignments would make this small projection insufficient.
    for n in ast.walk(cls):
        if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)):
            check(not n.decorator_list and n.name not in ('__init__','settings_customise_sources','__getattribute__'))
        if isinstance(n,ast.Attribute) and isinstance(n.ctx,ast.Store):check(n.attr not in selected)
        if isinstance(n,ast.Name) and isinstance(n.ctx,ast.Store) and n.id in selected:
            check(any(isinstance(a,ast.AnnAssign) and a.target is n for a in cls.body))
    config=only(cls.body,lambda n:isinstance(n,ast.Assign) and any(eq(t,'model_config') for t in n.targets)).value
    check(isinstance(config,ast.Call) and eq(config.func,'SettingsConfigDict') and not config.args)
    opts={k.arg:ast.literal_eval(k.value) for k in config.keywords}
    check(set(opts)<= {'env_prefix','env_file','env_file_encoding','case_sensitive','extra'})
    prefix=opts.get('env_prefix','');case=opts.get('case_sensitive',False)
    check(isinstance(prefix,str) and re.fullmatch('[A-Za-z0-9_]{0,80}',prefix) and type(case) is bool)
    check(opts.get('env_file') in (None,'.env') and opts.get('env_file_encoding','utf-8')=='utf-8')
    worker=only(scheduler.body,lambda n:isinstance(n,ast.ClassDef) and n.name=='SchedulerWorker')
    init=method(worker,'__init__')
    binds=[n for n in init.body if isinstance(n,ast.Assign) and any(eq(t,'self.proactive_enabled') for t in n.targets)]
    check(len(binds)==1 and eq(binds[0].value,'bool(proactive_enabled)'))
    for kind,entry in (('maintenance',maintenance),('proactive',proactive)):
        run=only(entry.body,lambda n:isinstance(n,ast.AsyncFunctionDef) and n.name=='_run')
        construct=named_call(run.body,'SchedulerWorker')
        check(kw(construct,'execution_mode',repr('externalized')) and kw(construct,'proactive_enabled','settings.proactive_enabled'))
        named_call(run.body,'scheduler.run_external_'+kind+'_tick_once')
        check(any(isinstance(n,ast.Assign) and any(eq(t,'settings') for t in n.targets)
                  and isinstance(n.value,ast.Call) and eq(n.value.func,'get_settings') for n in run.body))
        tick=method(worker,'run_external_'+kind+'_tick_once')
        guard=only(tick.body,lambda n:isinstance(n,ast.If) and eq(n.test,"self.execution_mode != 'externalized'"))
        check(not guard.orelse)
        summary_value(guard.body,'executed','False');summary_value(guard.body,'reason',repr('external_owner_not_selected'))
        recorded(guard.body,kind,repr('in_process_scheduler'))
        check(isinstance(guard.body[-1],ast.Return) and eq(guard.body[-1].value,'summary'))
        if kind=='maintenance':
            summary_value(tick.body,'executed','True');summary_value(tick.body,'reason',repr('external_scheduler_owner'))
            # Record outside the mode guard, so the executed branch is proven.
            recorded([n for n in tick.body if n is not guard],kind,repr('external_scheduler'))
        else:
            disabled=only(tick.body,lambda n:isinstance(n,ast.If) and eq(n.test,'not self.proactive_enabled'))
            check(not disabled.orelse)
            summary_value(disabled.body,'executed','False');summary_value(disabled.body,'reason',repr('proactive_disabled'))
            recorded(disabled.body,kind,repr('external_scheduler'))
            check(isinstance(disabled.body[-1],ast.Return) and eq(disabled.body[-1].value,'summary'))
            call=named_call([tick.body[-1]],'self._run_observer_admitted_proactive_tick')
            check(isinstance(tick.body[-1],ast.Return) and isinstance(tick.body[-1].value,ast.Await)
                  and kw(call,'dispatch_reason',repr('external_scheduler_owner')) and kw(call,'execution_owner',repr('external_scheduler'))
                  and kw(call,'external_entrypoint','True'))
            helper=method(worker,'_run_observer_admitted_proactive_tick')
            summary_value(helper.body,'executed','True');summary_value(helper.body,'reason','dispatch_reason')
            recorded(helper.body,kind,'execution_owner')
        for node in ast.walk(tick):
            if isinstance(node,ast.Subscript) and isinstance(node.ctx,ast.Store) and eq(node.value,'summary'):
                check(not (eq(node.slice,repr('executed')) or eq(node.slice,repr('reason'))))
    return defaults,opts
def prove(p):
    check(set(p)=={'sources','kind'} and p['kind'] in ('maintenance','proactive'))
    sources=p['sources'];check(set(sources)=={k for pair in PAIRS for k in pair})
    trees=[]
    for path,seal in PAIRS:
        data=Path(sources[path]).read_bytes();check(len(data)<=131072 and hashlib.sha256(data).hexdigest()==sources[seal])
        trees.append(ast.parse(data.decode('utf-8')))
    values,opts=semantic(*trees)
    dotenv=None
    for field in ('proactive_enabled','scheduler_execution_mode'):
        key=opts.get('env_prefix','')+field;case=opts.get('case_sensitive',False)
        selected=[v for k,v in os.environ.items() if k==key or not case and k.lower()==key.lower()]
        check(len(selected)<=1)
        if not selected and opts.get('env_file')=='.env':
            if dotenv is None:
                path=Path.cwd()/'.env';dotenv={}
                if path.exists():
                    check(path.stat().st_size<=65536)
                    from dotenv import dotenv_values
                    dotenv=dotenv_values(path,interpolate=False)
            selected=[v for k,v in dotenv.items() if k==key or not case and k.lower()==key.lower()]
            check(len(selected)<=1)
        if selected:
            value=selected[0];check(isinstance(value,str) and len(value)<=80 and '${' not in value)
            if field=='proactive_enabled':
                check(value.lower() in ('1','0','true','false','t','f','yes','no','y','n','on','off'))
                values[field]=value.lower() in ('1','true','t','yes','y','on')
            else:check(value in ('in_process','externalized'));values[field]=value
    check(values['scheduler_execution_mode']=='externalized')
    skipped=p['kind']=='proactive' and not values['proactive_enabled']
    source_digest=hashlib.sha256(json.dumps({seal:sources[seal] for _,seal in PAIRS},sort_keys=True,separators=(',',':')).encode()).hexdigest()
    config_digest=hashlib.sha256(json.dumps(values,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    return {'kind':p['kind'],'expectedExecutionState':'skipped' if skipped else 'executed',
            'expectedReason':'proactive_disabled' if skipped else 'external_scheduler_owner',
            'sourceDigest':source_digest,'configurationDigest':config_digest,'sourceQualified':True}
if __name__=='__main__':
    try:
        value=prove(json.loads(sys.stdin.buffer.read(8193)));print(json.dumps(value,separators=(',',':')))
    except BaseException:
        print('{"error":"fixed_cadence_expectation_unproven"}');sys.exit(1)
'''


HEALTH_PROGRAM = r'''
import hashlib,json,re,signal,sys
from datetime import datetime,timezone
from html.parser import HTMLParser
from urllib.request import Request,build_opener,HTTPRedirectHandler,ProxyHandler

class HealthRefusal(Exception):pass
def require(v,code):
    if not v:raise HealthRefusal(code)

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise HealthRefusal('redirect')

class Meta(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False);self.inert=[];self.matches=[]
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style','template','textarea','title'):
            self.inert.append(tag);return
        if tag=='meta' and not self.inert:
            self.matches.append((attrs,self.get_starttag_text()))
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs);self.handle_endtag(tag)
    def handle_endtag(self,tag):
        if self.inert and tag==self.inert[-1]:self.inert.pop()

def unique_json(pairs):
    result={}
    for key,value in pairs:
        require(key not in result,'duplicate_json');result[key]=value
    return result

def backend(text,commit):
    def invalid_constant(_):raise HealthRefusal('invalid_json_constant')
    value=json.loads(text,object_pairs_hook=unique_json,parse_constant=invalid_constant)
    require(isinstance(value,dict) and value.get('status')=='ok','backend_status')
    deployment=value.get('deployment');release=value.get('release_readiness');reflection=value.get('reflection')
    require(isinstance(deployment,dict) and deployment.get('runtime_build_revision')==commit,'backend_version')
    require(isinstance(release,dict) and release.get('ready') is True,'release_readiness')
    require(isinstance(reflection,dict) and isinstance(reflection.get('deployment_readiness'),dict)
            and reflection['deployment_readiness'].get('ready') is True,'reflection_readiness')
    return commit

def frontend(text,meta_name,commit):
    parser=Meta();parser.feed(text);parser.close();matches=[]
    for attrs,raw in parser.matches:
        if any(k=='name' and v==meta_name for k,v in attrs):matches.append((attrs,raw))
    require(len(matches)==1,'frontend_meta_count')
    attrs,raw=matches[0]
    require(len(attrs)==len({k for k,v in attrs}),'frontend_meta_attributes')
    require('&' not in raw,'frontend_meta_encoding')
    require(dict(attrs).get('name')==meta_name and dict(attrs).get('content')==commit,'frontend_version')
    return commit

def read(opener,path,accept):
    require(path in ('/health','/'),'path')
    url='http://127.0.0.1:8000'+path
    request=Request(url,headers={'Accept':accept,'Accept-Encoding':'identity','Cache-Control':'no-store'},method='GET')
    with opener.open(request,timeout=4) as response:
        require(response.status==200 and response.geturl()==url,'status')
        require(not response.headers.get('Location') and not response.headers.get('Content-Encoding'),'encoded_or_redirect')
        require(re.fullmatch(re.escape(accept)+r'(?:\s*;.*)?',response.headers.get('Content-Type',''),re.I),'content_type')
        limit=131072 if path=='/health' else 65536
        length=response.headers.get('Content-Length')
        if length is not None:require(re.fullmatch('[0-9]{1,8}',length) and int(length)<=limit,'body_bound')
        content=response.read(limit+1);require(len(content)<=limit,'body_bound')
        return content.decode('utf-8',errors='strict')

def main():
    signal.alarm(8)  # Absolute bound, including both reads and slow-drip bodies.
    p=json.loads(sys.stdin.buffer.read(4097),object_pairs_hook=unique_json)
    require(isinstance(p,dict) and set(p)=={'commit','frontendMetaName'},'input')
    require(isinstance(p['commit'],str) and re.fullmatch('[a-f0-9]{40}',p['commit']),'commit')
    require(isinstance(p['frontendMetaName'],str) and re.fullmatch('[A-Za-z0-9._:-]{1,80}',p['frontendMetaName']),'metadata')
    opener=build_opener(NoRedirect(),ProxyHandler({}))
    a=backend(read(opener,'/health','application/json'),p['commit'])
    b=frontend(read(opener,'/','text/html'),p['frontendMetaName'],p['commit'])
    signal.alarm(0)
    print(json.dumps({'backendCommit':a,'frontendCommit':b,'healthy':True,'observedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z')},separators=(',',':')))

if __name__=='__main__':
    try:main()
    except BaseException:
        print('{"error":"fixed_internal_health_unproven"}');sys.exit(1)
'''


def qualify_ticks(rows, request, runtime, now=None, expectations=None):
    require(isinstance(rows, list) and len(rows) == 2 and all(isinstance(r, dict) for r in rows)
            and {r.get("kind") for r in rows} == {"maintenance", "proactive"}, "tick_rows")
    now = now or datetime.now(timezone.utc)
    start = utc(request["observation"]["startedAt"])
    proof = []
    for row in sorted(rows, key=lambda r: r["kind"]):
        keys(row, {"kind", "owner", "mode", "executed", "reason", "summaryDigest", "lastRunAt", "updatedAt",
                   "providerRequests", "externalActions", "failures"})
        require(row["owner"] == request["runtimeSettings"]["cadenceEvidence"]["expectedOwner"]
                and row["mode"] == request["runtimeSettings"]["cadenceEvidence"]["expectedMode"]
                and type(row["executed"]) is bool, "tick_semantics")
        hash_value(row["summaryDigest"])
        ran, updated = utc(row["lastRunAt"]), utc(row["updatedAt"])
        require(start <= ran <= now and ran <= updated <= now, "fresh_terminal_tick")
        for key in ("providerRequests", "externalActions", "failures"):
            require(row[key] is None or type(row[key]) is int and 0 <= row[key] <= 1000000, "tick_counter")
        name = row["kind"] + "_cadence"
        cadence = next(c for c in request["runtimeSettings"]["cadences"] if c["name"] == name)
        require(row["reason"] in {None, "proactive_disabled", "external_scheduler_owner"}, "tick_reason")
        expected = None
        if "expectedSources" in request["runtimeSettings"]["cadenceEvidence"]:
            require(isinstance(expectations, dict) and set(expectations) == {"maintenance", "proactive"}, "tick_expectation_required")
            attestation = expectations[row["kind"]]
            keys(attestation, {"kind", "expectedExecutionState", "expectedReason", "sourceDigest", "configurationDigest", "sourceQualified"})
            expected = attestation["expectedExecutionState"]
            require(attestation["kind"] == row["kind"] and attestation["sourceQualified"] is True
                    and expected in {"executed", "skipped"}
                    and attestation["expectedReason"] == ("proactive_disabled" if expected == "skipped" else "external_scheduler_owner")
                    and (expected != "skipped" or row["kind"] == "proactive"), "tick_expectation_semantics")
            for key in ("sourceDigest", "configurationDigest"):
                hash_value(attestation[key])
            require(row["executed"] is (expected == "executed")
                    and row["reason"] == attestation["expectedReason"], "tick_expectation_mismatch")
        proof.append({"name": name, "behaviorDigest": cadence["behaviorDigest"], "behaviorVerified": True,
                      "completedTicks": 1, "executionState": "executed" if row["executed"] else "skipped",
                      "expectedExecutionState": expected, "executionExpectationVerified": expected is not None,
                      "summaryDigest": row["summaryDigest"], "lastRunAt": row["lastRunAt"], "observedAt": row["updatedAt"],
                      "providerRequests": row["providerRequests"], "providerRequestsVerified": row["providerRequests"] is not None,
                      "externalActions": row["externalActions"], "externalActionsVerified": row["externalActions"] is not None,
                      "failureState": "unknown" if row["failures"] is None else "none_recorded" if row["failures"] == 0 else "recorded",
                      "failures": row["failures"]})
    return {"schemaVersion": "roost-activity-cadence-observation-v1", "runtimeDigest": runtime["runtimeDigest"],
            "startedAt": request["observation"]["startedAt"], "observedAt": now.isoformat().replace("+00:00", "Z"),
            "cadenceEvidence": proof, "effect": False, "nativeJobQualified": False}


class Controller:
    def __init__(self, request, run=None):
        self.r = validate_input(request)
        self.p, self.s, self.f = (request[k] for k in ("policy", "runtimeSettings", "facts"))
        self.run = run or bounded_process  # Source-only test double; not an input selector.
        self.effect = False
        self.namespace_snapshot = None

    def call(self, argv, payload=None):
        result = self.run(argv, payload)
        require(isinstance(result, bytes) and len(result) <= MAX_OUTPUT, "output_bound")
        return result

    def runtime(self, require_held=False):
        ids = self.call(["docker", "container", "ls", "-a", "--no-trunc", "--filter",
                         "label=com.docker.compose.project=" + self.p["targetId"], "--format", "{{.ID}}"]).decode().split()
        require(len(ids) == 5 and set(ids) == {r["containerId"] for r in self.p["expectedRuntime"]}, "complete_actual_containers")
        rows, ips, app_ip = [], set(), None
        for e in sorted(self.p["expectedRuntime"], key=lambda r: r["name"]):
            a = json.loads(self.call(["docker", "container", "inspect", "--format", INSPECT, e["containerId"]]))
            require(all(a.get(k) == v for k, v in {"id": e["containerId"], "image": e["imageDigest"],
                    "project": self.p["targetId"], "service": e["name"], "application": self.p["coolifyApplicationId"]}.items()), "container_identity")
            require(isinstance(a.get("mounts"), list) and len(a["mounts"]) <= 32, "mount_bound")
            mounts = sorted([{k: m.get(k) for k in ("Type", "Name", "Source", "Destination", "Driver", "Mode", "RW", "Propagation")}
                             for m in a["mounts"]], key=lambda m: m["Destination"])
            require(digest(json.dumps(mounts, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()) == e["mountDigest"], "mount_identity")
            state = a["state"]
            status, paused, running = state.get("Status"), state.get("Paused"), state.get("Running")
            health = (state.get("Health") or {}).get("Status")
            if e["role"] in {"app", "database"}:
                require(status == "running" and running is True and paused is False and health == "healthy", "service_health")
            elif e["role"] == "migration":
                require(status == "exited" and running is False and paused is False and state.get("ExitCode") == 0 and health is None, "migration_closed")
            else:
                require(health is None and status in {"running", "paused", "exited", "created"}
                        and type(paused) is bool and type(running) is bool and state.get("ExitCode") == 0, "cadence_state")
                require((status in {"running", "paused"} and running and paused == (status == "paused")) or (status in {"exited", "created"} and not running and not paused), "cadence_state")
                if require_held:
                    require((status == "paused" and running and paused) or status in {"exited", "created"}, "cadence_not_held")
                c = next(c for c in self.s["cadences"] if c["name"] == e["name"])
                require(digest(canonical({"entrypoint": a.get("entrypoint") or [], "command": a.get("command") or [],
                                        "workingDirectory": a.get("workingDirectory") or ""})) == c["behaviorDigest"], "cadence_behavior")
            require(isinstance(a.get("networks"), dict) and len(a["networks"]) <= 8, "network_bound")
            if e["role"] in {"app", "cadence"}:
                for n in a["networks"].values():
                    if n.get("IPAddress"):
                        ips.add(ipv4(n["IPAddress"]))
            if e["role"] == "app":
                matched = [n for n in a["networks"].values() if n.get("NetworkID") == self.s["ingress"]["networkId"]]
                require(len(matched) == 1, "exact_app_network")
                app_ip = ipv4(matched[0].get("IPAddress", ""))
            rows.append({**e, "status": status, "paused": paused, "health": health})
        require(app_ip is not None and len(ips) <= 24, "scoped_networks")
        result = {"services": rows, "runtimeDigest": digest(canonical(rows)), "appIp": app_ip, "sessionIps": sorted(ips)}
        if "namespace" in self.s["ingress"]:
            self.namespace_snapshot = self.namespace_state(app_ip)
            result["ingressNamespace"] = self.namespace_snapshot
        return result

    def namespace_state(self, ip):
        seal = self.s["ingress"]["namespace"]
        expected = next(r for r in self.p["expectedRuntime"] if r["name"] == "app")
        app = json.loads(self.call(["docker", "container", "inspect", "--format", INSPECT, expected["containerId"]]))
        require(app.get("id") == expected["containerId"] and app.get("image") == expected["imageDigest"]
                and app.get("project") == self.p["targetId"] and app.get("service") == "app"
                and app.get("application") == self.p["coolifyApplicationId"], "namespace_app_identity")
        state = app.get("state") or {}
        require(state.get("Status") == "running" and state.get("Running") is True and state.get("Paused") is False
                and (state.get("Health") or {}).get("Status") == "healthy", "namespace_app_health")
        require(type(app.get("pid")) is int and 1 < app["pid"] <= 2147483647
                and isinstance(app.get("sandboxKey"), str)
                and re.fullmatch(r"/var/run/docker/netns/[a-f0-9]{1,64}", app["sandboxKey"])
                and isinstance(app.get("networkMode"), str)
                and 1 <= len(app["networkMode"]) <= 256 and app["networkMode"] not in {"host", "none"}
                and not app["networkMode"].startswith("container:"), "namespace_app_pid_sandbox")
        for key in ("ports", "portBindings"):
            value = app.get(key)
            require(value is None or isinstance(value, dict) and len(value) <= 32
                    and all(v is None or v == [] for v in value.values()), "namespace_app_published_ports")
        networks = app.get("networks")
        require(isinstance(networks, dict) and 1 <= len(networks) <= 8, "namespace_app_networks")
        matched = [v for v in networks.values() if v.get("NetworkID") == self.s["ingress"]["networkId"]]
        require(len(matched) == 1 and ipv4(matched[0].get("IPAddress", "")) == ip, "namespace_app_address")
        proxy = json.loads(self.call(["docker", "container", "inspect", "--format", PROXY_INSPECT, seal["proxyContainerId"]]))
        keys(proxy, {"id", "image", "running", "paused", "networks"})
        require(proxy["id"] == seal["proxyContainerId"] and proxy["image"] == seal["proxyImageDigest"]
                and proxy["running"] is True and proxy["paused"] is False, "namespace_proxy_identity")
        require(isinstance(proxy["networks"], dict) and 1 <= len(proxy["networks"]) <= 32
                and digest(canonical(proxy["networks"])) == seal["proxyNetworkDigest"], "namespace_proxy_networks")
        attached = [v for v in proxy["networks"].values() if v.get("NetworkID") == self.s["ingress"]["networkId"]]
        require(len(attached) == 1, "namespace_proxy_bridge")
        source = ipv4(attached[0].get("IPAddress", ""))
        require(source != ip, "namespace_proxy_address")
        return {"appContainerId": expected["containerId"], "appImageDigest": expected["imageDigest"],
                "appPid": app["pid"], "sandboxKey": app["sandboxKey"], "appAddress": ip,
                "appNetworksDigest": digest(canonical(networks)), "proxyAddress": source,
                "proxyContainerId": seal["proxyContainerId"], "proxyImageDigest": seal["proxyImageDigest"],
                "proxyNetworkDigest": seal["proxyNetworkDigest"]}

    def iptables(self, action, ip):
        require(action in {"-S", "-I", "-D"}, "fixed_rule_operation")
        chain = self.s["ingress"]["chain"]
        before = None
        if chain == "INPUT":
            require(self.namespace_snapshot is not None, "namespace_runtime_required")
            before = self.namespace_state(ip)
            require(before == self.namespace_snapshot, "namespace_changed_before_command")
            prefix = ["sudo", "-n", "/usr/bin/nsenter", "-t", str(before["appPid"]), "-n", "/usr/sbin/iptables", "-w", "3"]
        else:
            prefix = ["sudo", "-n", "/usr/sbin/iptables", "-w", "3"]
        arguments = [action, chain]
        if action == "-I":
            arguments += ["1"] + self.rule(ip)[2:]
        elif action == "-D":
            arguments += self.rule(ip)[2:]
        output = self.call(prefix + arguments)
        if before is not None:
            require(self.namespace_state(ip) == before, "namespace_changed_after_command_uncertain")
        return output

    def rule(self, ip):
        chain = self.s["ingress"]["chain"]
        source = []
        if chain == "INPUT":
            require(self.namespace_snapshot is not None and self.namespace_snapshot["appAddress"] == ip, "namespace_runtime_required")
            source = ["-s", self.namespace_snapshot["proxyAddress"] + "/32"]
        return ["-A", chain] + source + ["-d", ip + "/32", "-p", "tcp", "-m", "tcp", "--dport", "8000",
                "-m", "comment", "--comment", "roost-activity-" + self.p["fixtureId"], "-j", "REJECT", "--reject-with", "tcp-reset"]

    def ingress(self, ip):
        chain = self.s["ingress"]["chain"]
        raw = self.iptables("-S", ip).decode()
        try:
            rows = [shlex.split(line) for line in raw.splitlines() if line]
        except ValueError:
            raise Refusal("release_activity_runtime_rules_parse") from None
        original = ["-P", "INPUT", "ACCEPT"] if chain == "INPUT" else ["-N", "DOCKER-USER"]
        require(len(rows) <= 1000 and rows.count(original) == 1
                and all(r == original or r[:2] == ["-A", chain] for r in rows), "existing_chain")
        comment = "roost-activity-" + self.p["fixtureId"]
        owned = [r for r in rows if comment in r]
        require(len(owned) <= 1 and all(r == self.rule(ip) for r in owned), "owned_rule_collision")
        others = [r for r in rows if r not in owned]
        require(digest(canonical(others)) == self.s["ingress"]["originalRulesDigest"], "unowned_rules_changed")
        return bool(owned)

    def sql(self, statement):
        db = self.s["database"]
        argv = ["docker", "exec", "-i", db["containerId"], "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
                "-U", db["adminUser"], "-d", db["adminDatabase"]]
        return self.call(argv, ("SET statement_timeout='4s'; SET lock_timeout='1500ms'; " + statement).encode()).decode().strip()

    def owned_where(self, runtime):
        db = self.s["database"]
        return ("datname=" + literal(db["applicationDatabase"]) + " AND usename=" + literal(db["applicationUser"])
                + " AND host(client_addr) IN (" + ",".join(literal(ip) for ip in runtime["sessionIps"]) + ")")

    def database(self, runtime):
        db = self.s["database"]
        user, name = literal(db["applicationUser"]), literal(db["applicationDatabase"])
        statement = ("SELECT json_build_object('roleExists',EXISTS(SELECT 1 FROM pg_roles WHERE rolname=" + user + "),"
                     "'databaseExists',EXISTS(SELECT 1 FROM pg_database WHERE datname=" + name + "),"
                     "'adminSuperuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),"
                     "'roleConfig',COALESCE((SELECT to_json(setconfig) FROM pg_db_role_setting WHERE setrole=(SELECT oid FROM pg_roles WHERE rolname=" + user + ") AND setdatabase=(SELECT oid FROM pg_database WHERE datname=" + name + ")),'[]'::json),"
                     "'globalRoleConfig',COALESCE((SELECT to_json(setconfig) FROM pg_db_role_setting WHERE setrole=(SELECT oid FROM pg_roles WHERE rolname=" + user + ") AND setdatabase=0),'[]'::json),"
                     "'databaseConfig',COALESCE((SELECT to_json(setconfig) FROM pg_db_role_setting WHERE setrole=0 AND setdatabase=(SELECT oid FROM pg_database WHERE datname=" + name + ")),'[]'::json),"
                     "'serverReadOnly',(SELECT reset_val FROM pg_settings WHERE name='default_transaction_read_only'),"
                     "'activeOwned',(SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND backend_type='client backend' AND " + self.owned_where(runtime) + "),"
                     "'activeOthers',(SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND backend_type='client backend' AND datname=" + name + " AND NOT COALESCE((" + self.owned_where(runtime) + "),false)))::text;")
        a = json.loads(self.sql(statement))
        keys(a, {"roleExists", "databaseExists", "adminSuperuser", "roleConfig", "globalRoleConfig", "databaseConfig", "serverReadOnly", "activeOwned", "activeOthers"})
        require(a["roleExists"] is True and a["databaseExists"] is True and a["adminSuperuser"] is True, "db_principal")
        for k in ("roleConfig", "globalRoleConfig", "databaseConfig"):
            require(isinstance(a[k], list) and len(a[k]) <= 32 and all(isinstance(v, str) and len(v) <= 1024 for v in a[k]), "db_config_bound")
            require(len({v.split("=", 1)[0] for v in a[k]}) == len(a[k]), "db_config_unique")
        original_others = [v for v in db["originalRoleConfig"] if not v.startswith("default_transaction_read_only=")]
        require([v for v in a["roleConfig"] if not v.startswith("default_transaction_read_only=")] == original_others, "other_role_guc_changed")
        effective = a["serverReadOnly"]
        require(effective in {"on", "off"}, "server_readonly")
        for k in ("databaseConfig", "globalRoleConfig", "roleConfig"):
            vals = [v.split("=", 1)[1] for v in a[k] if v.startswith("default_transaction_read_only=")]
            if vals:
                require(len(vals) == 1 and vals[0] in {"on", "off"}, "effective_readonly")
                effective = vals[0]
        for k in ("activeOwned", "activeOthers"):
            require(type(a[k]) is int and 0 <= a[k] <= 10000, "session_count")
        a["databaseReadOnly"] = effective == "on"
        return a

    def set_role(self, mode, runtime):
        require(mode in {"on", "off", "reset"}, "fixed_role_mode")
        db = self.s["database"]
        command = "ALTER ROLE " + qident(db["applicationUser"]) + " IN DATABASE " + qident(db["applicationDatabase"])
        command += " RESET default_transaction_read_only;" if mode == "reset" else " SET default_transaction_read_only=" + mode + ";"
        # Only this controller connection changes its own transaction default.
        # Only application connections with exact current owned container IPs
        # are revoked. Foreign users/DBs/local sockets are never terminated.
        self.effect = True
        closed = self.sql("SET default_transaction_read_only=off; " + command
                          + " SELECT CASE WHEN COALESCE(bool_and(pg_terminate_backend(pid,1500)),true) THEN 'closed' ELSE 'unproven' END"
                          + " FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND backend_type='client backend' AND "
                          + self.owned_where(runtime) + ";")
        require(closed == "closed", "scoped_sessions_closed")

    def observe(self, runtime, db, ingress):
        return {"schemaVersion": "roost-activity-runtime-observation-v1", "operation": self.r["operation"],
                "releaseId": self.p["releaseId"], "operationId": self.p["operationId"], "fixtureId": self.p["fixtureId"],
                "targetId": self.p["targetId"], "manifestDigest": self.p["manifestDigest"],
                "controllerProgramDigest": self.p["controllerProgramDigest"], "runtimeDigest": runtime["runtimeDigest"],
                "databaseReadOnly": db["databaseReadOnly"], "activeOtherSessions": db["activeOthers"],
                "activeOwnedSessions": db["activeOwned"], "roleConfigDigest": digest(canonical(db["roleConfig"])),
                "originalRoleConfigMatches": db["roleConfig"] == self.s["database"]["originalRoleConfig"],
                "ingressOwnedRulePresent": ingress, "ingressBlockedByRoot": self.f["ingressBlockedByRoot"],
                "cadencesHeld": all(r["status"] in {"exited", "created"} or r["status"] == "paused" and r["paused"] for r in runtime["services"] if r["role"] == "cadence"),
                "cadences": [{"name": r["name"], "state": "paused" if r["paused"] else r["status"],
                              "behaviorDigest": next(c["behaviorDigest"] for c in self.s["cadences"] if c["name"] == r["name"])}
                             for r in runtime["services"] if r["role"] == "cadence"],
                **settings_digests(self.s), "effect": self.effect, "providerCalls": 0,
                "nativeJobQualified": False, "externalHealthVerified": False, "cadenceTicksVerified": False,
                "observedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}

    def browser_access(self, runtime):
        app = next(r for r in self.p["expectedRuntime"] if r["name"] == "app")
        value = json.loads(self.call(["docker", "exec", "-i", app["containerId"], "python", "-B", "-c", COOKIE_PROGRAM],
                                     canonical(self.s["browserAccess"])))
        keys(value, {"cookieName", "settingsSourceDigest", "routesSourceDigest", "source"})
        require(isinstance(value["cookieName"], str) and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]{0,79}", value["cookieName"])
                and value["source"] in {"environment", "dotenv", "settings_default", "route_default"}, "cookie_observation")
        require(all(value[k] == self.s["browserAccess"][k] for k in ("settingsSourceDigest", "routesSourceDigest")), "cookie_source_seal")
        return {"schemaVersion": "roost-activity-browser-access-observation-v1", "containerAddress": runtime["appIp"],
                **value, "runtimeDigest": runtime["runtimeDigest"], "providerCalls": 0, "effect": False,
                "nativeJobQualified": False}

    def read_health(self, runtime):
        app = next(r for r in self.p["expectedRuntime"] if r["name"] == "app")
        reply = json.loads(self.call(["docker", "exec", "-i", app["containerId"], "python", "-B", "-c", HEALTH_PROGRAM],
                                     canonical({"commit": self.p["commit"], **self.s["internalHealth"]})))
        keys(reply, {"backendCommit", "frontendCommit", "healthy", "observedAt"})
        require(reply["backendCommit"] == self.p["commit"] and reply["frontendCommit"] == self.p["commit"]
                and reply["healthy"] is True, "exact_internal_health")
        require(-2 <= (datetime.now(timezone.utc) - utc(reply["observedAt"])).total_seconds() <= 10, "fresh_internal_health")
        after = self.runtime()
        require(after == runtime, "runtime_changed_during_health")
        return {"schemaVersion": "roost-activity-internal-health-observation-v1", **reply,
                "runtimeDigest": runtime["runtimeDigest"], "providerCalls": 0, "effect": False, "nativeJobQualified": False}

    def ticks(self, runtime):
        require(all(r["status"] == "running" and not r["paused"] for r in runtime["services"] if r["role"] == "cadence"), "cadences_not_resumed")
        table = "public." + qident(self.s["cadenceEvidence"]["table"])
        sql = ("SELECT COALESCE(json_agg(json_build_object('kind',cadence_kind,'owner',execution_owner,'mode',execution_mode,"
               "'executed',summary_json::jsonb->'executed',"
               "'reason',CASE WHEN summary_json::jsonb->>'reason' IN ('proactive_disabled','external_scheduler_owner') THEN summary_json::jsonb->>'reason' ELSE NULL END,"
               "'summaryDigest',encode(sha256(convert_to(summary_json::jsonb::text,'UTF8')),'hex'),"
               "'lastRunAt',to_char(last_run_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),"
               "'updatedAt',to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),"
               "'providerRequests',COALESCE(summary_json::jsonb->'provider_requests',summary_json::jsonb->'providerRequests'),"
               "'externalActions',COALESCE(summary_json::jsonb->'messages_delivered',summary_json::jsonb->'foreground_delivery_successes'),"
               "'failures',COALESCE(summary_json::jsonb->'failures',summary_json::jsonb->'foreground_failures')) ORDER BY cadence_kind),'[]'::json) "
               "FROM (SELECT * FROM " + table + " WHERE cadence_kind IN ('maintenance','proactive') LIMIT 3) bounded;")
        rows = json.loads(self.sql(sql))
        require(isinstance(rows, list) and len(rows) <= 3 and all(isinstance(r, dict) for r in rows), "tick_rows")
        require(len({r.get("kind") for r in rows}) == len(rows)
                and all(r.get("kind") in {"maintenance", "proactive"} for r in rows), "tick_rows")
        start = utc(self.r["observation"]["startedAt"])
        if len(rows) < 2 or any(utc(row["lastRunAt"]) < start for row in rows):
            return {"schemaVersion": "roost-activity-cadence-observation-v1", "status": "pending",
                    "reason": "missing_fresh_terminal_tick", "cadenceEvidence": [],
                    "startedAt": self.r["observation"]["startedAt"],
                    "observedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "runtimeDigest": runtime["runtimeDigest"], "effect": False, "nativeJobQualified": False}
        expectations = None
        if "expectedSources" in self.s["cadenceEvidence"]:
            sources = self.s["cadenceEvidence"]["expectedSources"]
            expectations = {}
            for kind in ("maintenance", "proactive"):
                cadence = next(c for c in self.s["cadences"] if c["name"] == kind + "_cadence")
                expectations[kind] = json.loads(self.call(
                    ["docker", "exec", "-i", cadence["containerId"], "python", "-B", "-c", EXPECTATION_PROGRAM],
                    canonical({"sources": sources, "kind": kind})))
                actual = expectations[kind]
                source_digest = digest(canonical({seal: sources[seal] for _, seal in CADENCE_SOURCES}))
                require(actual.get("sourceDigest") == source_digest, "tick_expectation_sources")
            require(expectations["maintenance"].get("configurationDigest") == expectations["proactive"].get("configurationDigest"), "cadence_configuration_parity")
        require(self.runtime() == runtime, "runtime_changed_during_ticks")
        return {"status": "observed", **qualify_ticks(rows, self.r, runtime, expectations=expectations)}

    def execute(self):
        op = self.r["operation"]
        held = op in {"hold_ingress", "open_fixture_window", "refence_fixture_window"}
        before = self.runtime(require_held=held)
        if op == "read_health":
            return self.read_health(before)
        if op == "read_browser_access":
            return self.browser_access(before)
        if op == "cadence_tick_read":
            return self.ticks(before)
        rule = self.ingress(before["appIp"])
        db = self.database(before)
        if op.startswith("read_runtime_"):
            return self.observe(before, db, rule)
        require(db["activeOthers"] == 0, "other_sessions")
        if op == "hold_ingress":
            require(not rule, "reconcile_before_ingress_repeat")
            self.effect = True
            self.iptables("-I", before["appIp"])
        elif op in {"open_fixture_window", "refence_fixture_window"}:
            require(rule and self.f["ingressBlockedByRoot"] is True, "external_ingress_fence")
            require(db["databaseReadOnly"] is (op == "open_fixture_window"), "reconcile_before_fence_repeat")
            self.set_role("off" if op == "open_fixture_window" else "on", before)
        else:
            require(rule and self.f["ingressBlockedByRoot"] and self.f["fixtureAbsentByRoot"]
                    and self.f["parityVerifiedByRoot"] and db["databaseReadOnly"], "restore_basis")
            # Restoration is not a deployment: every identity is rechecked before
            # removing the one owned rule or resuming an existing cadence.
            original = [a.split("=", 1)[1] for a in self.s["database"]["originalRoleConfig"]
                        if a.startswith("default_transaction_read_only=")]
            self.set_role(original[0] if original else "reset", before)
            restored = self.database(before)
            require(restored["roleConfig"] == self.s["database"]["originalRoleConfig"] and restored["activeOthers"] == 0, "original_role_restore")
            require(self.ingress(before["appIp"]) is True, "owned_rule_before_remove")
            self.iptables("-D", before["appIp"])
            for c in sorted(self.s["cadences"], key=lambda c: c["name"]):
                current = self.runtime()["services"]
                row = next(r for r in current if r["name"] == c["name"])
                if c["originalState"] == "running":
                    if row["status"] == "paused" and row["paused"]:
                        self.call(["docker", "unpause", c["containerId"]])
                    elif row["status"] in {"exited", "created"}:
                        self.call(["docker", "start", c["containerId"]])
                    else:
                        require(row["status"] == "running" and not row["paused"], "existing_cadence_resume")
                else:
                    expected = "paused" if row["paused"] else row["status"]
                    require(expected == c["originalState"], "original_cadence_state")
        after = self.runtime(require_held=held)
        require(before["appIp"] == after["appIp"] and before["sessionIps"] == after["sessionIps"], "network_changed")
        require(before.get("ingressNamespace") == after.get("ingressNamespace"), "namespace_changed_during_operation_uncertain")
        final_rule = self.ingress(after["appIp"])
        final_db = self.database(after)
        require(final_db["activeOthers"] == 0, "post_other_sessions")
        if op == "hold_ingress":
            require(final_rule, "ingress_readback")
        elif op in {"open_fixture_window", "refence_fixture_window"}:
            wanted = op == "refence_fixture_window"
            require(final_rule and final_db["databaseReadOnly"] is wanted, "role_fence_readback")
        else:
            require(not final_rule and final_db["roleConfig"] == self.s["database"]["originalRoleConfig"], "restore_readback")
            for c in self.s["cadences"]:
                row = next(r for r in after["services"] if r["name"] == c["name"])
                require(("paused" if row["paused"] else row["status"]) == c["originalState"], "cadence_restore_readback")
        return self.observe(after, final_db, final_rule)


def main():
    require(len(sys.argv) == 1, "no_cli_selectors")
    raw = sys.stdin.buffer.read(MAX_INPUT + 1)
    require(len(raw) <= MAX_INPUT, "stdin_bound")
    source = globals().get("TRUSTED_SOURCE")
    if source is None:
        source = Path(__file__).read_bytes().decode("utf-8")
    require(isinstance(source, str) and len(source.encode()) <= 131072, "trusted_source")
    request = validate_input(json.loads(raw), source_digest=digest(source.encode()))
    print(json.dumps(Controller(request).execute(), separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except BaseException as e:
        code = str(e) if isinstance(e, Refusal) else "release_activity_runtime_native_unproven"
        print(json.dumps({"error": code, "uncertain": True, "nativeJobQualified": False}))
        sys.exit(1)
