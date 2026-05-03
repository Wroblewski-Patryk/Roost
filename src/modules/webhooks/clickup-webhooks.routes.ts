import { Router } from "express";
import { z } from "zod";
import { ingestClickUpWebhook } from "../../integrations/clickup/clickup.webhooks";
import { IntegrationError } from "../../integrations/errors";
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

  try {
    const result = await ingestClickUpWebhook({
      rawBody: req.body,
      signature
    });
    return res.status(202).json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));
