"""Fixed opt-in proxy OUTPUT guard for an exclusive Compose network.

The installed caller authenticates authority and durable intent. These reads
prove native facts, not authority. No data, containers or other rules are changed.
An unexpected namespace/rule/network state refuses before an effect or marks an
already performed effect uncertain. Importing this module has no effects.
"""
import hashlib
import ipaddress
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

HASH = re.compile(r"[a-f0-9]{64}")
SERVICES = {"app", "migrate", "db", "maintenance_cadence", "proactive_cadence"}


class Refusal(Exception):
    pass


def require(ok, code):
    if not ok:
        raise Refusal("release_compose_ingress_" + code)


def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def digest(v):
    return hashlib.sha256(canonical(v)).hexdigest()


def validate(v, source_digest=None):
    require(isinstance(v, dict) and set(v) == {"operation", "policy"}, "fields")
    require(v["operation"] in {"read", "apply", "remove"}, "operation")
    p = v["policy"]
    require(isinstance(p, dict) and set(p) == {"schemaVersion", "targetId", "networkId", "subnet", "proxyId",
            "proxyPid", "namespaceDigest", "databaseContainerId", "databaseIpv4", "proxyIpv4", "ruleComment",
            "originalRulesDigest", "controllerProgramDigest"}, "policy_fields")
    require(p["schemaVersion"] == "roost-compose-proxy-network-fence-policy-v1"
            and isinstance(p["targetId"], str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", p["targetId"]), "identity")
    for k in ("networkId", "proxyId", "namespaceDigest", "databaseContainerId", "originalRulesDigest", "controllerProgramDigest"):
        require(isinstance(p[k], str) and HASH.fullmatch(p[k]), "hash")
    require(p["proxyId"] != p["databaseContainerId"] and type(p["proxyPid"]) is int and 2 <= p["proxyPid"] <= 2147483647, "proxy")
    require(isinstance(p["ruleComment"], str) and re.fullmatch(r"roost-release-hold-[a-f0-9]{32}", p["ruleComment"]), "comment")
    try:
        n = ipaddress.ip_network(p["subnet"], strict=True)
        a, b = ipaddress.ip_address(p["databaseIpv4"]), ipaddress.ip_address(p["proxyIpv4"])
        require(n.version == 4 and 24 <= n.prefixlen <= 30 and a != b and a in n and b in n
                and a not in {n.network_address, n.broadcast_address} and b not in {n.network_address, n.broadcast_address}, "subnet")
    except (ValueError, TypeError):
        raise Refusal("release_compose_ingress_subnet") from None
    require(source_digest is None or source_digest == p["controllerProgramDigest"], "source_seal")
    return v


def run(argv):
    r = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=12, check=True, text=True)
    require(len(r.stdout.encode()) <= 262144, "output_bound")
    return r.stdout


class Controller:
    def __init__(self, value, runner=run):
        self.v, self.p, self.run = validate(value), value["policy"], runner
        self.effects = 0

    def read_json(self, argv):
        return json.loads(self.run(argv))

    def inventory(self):
        p = self.p
        proxy = self.read_json(["docker", "inspect", p["proxyId"]])[0]
        require(proxy["Id"] == p["proxyId"] and proxy["State"]["Running"] is True
                and proxy["State"]["Pid"] == p["proxyPid"], "proxy_changed")
        namespace = self.run(["sudo", "-n", "/usr/bin/readlink", "/proc/" + str(p["proxyPid"]) + "/ns/net"]).strip()
        require(re.fullmatch(r"net:\[[0-9]+\]", namespace)
                and digest({"proxyId": p["proxyId"], "pid": p["proxyPid"], "namespace": namespace}) == p["namespaceDigest"], "namespace_changed")
        ids = self.run(["docker", "network", "ls", "--no-trunc", "--format", "{{.ID}}"]).split()
        require(0 < len(ids) <= 30 and all(HASH.fullmatch(i) for i in ids) and len(set(ids)) == len(ids), "network_bound")
        networks = self.read_json(["docker", "network", "inspect", *ids])
        target = [n for n in networks if n["Id"] == p["networkId"]]
        require(len(target) == 1, "network_missing")
        target = target[0]
        subnets = target.get("IPAM", {}).get("Config", [])
        require(len(subnets) == 1 and subnets[0].get("Subnet") == p["subnet"], "network_subnet_changed")
        selected = ipaddress.ip_network(p["subnet"])
        for n in networks:
            if n["Id"] == p["networkId"]:
                continue
            for c in n.get("IPAM", {}).get("Config", []):
                if c.get("Subnet"):
                    other = ipaddress.ip_network(c["Subnet"])
                    require(other.version != 4 or not selected.overlaps(other), "shared_subnet")
        members = target.get("Containers") or {}
        require(p["proxyId"] in members and p["databaseContainerId"] in members and len(members) <= 6, "members")
        require(members[p["proxyId"]]["IPv4Address"].split("/")[0] == p["proxyIpv4"]
                and members[p["databaseContainerId"]]["IPv4Address"].split("/")[0] == p["databaseIpv4"], "addresses_changed")
        service_names = set()
        for identifier in members:
            if identifier == p["proxyId"]:
                continue
            c = self.read_json(["docker", "inspect", identifier])[0]
            labels = c.get("Config", {}).get("Labels") or {}
            service = labels.get("com.docker.compose.service")
            require(c["Id"] == identifier and labels.get("com.docker.compose.project") == p["targetId"]
                    and service in SERVICES and service not in service_names, "unrelated_member")
            service_names.add(service)
            require(not c.get("HostConfig", {}).get("PortBindings")
                    and not any(c.get("NetworkSettings", {}).get("Ports", {}).values()), "published_ports")
            require((identifier == p["databaseContainerId"]) == (service == "db"), "database_identity")
        require("db" in service_names, "database_missing")
        return {"proxyId": proxy["Id"], "pid": proxy["State"]["Pid"], "namespace": namespace}

    def iptables(self, args):
        return self.run(["sudo", "-n", "/usr/bin/nsenter", "-t", str(self.p["proxyPid"]), "-n",
                         "/usr/sbin/iptables", "-w", "3", *args])

    def rule_args(self):
        return ["-d", self.p["subnet"], "-p", "tcp", "--dport", "8000", "-m", "comment", "--comment",
                self.p["ruleComment"], "-j", "REJECT", "--reject-with", "tcp-reset"]

    def rules(self):
        lines = self.iptables(["-S", "OUTPUT"]).splitlines()
        require(len(lines) <= 128 and sum(map(len, lines)) <= 16384, "rules_bound")
        owned = [line for line in lines if self.p["ruleComment"] in line]
        expected = "-A OUTPUT " + " ".join(self.rule_args())
        # iptables may quote an otherwise identical comment; parse tokens.
        import shlex
        require(len(owned) <= 1 and all(shlex.split(line) == shlex.split(expected) for line in owned), "owned_rule_conflict")
        others = [line for line in lines if line not in owned]
        require(digest(others) == self.p["originalRulesDigest"], "unowned_rules_changed")
        return lines, bool(owned)

    def execute(self):
        before = self.inventory()
        _, present = self.rules()
        op = self.v["operation"]
        if op == "apply":
            require(not present, "reconcile_before_apply")
            self.inventory()
            self.effects = 1
            self.iptables(["-I", "OUTPUT", "1", *self.rule_args()])
        elif op == "remove":
            require(present, "reconcile_before_remove")
            self.inventory()
            self.effects = 1
            self.iptables(["-D", "OUTPUT", *self.rule_args()])
        after = self.inventory()
        require(before == after, "namespace_uncertain")
        lines, present = self.rules()
        require(op == "read" or present == (op == "apply"), "readback_uncertain")
        p = self.p
        receipt = {"schemaVersion": "roost-compose-proxy-network-fence-v1",
            "observedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "targetId": p["targetId"], "networkId": p["networkId"], "subnet": p["subnet"],
            "proxyId": p["proxyId"], "proxyPid": p["proxyPid"], "namespaceDigest": p["namespaceDigest"],
            "databaseContainerId": p["databaseContainerId"], "databaseIpv4": p["databaseIpv4"], "proxyIpv4": p["proxyIpv4"],
            "port": 8000, "ruleComment": p["ruleComment"], "ruleDigest": digest(self.rule_args()),
            "originalRulesDigest": p["originalRulesDigest"], "observedRulesDigest": digest(lines),
            "projectNetworkExclusive": True, "publishedPortsAbsent": True, "rulePresent": present}
        receipt["evidenceDigest"] = digest(receipt)
        return {"receipt": receipt, "effects": self.effects, "removed": op == "remove" and not present}


def main():
    controller = None
    try:
        raw = sys.stdin.buffer.read(16385)
        require(len(raw) <= 16384, "input_bound")
        v = validate(json.loads(raw), hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
        controller = Controller(v)
        print(json.dumps(controller.execute(), separators=(",", ":")))
    except Exception as error:
        print(json.dumps({"refused": True, "uncertain": bool(controller and controller.effects),
                          "code": str(error) if isinstance(error, Refusal) else type(error).__name__}))
        sys.exit(1)


if __name__ == "__main__":
    main()
