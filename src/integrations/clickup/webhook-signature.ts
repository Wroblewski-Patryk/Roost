import { createHmac, timingSafeEqual } from "crypto";

export function signClickUpWebhookBody(secret: string, rawBody: Buffer | string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyClickUpWebhookSignature(input: {
  secret: string;
  rawBody: Buffer | string;
  signature?: string | string[];
}) {
  const signature = Array.isArray(input.signature)
    ? input.signature[0]
    : input.signature;

  if (!input.secret || !signature) {
    return false;
  }

  const expected = Buffer.from(signClickUpWebhookBody(input.secret, input.rawBody), "hex");
  const received = Buffer.from(signature, "hex");

  return expected.length === received.length && timingSafeEqual(expected, received);
}
