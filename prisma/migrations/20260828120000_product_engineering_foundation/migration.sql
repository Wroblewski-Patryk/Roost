-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('web_application', 'mobile_application', 'desktop_application', 'api_service', 'internal_tool', 'ai_native_application', 'automation_platform', 'library', 'other');

-- CreateEnum
CREATE TYPE "ApplicationPlatform" AS ENUM ('web', 'mobile', 'desktop', 'api', 'service', 'cli', 'agent_facing');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('active', 'paused', 'archived', 'deprecated');

-- CreateEnum
CREATE TYPE "InnovationLifecycleStage" AS ENUM ('idea', 'discovery', 'prototype', 'mvp', 'development', 'validation', 'productization', 'productized', 'archived');

-- CreateEnum
CREATE TYPE "ProductLifecycleStage" AS ENUM ('not_productized', 'candidate', 'launch_preparation', 'active', 'growth', 'mature', 'maintenance', 'deprecated', 'retired');

-- CreateEnum
CREATE TYPE "CapabilityApplicability" AS ENUM ('required', 'recommended', 'optional', 'not_applicable');

-- CreateEnum
CREATE TYPE "CapabilityState" AS ENUM ('unknown', 'not_started', 'missing', 'partial', 'complete', 'verified');

-- CreateEnum
CREATE TYPE "CapabilityLifecycleStatus" AS ENUM ('proposed', 'approved', 'designed', 'implementing', 'implemented', 'tested', 'released', 'validated', 'mature', 'deprecated');

-- CreateEnum
CREATE TYPE "ImplementationStrategy" AS ENUM ('local', 'shared_library', 'shared_service', 'external_service', 'platform');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('source_file', 'git_commit', 'pull_request', 'test', 'api_endpoint', 'screenshot', 'deployment', 'documentation', 'database_object', 'metric', 'external_url', 'manual_verification');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('human', 'agent', 'system', 'import', 'repository_scan');

-- CreateEnum
CREATE TYPE "EvidenceVerificationStatus" AS ENUM ('unverified', 'verified', 'rejected', 'stale');

-- CreateEnum
CREATE TYPE "ApplicationInterfaceType" AS ENUM ('human_ui', 'rest_api', 'graphql', 'websocket', 'webhook', 'event', 'mcp_resource', 'mcp_tool', 'cli', 'sdk');

-- CreateEnum
CREATE TYPE "ArchitectureComponentType" AS ENUM ('frontend', 'backend', 'database', 'orm', 'cache', 'queue', 'realtime', 'authentication', 'storage', 'deployment', 'hosting', 'ci_cd', 'external_service', 'other');

-- CreateEnum
CREATE TYPE "ProductOfferingType" AS ENUM ('product', 'service', 'hybrid');

-- CreateEnum
CREATE TYPE "ProductOfferingStatus" AS ENUM ('draft', 'validation', 'launch_preparation', 'active', 'paused', 'retired');

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "problem_statement" TEXT,
    "target_users" TEXT,
    "value_proposition" TEXT,
    "application_type" "ApplicationType" NOT NULL DEFAULT 'web_application',
    "owner" TEXT,
    "innovation_stage" "InnovationLifecycleStage" NOT NULL DEFAULT 'idea',
    "product_stage" "ProductLifecycleStage" NOT NULL DEFAULT 'not_productized',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'active',
    "business_model" TEXT,
    "target_platforms" "ApplicationPlatform"[] DEFAULT ARRAY[]::"ApplicationPlatform"[],
    "frontend_url" TEXT,
    "backend_url" TEXT,
    "documentation_url" TEXT,
    "source" "EvidenceSource" NOT NULL DEFAULT 'human',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_repositories" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "default_branch" TEXT,
    "purpose" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_dimension_definitions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_dimension_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_domains" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_definitions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "readiness_dimension_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "universal" BOOLEAN NOT NULL DEFAULT true,
    "default_applicability" "CapabilityApplicability" NOT NULL DEFAULT 'recommended',
    "maturity" TEXT NOT NULL DEFAULT 'baseline',
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_definitions" (
    "id" UUID NOT NULL,
    "capability_definition_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_capabilities" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "capability_definition_id" UUID NOT NULL,
    "applicability" "CapabilityApplicability" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "target_state" "CapabilityState" NOT NULL DEFAULT 'complete',
    "observed_state" "CapabilityState" NOT NULL DEFAULT 'unknown',
    "lifecycle_status" "CapabilityLifecycleStatus" NOT NULL DEFAULT 'proposed',
    "implementation_strategy" "ImplementationStrategy" NOT NULL DEFAULT 'local',
    "target_description" TEXT,
    "observed_summary" TEXT,
    "rationale" TEXT,
    "notes" TEXT,
    "owner" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_features" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "application_capability_id" UUID NOT NULL,
    "feature_definition_id" UUID NOT NULL,
    "applicability" "CapabilityApplicability" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "target_state" "CapabilityState" NOT NULL DEFAULT 'complete',
    "observed_state" "CapabilityState" NOT NULL DEFAULT 'unknown',
    "lifecycle_status" "CapabilityLifecycleStatus" NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_capability_dimensions" (
    "id" UUID NOT NULL,
    "application_capability_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "applicability" "CapabilityApplicability" NOT NULL DEFAULT 'required',
    "target_state" "CapabilityState" NOT NULL DEFAULT 'complete',
    "observed_state" "CapabilityState" NOT NULL DEFAULT 'unknown',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_capability_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_observations" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "application_capability_id" UUID,
    "application_feature_id" UUID,
    "application_capability_dimension_id" UUID,
    "observed_state" "CapabilityState" NOT NULL,
    "summary" TEXT,
    "source" "EvidenceSource" NOT NULL DEFAULT 'human',
    "observed_by_type" "ActorType",
    "observed_by_id" TEXT,
    "confidence" INTEGER,
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capability_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_evidence" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "application_capability_id" UUID,
    "application_feature_id" UUID,
    "observation_id" UUID,
    "type" "EvidenceType" NOT NULL,
    "source" "EvidenceSource" NOT NULL DEFAULT 'human',
    "reference" TEXT NOT NULL,
    "url" TEXT,
    "description" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by_type" "ActorType",
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "verification_status" "EvidenceVerificationStatus" NOT NULL DEFAULT 'unverified',
    "confidence" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_capability_dependencies" (
    "id" UUID NOT NULL,
    "from_capability_id" UUID NOT NULL,
    "to_capability_id" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_capability_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_packs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "OperatingStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_pack_items" (
    "id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "capability_definition_id" UUID NOT NULL,
    "applicability" "CapabilityApplicability" NOT NULL DEFAULT 'required',
    "priority" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "capability_pack_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_blueprints" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "OperatingStatus" NOT NULL DEFAULT 'active',
    "suggestions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_blueprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_blueprint_capabilities" (
    "id" UUID NOT NULL,
    "blueprint_id" UUID NOT NULL,
    "capability_definition_id" UUID NOT NULL,
    "applicability" "CapabilityApplicability" NOT NULL DEFAULT 'required',
    "priority" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "application_blueprint_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technology_definitions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "website_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technology_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_technologies" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "technology_definition_id" UUID NOT NULL,
    "purpose" TEXT,
    "version" TEXT,
    "scope" TEXT,
    "status" "OperatingStatus" NOT NULL DEFAULT 'active',
    "rationale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_architecture_components" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "type" "ArchitectureComponentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "technology_definition_id" UUID,
    "version" TEXT,
    "status" "OperatingStatus" NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_architecture_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_interfaces" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "application_capability_id" UUID,
    "application_feature_id" UUID,
    "type" "ApplicationInterfaceType" NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "audit_required" BOOLEAN NOT NULL DEFAULT true,
    "status" "OperatingStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_interfaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_projects" (
    "application_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "relation_type" TEXT NOT NULL DEFAULT 'delivery',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_projects_pkey" PRIMARY KEY ("application_id","project_id")
);

-- CreateTable
CREATE TABLE "product_offerings" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "application_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductOfferingType" NOT NULL,
    "description" TEXT,
    "value_proposition" TEXT,
    "customer_segment" TEXT,
    "business_model" TEXT,
    "pricing" JSONB NOT NULL DEFAULT '{}',
    "lifecycle_stage" "ProductLifecycleStage" NOT NULL DEFAULT 'candidate',
    "commercial_status" "ProductOfferingStatus" NOT NULL DEFAULT 'draft',
    "product_owner" TEXT,
    "sales_readiness" "CapabilityState" NOT NULL DEFAULT 'unknown',
    "support_readiness" "CapabilityState" NOT NULL DEFAULT 'unknown',
    "documentation_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applications_workspace_id_innovation_stage_status_idx" ON "applications"("workspace_id", "innovation_stage", "status");

-- CreateIndex
CREATE INDEX "applications_workspace_id_product_stage_status_idx" ON "applications"("workspace_id", "product_stage", "status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_workspace_id_slug_key" ON "applications"("workspace_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "application_repositories_application_id_url_key" ON "application_repositories"("application_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_dimension_definitions_workspace_id_key_key" ON "readiness_dimension_definitions"("workspace_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "capability_domains_workspace_id_key_key" ON "capability_domains"("workspace_id", "key");

-- CreateIndex
CREATE INDEX "capability_definitions_workspace_id_domain_id_deprecated_idx" ON "capability_definitions"("workspace_id", "domain_id", "deprecated");

-- CreateIndex
CREATE UNIQUE INDEX "capability_definitions_workspace_id_key_key" ON "capability_definitions"("workspace_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_definitions_capability_definition_id_key_key" ON "feature_definitions"("capability_definition_id", "key");

-- CreateIndex
CREATE INDEX "application_capabilities_application_id_applicability_obser_idx" ON "application_capabilities"("application_id", "applicability", "observed_state");

-- CreateIndex
CREATE UNIQUE INDEX "application_capabilities_application_id_capability_definiti_key" ON "application_capabilities"("application_id", "capability_definition_id");

-- CreateIndex
CREATE INDEX "application_features_application_capability_id_idx" ON "application_features"("application_capability_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_features_application_id_feature_definition_id_key" ON "application_features"("application_id", "feature_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_capability_dimensions_application_capability_id_key" ON "application_capability_dimensions"("application_capability_id", "key");

-- CreateIndex
CREATE INDEX "capability_observations_application_id_observed_at_idx" ON "capability_observations"("application_id", "observed_at");

-- CreateIndex
CREATE INDEX "capability_observations_application_capability_id_observed__idx" ON "capability_observations"("application_capability_id", "observed_at");

-- CreateIndex
CREATE INDEX "application_evidence_workspace_id_application_id_type_idx" ON "application_evidence"("workspace_id", "application_id", "type");

-- CreateIndex
CREATE INDEX "application_evidence_application_capability_id_idx" ON "application_evidence"("application_capability_id");

-- CreateIndex
CREATE INDEX "application_evidence_application_feature_id_idx" ON "application_evidence"("application_feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_capability_dependencies_from_capability_id_to_c_key" ON "application_capability_dependencies"("from_capability_id", "to_capability_id");

-- CreateIndex
CREATE UNIQUE INDEX "capability_packs_workspace_id_key_key" ON "capability_packs"("workspace_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "capability_pack_items_pack_id_capability_definition_id_key" ON "capability_pack_items"("pack_id", "capability_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_blueprints_workspace_id_key_key" ON "application_blueprints"("workspace_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "application_blueprint_capabilities_blueprint_id_capability__key" ON "application_blueprint_capabilities"("blueprint_id", "capability_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "technology_definitions_workspace_id_key_key" ON "technology_definitions"("workspace_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "application_technologies_application_id_technology_definiti_key" ON "application_technologies"("application_id", "technology_definition_id", "purpose");

-- CreateIndex
CREATE INDEX "application_architecture_components_application_id_type_idx" ON "application_architecture_components"("application_id", "type");

-- CreateIndex
CREATE INDEX "application_interfaces_application_capability_id_idx" ON "application_interfaces"("application_capability_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_interfaces_application_id_type_key_key" ON "application_interfaces"("application_id", "type", "key");

-- CreateIndex
CREATE INDEX "product_offerings_workspace_id_commercial_status_idx" ON "product_offerings"("workspace_id", "commercial_status");

-- CreateIndex
CREATE UNIQUE INDEX "product_offerings_workspace_id_key_key" ON "product_offerings"("workspace_id", "key");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_repositories" ADD CONSTRAINT "application_repositories_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_dimension_definitions" ADD CONSTRAINT "readiness_dimension_definitions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_domains" ADD CONSTRAINT "capability_domains_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_definitions" ADD CONSTRAINT "capability_definitions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_definitions" ADD CONSTRAINT "capability_definitions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "capability_domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_definitions" ADD CONSTRAINT "capability_definitions_readiness_dimension_id_fkey" FOREIGN KEY ("readiness_dimension_id") REFERENCES "readiness_dimension_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_definitions" ADD CONSTRAINT "feature_definitions_capability_definition_id_fkey" FOREIGN KEY ("capability_definition_id") REFERENCES "capability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_capabilities" ADD CONSTRAINT "application_capabilities_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_capabilities" ADD CONSTRAINT "application_capabilities_capability_definition_id_fkey" FOREIGN KEY ("capability_definition_id") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_features" ADD CONSTRAINT "application_features_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_features" ADD CONSTRAINT "application_features_application_capability_id_fkey" FOREIGN KEY ("application_capability_id") REFERENCES "application_capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_features" ADD CONSTRAINT "application_features_feature_definition_id_fkey" FOREIGN KEY ("feature_definition_id") REFERENCES "feature_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_capability_dimensions" ADD CONSTRAINT "application_capability_dimensions_application_capability_i_fkey" FOREIGN KEY ("application_capability_id") REFERENCES "application_capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_observations" ADD CONSTRAINT "capability_observations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_observations" ADD CONSTRAINT "capability_observations_application_capability_id_fkey" FOREIGN KEY ("application_capability_id") REFERENCES "application_capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_observations" ADD CONSTRAINT "capability_observations_application_feature_id_fkey" FOREIGN KEY ("application_feature_id") REFERENCES "application_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_observations" ADD CONSTRAINT "capability_observations_application_capability_dimension_i_fkey" FOREIGN KEY ("application_capability_dimension_id") REFERENCES "application_capability_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_evidence" ADD CONSTRAINT "application_evidence_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_evidence" ADD CONSTRAINT "application_evidence_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_evidence" ADD CONSTRAINT "application_evidence_application_capability_id_fkey" FOREIGN KEY ("application_capability_id") REFERENCES "application_capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_evidence" ADD CONSTRAINT "application_evidence_application_feature_id_fkey" FOREIGN KEY ("application_feature_id") REFERENCES "application_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_evidence" ADD CONSTRAINT "application_evidence_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "capability_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_capability_dependencies" ADD CONSTRAINT "application_capability_dependencies_from_capability_id_fkey" FOREIGN KEY ("from_capability_id") REFERENCES "application_capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_capability_dependencies" ADD CONSTRAINT "application_capability_dependencies_to_capability_id_fkey" FOREIGN KEY ("to_capability_id") REFERENCES "application_capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_packs" ADD CONSTRAINT "capability_packs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_pack_items" ADD CONSTRAINT "capability_pack_items_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "capability_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_pack_items" ADD CONSTRAINT "capability_pack_items_capability_definition_id_fkey" FOREIGN KEY ("capability_definition_id") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_blueprints" ADD CONSTRAINT "application_blueprints_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_blueprint_capabilities" ADD CONSTRAINT "application_blueprint_capabilities_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "application_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_blueprint_capabilities" ADD CONSTRAINT "application_blueprint_capabilities_capability_definition_i_fkey" FOREIGN KEY ("capability_definition_id") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_definitions" ADD CONSTRAINT "technology_definitions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_technologies" ADD CONSTRAINT "application_technologies_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_technologies" ADD CONSTRAINT "application_technologies_technology_definition_id_fkey" FOREIGN KEY ("technology_definition_id") REFERENCES "technology_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_architecture_components" ADD CONSTRAINT "application_architecture_components_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_architecture_components" ADD CONSTRAINT "application_architecture_components_technology_definition__fkey" FOREIGN KEY ("technology_definition_id") REFERENCES "technology_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_interfaces" ADD CONSTRAINT "application_interfaces_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_interfaces" ADD CONSTRAINT "application_interfaces_application_capability_id_fkey" FOREIGN KEY ("application_capability_id") REFERENCES "application_capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_interfaces" ADD CONSTRAINT "application_interfaces_application_feature_id_fkey" FOREIGN KEY ("application_feature_id") REFERENCES "application_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_projects" ADD CONSTRAINT "application_projects_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_projects" ADD CONSTRAINT "application_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offerings" ADD CONSTRAINT "product_offerings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offerings" ADD CONSTRAINT "product_offerings_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
