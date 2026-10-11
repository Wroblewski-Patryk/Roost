import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { resolveDepartmentEntry } from "../../operating-model/department-registry";
import { CONTEXTUAL_SHARED_VIEWS } from "./department-view-policy";

export const compositionDraftSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable(),
  icon: z.string().trim().min(1).max(80),
  position: z.number().int().min(0).max(999),
  linkedViews: z.array(z.string().trim().min(1)).max(80)
}).strict();

type Draft = z.infer<typeof compositionDraftSchema>;
type Db = Prisma.TransactionClient;
type CompositionState = Awaited<ReturnType<typeof readCompositionState>>;

export class CompositionRefusal extends Error {
  constructor(readonly code: string, readonly status = 409) { super(code); }
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalDraft(draft: Draft): Draft {
  return { ...draft, linkedViews: [...new Set(draft.linkedViews)].sort() };
}

function tokenFor(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env.authTokenSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifiedToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1] || token.length > 6000) return null;
  const expected = createHmac("sha256", env.authTokenSecret).update(parts[0]).digest();
  let actual: Buffer;
  try { actual = Buffer.from(parts[1], "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try { return JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as unknown; } catch { return null; }
}

function manualDepartmentKey(raw: Prisma.JsonValue | null) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = (raw as Record<string, unknown>).manualDepartmentKey;
  return typeof value === "string" ? value : null;
}

async function readCompositionState(db: Db, workspaceId: string, departmentId: string) {
  const department = await db.workspaceDepartment.findFirst({ where: { id: departmentId, workspaceId } });
  if (!department) throw new CompositionRefusal("department_not_found", 404);
  const [definitions, availability, relations, ownerships, workforce, mappings] = await Promise.all([
    db.departmentViewDefinition.findMany({ where: { workspaceId }, select: { id: true, key: true, canonicalDepartmentId: true, enabled: true, routeView: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { key: "asc" }] }),
    db.departmentViewAvailability.findMany({ where: { workspaceId, departmentId }, select: { id: true, viewId: true, enabled: true, isCore: true, updatedAt: true }, orderBy: { viewId: "asc" } }),
    db.organizationalDepartmentRelation.findMany({ where: { workspaceId, departmentId }, select: { id: true, entityType: true, entityId: true, relationshipRole: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.entityOwnership.findMany({ where: { workspaceId, ownerType: "department", ownerId: departmentId }, select: { id: true, entityType: true, entityId: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.workforceEntity.findMany({ where: { workspaceId }, select: { id: true, department: true, managerId: true, type: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.externalContainerMapping.findMany({ where: { workspaceId }, select: { id: true, provider: true, entityType: true, externalId: true, areaId: true, area: { select: { key: true } }, raw: true, updatedAt: true }, orderBy: { id: "asc" } })
  ]);
  const attached = new Set(Array.isArray(department.linkedViews) ? department.linkedViews.filter((key): key is string => typeof key === "string") : []);
  const selected = availability.filter((item) => item.enabled).map((item) => definitions.find((view) => view.id === item.viewId)?.key)
    .filter((key): key is string => typeof key === "string" && attached.has(key)).sort();
  const relevantWorkforce = workforce.filter((person) => resolveDepartmentEntry(person.department || "")?.canonicalKey === department.key);
  const relevantMappings = mappings.filter((mapping) => resolveDepartmentEntry(manualDepartmentKey(mapping.raw) || mapping.area?.key || "")?.canonicalKey === department.key);
  const proofState = {
    department: { id: department.id, key: department.key, name: department.name, description: department.description,
      icon: department.icon, position: department.position, status: department.status, compositionVersion: department.compositionVersion,
      updatedAt: department.updatedAt },
    definitions, availability, relations, ownerships, relevantWorkforce, relevantMappings
  };
  return { department, definitions, availability, selected, relations, ownerships,
    relevantWorkforce, relevantMappings, stateHash: digest(proofState) };
}

function validateDraft(state: CompositionState, draft: Draft) {
  if (state.department.status !== "active") throw new CompositionRefusal("department_inactive");
  if (state.department.key === "00-ogolny") throw new CompositionRefusal("general_projection_fixed");
  const byKey = new Map(state.definitions.map((view) => [view.key, view]));
  if (!draft.linkedViews.length) throw new CompositionRefusal("department_view_required");
  for (const key of draft.linkedViews) {
    const view = byKey.get(key);
    if (!view || !view.enabled) throw new CompositionRefusal("invalid_department_view", 400);
    if (view.canonicalDepartmentId !== state.department.id && !state.selected.includes(key) && !CONTEXTUAL_SHARED_VIEWS.has(key)) {
      throw new CompositionRefusal("unsupported_shared_view", 400);
    }
  }
  for (const view of state.definitions) {
    if (view.enabled && view.canonicalDepartmentId === state.department.id && state.selected.includes(view.key) && !draft.linkedViews.includes(view.key)) {
      throw new CompositionRefusal("steward_view_required");
    }
  }
}

function impactFor(state: CompositionState, draft: Draft) {
  const before = new Set(state.selected);
  const after = new Set(draft.linkedViews);
  const routeFor = (key: string) => {
    const definition = state.definitions.find((view) => view.key === key);
    return { viewKey: key, href: definition ? `/areas?area=${encodeURIComponent(state.department.key)}&view=${encodeURIComponent(definition.routeView)}` : null };
  };
  const navigation = (keys: string[]) => keys
    .map(routeFor)
    .sort((left, right) => (state.definitions.find((view) => view.key === left.viewKey)?.displayOrder ?? 0)
      - (state.definitions.find((view) => view.key === right.viewKey)?.displayOrder ?? 0));
  return {
    department: { id: state.department.id, key: state.department.key, version: state.department.compositionVersion },
    before: { name: state.department.name, description: state.department.description, icon: state.department.icon,
      position: state.department.position, linkedViews: state.selected },
    after: draft,
    attachedViews: draft.linkedViews.filter((key) => !before.has(key)),
    detachedViews: state.selected.filter((key) => !after.has(key)),
    navigationBefore: navigation(state.selected),
    navigationAfter: navigation(draft.linkedViews),
    existingRelations: state.relations.map((item) => ({ id: item.id, entityType: item.entityType, entityId: item.entityId, role: item.relationshipRole })),
    existingOwnerships: state.ownerships.map((item) => ({ id: item.id, entityType: item.entityType, entityId: item.entityId })),
    existingWorkforce: state.relevantWorkforce.map((item) => ({ id: item.id, type: item.type, department: item.department, managerId: item.managerId })),
    existingProviderMappings: state.relevantMappings.map((item) => ({ id: item.id, provider: item.provider, entityType: item.entityType, externalId: item.externalId, operatingAreaId: item.areaId })),
    preserved: {
      organizationalRelations: state.relations.length,
      accountableRelations: state.relations.filter((item) => item.relationshipRole === "owner").length,
      entityOwnerships: state.ownerships.length,
      workforce: state.relevantWorkforce.length,
      providerMappings: state.relevantMappings.length,
      recordIdentityAndHistory: true,
      oldLinks: true,
      permissionsAndTaskScopes: true
    },
    changesProviderData: false,
    changesResponsibility: false
  };
}

export async function previewDepartmentComposition(workspaceId: string, actorId: string, departmentId: string, input: Draft) {
  const draft = canonicalDraft(input);
  const state = await readCompositionState(prisma, workspaceId, departmentId);
  validateDraft(state, draft);
  const impact = impactFor(state, draft);
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const confirmationToken = tokenFor({ workspaceId, actorId, departmentId, stateHash: state.stateHash, draft, expiresAt });
  return { ...impact, expiresAt: new Date(expiresAt).toISOString(), confirmationToken };
}

export async function applyDepartmentComposition(workspaceId: string, actorId: string, departmentId: string, token: string) {
  const payload = verifiedToken(token);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new CompositionRefusal("composition_preview_invalid", 400);
  const value = payload as Record<string, unknown>;
  if (value.workspaceId !== workspaceId || value.actorId !== actorId || value.departmentId !== departmentId
    || typeof value.expiresAt !== "number" || value.expiresAt <= Date.now() || typeof value.stateHash !== "string") {
    throw new CompositionRefusal("composition_preview_invalid", 400);
  }
  const draft = compositionDraftSchema.parse(value.draft);
  try {
    return await prisma.$transaction(async (tx) => {
      const ownerRows = await tx.$queryRaw<Array<{ owner_user_id: string | null }>>`
        SELECT owner_user_id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
      if (ownerRows[0]?.owner_user_id !== actorId) throw new CompositionRefusal("primary_owner_required", 403);
      const state = await readCompositionState(tx, workspaceId, departmentId);
      if (state.stateHash !== value.stateHash) throw new CompositionRefusal("composition_preview_stale");
      validateDraft(state, draft);
      const changed = await tx.workspaceDepartment.updateMany({
        where: { id: departmentId, workspaceId, compositionVersion: state.department.compositionVersion },
        data: { name: draft.name, description: draft.description, icon: draft.icon, position: draft.position,
          linkedViews: draft.linkedViews, compositionVersion: { increment: 1 } }
      });
      if (changed.count !== 1) throw new CompositionRefusal("composition_preview_stale");
      const byKey = new Map(state.definitions.map((view) => [view.key, view]));
      const byViewId = new Map(state.availability.map((item) => [item.viewId, item]));
      for (const key of new Set([...state.selected, ...draft.linkedViews])) {
        const view = byKey.get(key);
        if (!view) throw new CompositionRefusal("composition_preview_stale");
        const current = byViewId.get(view.id);
        const enabled = draft.linkedViews.includes(key);
        if (current) {
          if (current.enabled !== enabled) await tx.departmentViewAvailability.update({ where: { id: current.id }, data: { enabled } });
        } else if (enabled) {
          await tx.departmentViewAvailability.create({ data: { workspaceId, departmentId, viewId: view.id, enabled, isCore: false, displayOrder: view.routeView === "overview" ? 0 : 100 } });
        }
      }
      await tx.auditLog.create({ data: {
        workspaceId, actorType: "user", actorId, action: "department_composition_applied",
        resourceType: "workspace_department", resourceId: departmentId,
        inputPayload: { before: impactFor(state, draft).before, after: draft, previewHash: state.stateHash },
        outputPayload: { version: state.department.compositionVersion + 1 },
        correlationId: departmentId
      } });
      return { id: departmentId, key: state.department.key, compositionVersion: state.department.compositionVersion + 1,
        linkedViews: draft.linkedViews, preserved: impactFor(state, draft).preserved };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
  } catch (error) {
    if (error instanceof CompositionRefusal) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new CompositionRefusal("composition_preview_stale");
    throw error;
  }
}
