"""Ephemeral TLS fixtures: stdout is captured in memory, never a fixture file."""
import datetime
import json
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID

now = datetime.datetime.now(datetime.timezone.utc)

def key():
    return ec.generate_private_key(ec.SECP256R1())

def name(label):
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, label)])

def authority(label):
    k = key()
    n = name(label)
    cert = (x509.CertificateBuilder().subject_name(n).issuer_name(n).public_key(k.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now-datetime.timedelta(days=2))
            .not_valid_after(now+datetime.timedelta(days=30)).add_extension(x509.BasicConstraints(ca=True, path_length=0), True)
            .sign(k, hashes.SHA256()))
    return k, cert

ca_key, ca = authority("Ephemeral handoff CA")
other_key, other_ca = authority("Untrusted ephemeral CA")

def leaf(label, host="handoff.example.test", start=-1, end=2, issuer=ca, issuer_key=ca_key, self_signed=False):
    k = key()
    cert = (x509.CertificateBuilder().subject_name(name(label)).issuer_name(name(label) if self_signed else issuer.subject).public_key(k.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now+datetime.timedelta(days=start))
            .not_valid_after(now+datetime.timedelta(days=end)).add_extension(x509.BasicConstraints(ca=False, path_length=None), True)
            .add_extension(x509.SubjectAlternativeName([x509.DNSName(host)]), False)
            .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), False).sign(k if self_signed else issuer_key, hashes.SHA256()))
    return {"cert": cert.public_bytes(serialization.Encoding.PEM).decode(),
            "key": k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()}

print(json.dumps({"ca": ca.public_bytes(serialization.Encoding.PEM).decode(),
                  "current": leaf("current"), "next": leaf("next"), "wrongHost": leaf("wrong host", host="other.example.test"),
                  "expired": leaf("expired", start=-3, end=-1), "future": leaf("future", start=1, end=2),
                  "untrusted": leaf("untrusted", issuer=other_ca, issuer_key=other_key), "selfSigned": leaf("self signed", self_signed=True)}))
