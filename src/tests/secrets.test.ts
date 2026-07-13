import { strict as assert } from "assert";
import test from "node:test";
import { decryptSecret, encryptSecret } from "../integrations/secrets";

test("encryptSecret and decryptSecret round-trip integration secrets without leaking plain text", () => {
  const plainText = JSON.stringify({
    accessToken: "unit-access-token",
    refreshToken: "unit-refresh-token"
  });

  const ciphertext = encryptSecret(plainText);

  assert.notEqual(ciphertext, plainText);
  assert.equal(ciphertext.split(".").length, 4);
  assert.equal(decryptSecret(ciphertext), plainText);
});

test("decryptSecret rejects malformed secret payloads", () => {
  assert.throws(
    () => decryptSecret("not-an-encrypted-secret"),
    /Invalid encrypted secret format/
  );
});

test("decryptSecret fails closed when ciphertext integrity is broken", () => {
  const ciphertext = encryptSecret("unit-secret-value");
  const [version, iv, authTag, payload] = ciphertext.split(".");
  const tamperedPayloadBytes = Buffer.from(payload, "base64url");
  tamperedPayloadBytes[0] ^= 0x01;
  const tamperedPayload = tamperedPayloadBytes.toString("base64url");

  assert.throws(() => decryptSecret([version, iv, authTag, tamperedPayload].join(".")));
});
