import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/async-handler";

const webhookFoundationSchema = z.object({
  webhook_id: z.string().min(1).optional(),
  event: z.string().min(1).optional()
}).passthrough();

export const clickUpWebhooksRouter = Router();

clickUpWebhooksRouter.post("/", asyncHandler(async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    return res.status(415).json({ error: "raw_body_required" });
  }

  const signature = req.header("X-Signature");
  if (!signature) {
    return res.status(401).json({ error: "missing_signature" });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "invalid_webhook_payload" });
  }

  const parsed = webhookFoundationSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.webhook_id || !parsed.data.event) {
    return res.status(400).json({ error: "invalid_webhook_payload" });
  }

  return res.status(501).json({
    error: "webhook_receiver_not_enabled",
    data: {
      provider: "clickup",
      webhookId: parsed.data.webhook_id,
      event: parsed.data.event
    }
  });
}));
