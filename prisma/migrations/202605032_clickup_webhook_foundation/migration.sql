CREATE TABLE "external_webhook_registrations" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "scope_type" TEXT NOT NULL,
  "scope_external_id" TEXT,
  "endpoint_url" TEXT NOT NULL,
  "secret_ciphertext" TEXT NOT NULL,
  "events" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'active',
  "last_health_at" TIMESTAMP(3),
  "last_error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "external_webhook_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_event_inbox" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "webhook_registration_id" UUID,
  "external_webhook_id" TEXT NOT NULL,
  "event_name" TEXT NOT NULL,
  "external_task_id" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "signature_verified" BOOLEAN NOT NULL DEFAULT false,
  "processing_status" TEXT NOT NULL DEFAULT 'pending',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "provider_event_inbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_event_outbox" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "event_id" UUID,
  "event_type" TEXT NOT NULL,
  "target_agent" TEXT,
  "scope" JSONB NOT NULL DEFAULT '{}',
  "payload" JSONB NOT NULL,
  "delivery_status" TEXT NOT NULL DEFAULT 'pending',
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agent_event_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_webhook_registrations_workspace_id_provider_external_key"
  ON "external_webhook_registrations"("workspace_id", "provider", "external_id");

CREATE INDEX "external_webhook_registrations_workspace_id_provider_status_idx"
  ON "external_webhook_registrations"("workspace_id", "provider", "status");

CREATE UNIQUE INDEX "provider_event_inbox_workspace_id_provider_idempotency_key_key"
  ON "provider_event_inbox"("workspace_id", "provider", "idempotency_key");

CREATE INDEX "provider_event_inbox_workspace_id_provider_processing_status_idx"
  ON "provider_event_inbox"("workspace_id", "provider", "processing_status");

CREATE INDEX "provider_event_inbox_external_webhook_id_idx"
  ON "provider_event_inbox"("external_webhook_id");

CREATE INDEX "agent_event_outbox_workspace_id_delivery_status_available_at_idx"
  ON "agent_event_outbox"("workspace_id", "delivery_status", "available_at");

CREATE INDEX "agent_event_outbox_workspace_id_event_type_idx"
  ON "agent_event_outbox"("workspace_id", "event_type");

ALTER TABLE "external_webhook_registrations"
  ADD CONSTRAINT "external_webhook_registrations_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_event_inbox"
  ADD CONSTRAINT "provider_event_inbox_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_event_inbox"
  ADD CONSTRAINT "provider_event_inbox_webhook_registration_id_fkey"
  FOREIGN KEY ("webhook_registration_id") REFERENCES "external_webhook_registrations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agent_event_outbox"
  ADD CONSTRAINT "agent_event_outbox_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
