import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { Shell } from "../../layout/shell";
import {
  ApplicationCapability,
  ProductApplication,
  ProductEngineeringCatalog,
  ProductGap,
  Readiness,
} from "./product-engineering-types";

type PortfolioPacket = {
  summary: {
    applications: number;
    activeDevelopment: number;
    prototypes: number;
    productization: number;
    products: number;
    averageReadiness: number;
  };
  applications: ProductApplication[];
};

type CockpitView =
  | "overview"
  | "capabilities"
  | "gaps"
  | "architecture"
  | "interfaces"
  | "evidence";

const lifecycleStages = [
  "idea",
  "discovery",
  "prototype",
  "mvp",
  "development",
  "validation",
  "productization",
  "productized",
  "archived",
];
const observedStates = [
  "unknown",
  "not_started",
  "missing",
  "partial",
  "complete",
  "verified",
];
const architectureTypes = [
  "frontend",
  "backend",
  "database",
  "orm",
  "cache",
  "queue",
  "realtime",
  "authentication",
  "storage",
  "deployment",
  "hosting",
  "ci_cd",
  "external_service",
  "other",
];
const interfaceTypes = [
  "human_ui",
  "rest_api",
  "graphql",
  "websocket",
  "webhook",
  "event",
  "mcp_resource",
  "mcp_tool",
  "cli",
  "sdk",
];
const applicationTypes = [
  "web_application",
  "mobile_application",
  "desktop_application",
  "api_service",
  "internal_tool",
  "ai_native_application",
  "automation_platform",
  "library",
  "other",
];
const productStages = [
  "not_productized",
  "candidate",
  "launch_preparation",
  "active",
  "growth",
  "mature",
  "maintenance",
  "deprecated",
  "retired",
];
const applicationStatuses = ["active", "paused", "archived", "deprecated"];
const applicationPlatforms = [
  "web",
  "mobile",
  "desktop",
  "api",
  "service",
  "cli",
  "agent_facing",
];

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between gap-3 text-xs font-bold">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <progress
        className="progress progress-primary h-2 w-full"
        max="100"
        value={value}
      ></progress>
    </div>
  );
}

function ApplicationCard({
  application,
  onOpen,
}: {
  application: ProductApplication;
  onOpen: () => void;
}) {
  return (
    <button
      className="rounded-company border border-base-300 bg-base-100 p-5 text-left transition hover:border-primary hover:shadow-md"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-company-ink">
            {application.name}
          </h3>
          <p className="mt-1 text-sm text-company-muted">
            {application.description || "No application description yet."}
          </p>
        </div>
        <span className="badge badge-primary badge-outline">
          {humanize(application.innovationStage)}
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {(application.readiness?.dimensions || [])
          .slice(0, 5)
          .map((dimension) => (
            <Meter
              key={dimension.key}
              label={dimension.name}
              value={dimension.score}
            />
          ))}
        {!application.readiness?.dimensions.length ? (
          <p className="text-sm text-company-muted">
            Assign capabilities to calculate readiness.
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="badge badge-neutral">
          Overall {application.readiness?.overall || 0}%
        </span>
        <span
          className={`badge ${application.gapSummary?.blockers ? "badge-error" : "badge-outline"}`}
        >
          {application.gapSummary?.blockers || 0} blockers
        </span>
        <span className="badge badge-outline">
          {application.gapSummary?.total || 0} gaps
        </span>
      </div>
    </button>
  );
}

function CreateApplicationPanel({
  catalog,
  onCreated,
}: {
  catalog: ProductEngineeringCatalog | null;
  onCreated: (application: ProductApplication) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const response = await api<{ data: ProductApplication }>(
        "/v1/product-engineering/applications",
        {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name") || ""),
            slug: String(form.get("slug") || ""),
            description: String(form.get("description") || "") || undefined,
            problemStatement:
              String(form.get("problemStatement") || "") || undefined,
            valueProposition:
              String(form.get("valueProposition") || "") || undefined,
            applicationType: String(
              form.get("applicationType") || "web_application",
            ),
            blueprintId: String(form.get("blueprintId") || "") || undefined,
            targetPlatforms: form.getAll("targetPlatforms"),
          }),
        },
      );
      setOpen(false);
      onCreated(response.data);
    } catch (caught) {
      setError(
        caught instanceof AppApiError
          ? caught.code
          : "application_create_failed",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open)
    return (
      <CcButton onClick={() => setOpen(true)}>
        <i className="ph-bold ph-plus" aria-hidden="true"></i> New application
      </CcButton>
    );
  return (
    <section className="rounded-company border border-primary/30 bg-base-100 p-5 lg:col-span-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Define an application</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {error ? <CcNotice tone="error" title={error} /> : null}
      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <label className="form-control">
          <span className="label-text font-bold">Name</span>
          <input className="input input-bordered" name="name" required />
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Stable slug</span>
          <input
            className="input input-bordered"
            name="slug"
            pattern="[a-z0-9._-]+"
            placeholder="soar"
            required
          />
        </label>
        <label className="form-control md:col-span-2">
          <span className="label-text font-bold">Description</span>
          <textarea
            className="textarea textarea-bordered"
            name="description"
          ></textarea>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Problem statement</span>
          <textarea
            className="textarea textarea-bordered"
            name="problemStatement"
          ></textarea>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Value proposition</span>
          <textarea
            className="textarea textarea-bordered"
            name="valueProposition"
          ></textarea>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Application type</span>
          <select className="select select-bordered" name="applicationType">
            <option value="web_application">Web application</option>
            <option value="api_service">API service</option>
            <option value="mobile_application">Mobile application</option>
            <option value="desktop_application">Desktop application</option>
            <option value="ai_native_application">AI-native application</option>
            <option value="internal_tool">Internal tool</option>
          </select>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Blueprint</span>
          <select className="select select-bordered" name="blueprintId">
            <option value="">No blueprint</option>
            {catalog?.blueprints.map((blueprint) => (
              <option key={blueprint.id} value={blueprint.id}>
                {blueprint.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="md:col-span-2">
          <legend className="font-bold">Target platforms</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {[
              "web",
              "mobile",
              "desktop",
              "api",
              "service",
              "cli",
              "agent_facing",
            ].map((platform) => (
              <label className="label cursor-pointer gap-2" key={platform}>
                <input
                  className="checkbox checkbox-sm"
                  type="checkbox"
                  name="targetPlatforms"
                  value={platform}
                />
                <span>{humanize(platform)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="md:col-span-2">
          <CcButton disabled={saving} type="submit">
            {saving ? "Creating…" : "Create application"}
          </CcButton>
        </div>
      </form>
    </section>
  );
}

function EditApplicationProfile({
  application,
  onSaved,
}: {
  application: ProductApplication;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      await api(`/v1/product-engineering/applications/${application.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          description: String(form.get("description") || "") || null,
          problemStatement: String(form.get("problemStatement") || "") || null,
          targetUsers: String(form.get("targetUsers") || "") || null,
          valueProposition: String(form.get("valueProposition") || "") || null,
          applicationType: String(
            form.get("applicationType") || "web_application",
          ),
          owner: String(form.get("owner") || "") || null,
          productStage: String(form.get("productStage") || "not_productized"),
          status: String(form.get("status") || "active"),
          businessModel: String(form.get("businessModel") || "") || null,
          targetPlatforms: form.getAll("targetPlatforms"),
          frontendUrl: String(form.get("frontendUrl") || "") || null,
          backendUrl: String(form.get("backendUrl") || "") || null,
          documentationUrl: String(form.get("documentationUrl") || "") || null,
        }),
      });
      await onSaved();
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof AppApiError
          ? caught.code
          : "application_update_failed",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open)
    return (
      <CcButton onClick={() => setOpen(true)}>
        Edit application profile
      </CcButton>
    );
  return (
    <section className="rounded-company border border-primary/30 bg-base-100 p-5 md:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black">Application profile</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {error ? <CcNotice tone="error" title={error} /> : null}
      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <label className="form-control">
          <span className="label-text font-bold">Name</span>
          <input
            className="input input-bordered"
            name="name"
            defaultValue={application.name}
            required
          />
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Application type</span>
          <select
            className="select select-bordered"
            name="applicationType"
            defaultValue={application.applicationType}
          >
            {applicationTypes.map((type) => (
              <option key={type} value={type}>
                {humanize(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control md:col-span-2">
          <span className="label-text font-bold">Description</span>
          <textarea
            className="textarea textarea-bordered"
            name="description"
            defaultValue={application.description || ""}
          ></textarea>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Problem statement</span>
          <textarea
            className="textarea textarea-bordered"
            name="problemStatement"
            defaultValue={application.problemStatement || ""}
          ></textarea>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Value proposition</span>
          <textarea
            className="textarea textarea-bordered"
            name="valueProposition"
            defaultValue={application.valueProposition || ""}
          ></textarea>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Target users</span>
          <textarea
            className="textarea textarea-bordered"
            name="targetUsers"
            defaultValue={application.targetUsers || ""}
          ></textarea>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Owner</span>
          <input
            className="input input-bordered"
            name="owner"
            defaultValue={application.owner || ""}
          />
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Product lifecycle</span>
          <select
            className="select select-bordered"
            name="productStage"
            defaultValue={application.productStage}
          >
            {productStages.map((stage) => (
              <option key={stage} value={stage}>
                {humanize(stage)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Operating status</span>
          <select
            className="select select-bordered"
            name="status"
            defaultValue={application.status}
          >
            {applicationStatuses.map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control md:col-span-2">
          <span className="label-text font-bold">Business model</span>
          <input
            className="input input-bordered"
            name="businessModel"
            defaultValue={application.businessModel || ""}
          />
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Frontend URL</span>
          <input
            className="input input-bordered"
            name="frontendUrl"
            type="url"
            defaultValue={application.frontendUrl || ""}
          />
        </label>
        <label className="form-control">
          <span className="label-text font-bold">Backend URL</span>
          <input
            className="input input-bordered"
            name="backendUrl"
            type="url"
            defaultValue={application.backendUrl || ""}
          />
        </label>
        <label className="form-control md:col-span-2">
          <span className="label-text font-bold">Documentation URL</span>
          <input
            className="input input-bordered"
            name="documentationUrl"
            defaultValue={application.documentationUrl || ""}
          />
        </label>
        <fieldset className="md:col-span-2">
          <legend className="font-bold">Target platforms</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {applicationPlatforms.map((platform) => (
              <label className="label cursor-pointer gap-2" key={platform}>
                <input
                  className="checkbox checkbox-sm"
                  type="checkbox"
                  name="targetPlatforms"
                  value={platform}
                  defaultChecked={application.targetPlatforms.includes(
                    platform,
                  )}
                />
                <span>{humanize(platform)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="md:col-span-2">
          <CcButton disabled={saving} type="submit">
            {saving ? "Saving…" : "Save application profile"}
          </CcButton>
        </div>
      </form>
    </section>
  );
}

function CapabilityMatrix({
  application,
  capabilities,
  catalog,
  onRefresh,
}: {
  application: ProductApplication;
  capabilities: ApplicationCapability[];
  catalog: ProductEngineeringCatalog | null;
  onRefresh: () => Promise<void>;
}) {
  const [domain, setDomain] = useState("all");
  const [gapOnly, setGapOnly] = useState(false);
  const [selected, setSelected] = useState<ApplicationCapability | null>(null);
  const assignedIds = new Set(
    capabilities.map((item) => item.capabilityDefinition.id),
  );
  const definitions =
    catalog?.domains.flatMap((domain) =>
      domain.capabilities
        .filter((item) => !assignedIds.has(item.id))
        .map((capability) => ({ capability, domainName: domain.name })),
    ) || [];
  const rows = capabilities.filter(
    (item) =>
      (domain === "all" || item.capabilityDefinition.domain.key === domain) &&
      (!gapOnly || !["complete", "verified"].includes(item.observedState)),
  );

  useEffect(() => {
    if (selected)
      setSelected(capabilities.find((item) => item.id === selected.id) || null);
  }, [capabilities, selected?.id]);

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(
      `/v1/product-engineering/applications/${application.id}/capabilities`,
      {
        method: "POST",
        body: JSON.stringify({
          capabilityDefinitionId: form.get("capabilityDefinitionId"),
          applicability: form.get("applicability"),
          priority: Number(form.get("priority") || 50),
        }),
      },
    );
    formElement.reset();
    await onRefresh();
  }

  async function recordObserved(
    capability: ApplicationCapability,
    observedState: string,
  ) {
    await api(
      `/v1/product-engineering/applications/${application.id}/observations`,
      {
        method: "POST",
        body: JSON.stringify({
          applicationCapabilityId: capability.id,
          observedState,
          summary: `Observed state set from Application Cockpit to ${observedState}.`,
          source: "human",
        }),
      },
    );
    await onRefresh();
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(
      `/v1/product-engineering/applications/${application.id}/evidence`,
      {
        method: "POST",
        body: JSON.stringify({
          applicationCapabilityId: selected.id,
          type: form.get("type"),
          reference: form.get("reference"),
          description: form.get("description") || undefined,
          source: "human",
        }),
      },
    );
    formElement.reset();
    await onRefresh();
  }

  async function verifyEvidence(evidenceId: string) {
    await api(`/v1/product-engineering/evidence/${evidenceId}/actions/verify`, {
      method: "POST",
      body: JSON.stringify({ status: "verified" }),
    });
    await onRefresh();
  }

  return (
    <div className="grid gap-5">
      <form
        className="grid gap-3 rounded-company border border-base-300 bg-base-200/35 p-4 md:grid-cols-[1fr_auto_auto_auto]"
        onSubmit={assign}
      >
        <select
          className="select select-bordered"
          name="capabilityDefinitionId"
          required
        >
          <option value="">Assign capability…</option>
          {definitions.map(({ capability, domainName }) => (
            <option key={capability.id} value={capability.id}>
              {domainName} / {capability.name}
            </option>
          ))}
        </select>
        <select className="select select-bordered" name="applicability">
          <option value="required">Required</option>
          <option value="recommended">Recommended</option>
          <option value="optional">Optional</option>
          <option value="not_applicable">Not applicable</option>
        </select>
        <input
          className="input input-bordered w-24"
          name="priority"
          type="number"
          min="0"
          max="100"
          defaultValue="50"
          aria-label="Priority"
        />
        <CcButton type="submit">Assign</CcButton>
      </form>
      <div className="flex flex-wrap gap-3">
        <select
          className="select select-bordered select-sm"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
        >
          <option value="all">All domains</option>
          {catalog?.domains.map((item) => (
            <option key={item.id} value={item.key}>
              {item.name}
            </option>
          ))}
        </select>
        <label className="label cursor-pointer gap-2">
          <input
            className="checkbox checkbox-sm"
            type="checkbox"
            checked={gapOnly}
            onChange={(event) => setGapOnly(event.target.checked)}
          />
          <span>Only gaps</span>
        </label>
      </div>
      <div className="overflow-x-auto rounded-company border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Applicability</th>
              <th>Target</th>
              <th>Observed</th>
              <th>Evidence</th>
              <th>Blocked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                className="cursor-pointer hover"
                key={item.id}
                onClick={() => setSelected(item)}
              >
                <td>
                  <strong>{item.capabilityDefinition.name}</strong>
                  <br />
                  <span className="text-xs text-company-muted">
                    {item.capabilityDefinition.domain.name}
                  </span>
                </td>
                <td>{humanize(item.applicability)}</td>
                <td>{humanize(item.targetState)}</td>
                <td>
                  <select
                    className="select select-bordered select-sm"
                    value={item.observedState}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      void recordObserved(item, event.target.value)
                    }
                  >
                    {observedStates.map((state) => (
                      <option key={state} value={state}>
                        {humanize(state)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{item.evidence.length}</td>
                <td>
                  {item.dependenciesFrom.some(
                    (dependency) =>
                      dependency.required &&
                      !["complete", "verified"].includes(
                        dependency.toCapability.observedState,
                      ),
                  ) ? (
                    <span className="badge badge-error">Yes</span>
                  ) : (
                    "No"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <section className="rounded-company border border-primary/25 bg-base-100 p-5">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">
                Capability detail
              </p>
              <h3 className="text-xl font-black">
                {selected.capabilityDefinition.name}
              </h3>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm text-company-muted">
                {selected.capabilityDefinition.description ||
                  "No definition description."}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-bold">Lifecycle</dt>
                  <dd>{humanize(selected.lifecycleStatus)}</dd>
                </div>
                <div>
                  <dt className="font-bold">Strategy</dt>
                  <dd>{humanize(selected.implementationStrategy)}</dd>
                </div>
                <div>
                  <dt className="font-bold">Target</dt>
                  <dd>{humanize(selected.targetState)}</dd>
                </div>
                <div>
                  <dt className="font-bold">Observed</dt>
                  <dd>{humanize(selected.observedState)}</dd>
                </div>
              </dl>
              <h4 className="mt-5 font-black">Definition of Done dimensions</h4>
              <div className="mt-2 grid gap-2">
                {selected.dimensions.map((dimension) => (
                  <div
                    className="flex justify-between rounded-company bg-base-200 p-2 text-sm"
                    key={dimension.id}
                  >
                    <span>{dimension.name}</span>
                    <span>{humanize(dimension.observedState)}</span>
                  </div>
                ))}
                {!selected.dimensions.length ? (
                  <p className="text-sm text-company-muted">
                    No explicit dimensions yet.
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <h4 className="font-black">Evidence</h4>
              <div className="mt-2 grid gap-2">
                {selected.evidence.map((evidence) => (
                  <div
                    className="rounded-company border border-base-300 p-3"
                    key={evidence.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{humanize(evidence.type)}</strong>
                      {evidence.verificationStatus === "verified" ? (
                        <span className="badge badge-success">Verified</span>
                      ) : (
                        <button
                          className="btn btn-outline btn-xs"
                          type="button"
                          onClick={() => void verifyEvidence(evidence.id)}
                        >
                          Verify
                        </button>
                      )}
                    </div>
                    <p className="mt-1 break-all text-xs text-company-muted">
                      {evidence.reference}
                    </p>
                  </div>
                ))}
              </div>
              <form className="mt-4 grid gap-2" onSubmit={addEvidence}>
                <select className="select select-bordered" name="type">
                  <option value="source_file">Source file</option>
                  <option value="test">Test</option>
                  <option value="api_endpoint">API endpoint</option>
                  <option value="documentation">Documentation</option>
                  <option value="git_commit">Git commit</option>
                  <option value="deployment">Deployment</option>
                  <option value="manual_verification">
                    Manual verification
                  </option>
                </select>
                <input
                  className="input input-bordered"
                  name="reference"
                  placeholder="Path, endpoint, commit, URL…"
                  required
                />
                <input
                  className="input input-bordered"
                  name="description"
                  placeholder="What does this evidence prove?"
                />
                <CcButton type="submit">Attach evidence</CcButton>
              </form>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CatalogView({
  catalog,
  onRefresh,
}: {
  catalog: ProductEngineeringCatalog | null;
  onRefresh: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  async function createDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api("/v1/product-engineering/capability-definitions", {
        method: "POST",
        body: JSON.stringify({
          domainId: form.get("domainId"),
          readinessDimensionId: form.get("readinessDimensionId") || undefined,
          key: form.get("key"),
          name: form.get("name"),
          description: form.get("description") || undefined,
          universal: form.get("universal") === "on",
          defaultApplicability: form.get("defaultApplicability"),
        }),
      });
      formElement.reset();
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof AppApiError
          ? caught.code
          : "capability_create_failed",
      );
    }
  }
  return (
    <div className="grid gap-5">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <h2 className="text-xl font-black">Capability Library</h2>
        <p className="mt-1 text-sm text-company-muted">
          One reusable definition, many application-specific implementations.
        </p>
        {error ? <CcNotice tone="error" title={error} /> : null}
        <form
          className="mt-4 grid gap-3 md:grid-cols-3"
          onSubmit={createDefinition}
        >
          <input
            className="input input-bordered"
            name="name"
            placeholder="Capability name"
            required
          />
          <input
            className="input input-bordered"
            name="key"
            placeholder="stable-key"
            required
          />
          <select className="select select-bordered" name="domainId" required>
            <option value="">Domain…</option>
            {catalog?.domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
          <select
            className="select select-bordered"
            name="readinessDimensionId"
          >
            <option value="">Readiness follows domain</option>
            {catalog?.dimensions.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.name}
              </option>
            ))}
          </select>
          <select
            className="select select-bordered"
            name="defaultApplicability"
          >
            <option value="recommended">Recommended</option>
            <option value="required">Required</option>
            <option value="optional">Optional</option>
          </select>
          <label className="label cursor-pointer justify-start gap-2">
            <input
              className="checkbox"
              name="universal"
              type="checkbox"
              defaultChecked
            />{" "}
            Universal
          </label>
          <textarea
            className="textarea textarea-bordered md:col-span-2"
            name="description"
            placeholder="Definition"
          ></textarea>
          <CcButton type="submit">Add definition</CcButton>
        </form>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {catalog?.domains.map((domain) => (
          <section
            className="rounded-company border border-base-300 bg-base-100 p-4"
            key={domain.id}
          >
            <div className="flex justify-between">
              <h3 className="font-black">{domain.name}</h3>
              <span className="badge badge-outline">
                {domain.capabilities.length}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {domain.capabilities.map((capability) => (
                <div
                  className="rounded-company bg-base-200/60 p-3"
                  key={capability.id}
                >
                  <strong>{capability.name}</strong>
                  <p className="mt-1 text-xs text-company-muted">
                    {capability.description || capability.key}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-company border border-base-300 bg-base-100 p-4">
          <h3 className="font-black">Capability Packs</h3>
          {catalog?.packs.map((pack) => (
            <div className="mt-3 rounded-company bg-base-200 p-3" key={pack.id}>
              <strong>{pack.name}</strong>
              <p className="text-xs text-company-muted">
                {pack.items.length} capabilities
              </p>
            </div>
          ))}
        </section>
        <section className="rounded-company border border-base-300 bg-base-100 p-4">
          <h3 className="font-black">Application Blueprints</h3>
          {catalog?.blueprints.map((blueprint) => (
            <div
              className="mt-3 rounded-company bg-base-200 p-3"
              key={blueprint.id}
            >
              <strong>{blueprint.name}</strong>
              <p className="text-xs text-company-muted">
                {blueprint.capabilities.length} baseline capabilities
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export function InnovationRoute() {
  const [portfolio, setPortfolio] = useState<PortfolioPacket | null>(null);
  const [catalog, setCatalog] = useState<ProductEngineeringCatalog | null>(
    null,
  );
  const [selected, setSelected] = useState<ProductApplication | null>(null);
  const [capabilities, setCapabilities] = useState<ApplicationCapability[]>([]);
  const [gaps, setGaps] = useState<ProductGap[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [view, setView] = useState<CockpitView>("overview");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const loadBase = useCallback(async () => {
    try {
      const [portfolioResponse, catalogResponse] = await Promise.all([
        api<{ data: PortfolioPacket }>("/v1/product-engineering/portfolio"),
        api<{ data: ProductEngineeringCatalog }>(
          "/v1/product-engineering/catalog",
        ),
      ]);
      setPortfolio(portfolioResponse.data);
      setCatalog(catalogResponse.data);
      setStatus("ready");
    } catch (caught) {
      setError(
        caught instanceof AppApiError ? caught.code : "innovation_load_failed",
      );
      setStatus("error");
    }
  }, []);

  const loadCockpit = useCallback(async (applicationId: string) => {
    const [applicationResponse, mapResponse, gapResponse, readinessResponse] =
      await Promise.all([
        api<{ data: ProductApplication }>(
          `/v1/product-engineering/applications/${applicationId}`,
        ),
        api<{ data: { capabilities: ApplicationCapability[] } }>(
          `/v1/product-engineering/applications/${applicationId}/capability-map`,
        ),
        api<{ data: { gaps: ProductGap[] } }>(
          `/v1/product-engineering/applications/${applicationId}/gaps`,
        ),
        api<{ data: { readiness: Readiness } }>(
          `/v1/product-engineering/applications/${applicationId}/readiness`,
        ),
      ]);
    setSelected(applicationResponse.data);
    setCapabilities(mapResponse.data.capabilities);
    setGaps(gapResponse.data.gaps);
    setReadiness(readinessResponse.data.readiness);
  }, []);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);
  const refreshAll = useCallback(async () => {
    await loadBase();
    if (selected) await loadCockpit(selected.id);
  }, [loadBase, loadCockpit, selected]);
  const dimensions = useMemo(() => readiness?.dimensions || [], [readiness]);

  async function updateStage(stage: string) {
    if (!selected) return;
    await api(`/v1/product-engineering/applications/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify({ innovationStage: stage }),
    });
    await refreshAll();
  }

  async function addArchitecture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(
      `/v1/product-engineering/applications/${selected.id}/architecture`,
      {
        method: "POST",
        body: JSON.stringify({
          type: form.get("type"),
          name: form.get("name"),
          description: form.get("description") || undefined,
        }),
      },
    );
    formElement.reset();
    await loadCockpit(selected.id);
  }

  async function addInterface(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(
      `/v1/product-engineering/applications/${selected.id}/interfaces`,
      {
        method: "POST",
        body: JSON.stringify({
          type: form.get("type"),
          key: form.get("key"),
          name: form.get("name"),
          reference: form.get("reference") || undefined,
          requiresApproval: form.get("requiresApproval") === "on",
          auditRequired: true,
        }),
      },
    );
    formElement.reset();
    await loadCockpit(selected.id);
  }

  return (
    <Shell activeArea="11-innowacje">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-primary">
              11 Innovation · Product Engineering
            </p>
            <h1 className="mt-2 text-3xl font-black text-company-ink">
              Application portfolio and product source of truth
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-company-muted">
              Define what an application should become, record what was actually
              observed, attach proof, expose gaps, and productize the same
              record without copying it.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline"
              onClick={() => {
                setCatalogOpen(!catalogOpen);
                setSelected(null);
              }}
            >
              {catalogOpen ? "Portfolio" : "Capability Library"}
            </button>
            {!catalogOpen ? (
              <CreateApplicationPanel
                catalog={catalog}
                onCreated={(application) => {
                  void loadBase();
                  void loadCockpit(application.id);
                }}
              />
            ) : null}
          </div>
        </div>
      </section>
      {status === "loading" ? (
        <CcNotice tone="loading" title="Loading application portfolio" />
      ) : null}
      {status === "error" ? (
        <CcNotice tone="error" title={error || "Innovation could not load"} />
      ) : null}
      {catalogOpen ? (
        <CatalogView catalog={catalog} onRefresh={loadBase} />
      ) : selected ? (
        <section className="grid gap-5">
          <div className="rounded-company border border-base-300 bg-base-100 p-5">
            <button
              className="btn btn-ghost btn-sm mb-3"
              onClick={() => setSelected(null)}
            >
              ← Portfolio
            </button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">{selected.name}</h2>
                <p className="mt-2 max-w-3xl text-company-muted">
                  {selected.description ||
                    "Application definition is incomplete."}
                </p>
              </div>
              <div className="grid gap-2">
                <span className="text-xs font-black uppercase text-company-muted">
                  Innovation lifecycle
                </span>
                <select
                  className="select select-bordered"
                  value={selected.innovationStage}
                  onChange={(event) => void updateStage(event.target.value)}
                >
                  {lifecycleStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {humanize(stage)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="tabs tabs-box mt-5 overflow-x-auto">
              {(
                [
                  "overview",
                  "capabilities",
                  "gaps",
                  "architecture",
                  "interfaces",
                  "evidence",
                ] as CockpitView[]
              ).map((item) => (
                <button
                  className={`tab ${view === item ? "tab-active" : ""}`}
                  key={item}
                  onClick={() => setView(item)}
                >
                  {humanize(item)}
                </button>
              ))}
            </div>
          </div>
          {view === "overview" ? (
            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
              <section className="rounded-company border border-base-300 bg-base-100 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-black">Product definition</h3>
                  <EditApplicationProfile
                    application={selected}
                    onSaved={() => loadCockpit(selected.id)}
                  />
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Problem
                    </dt>
                    <dd className="mt-1">
                      {selected.problemStatement || "Not defined"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Value proposition
                    </dt>
                    <dd className="mt-1">
                      {selected.valueProposition || "Not defined"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Target users
                    </dt>
                    <dd className="mt-1">
                      {selected.targetUsers || "Not defined"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Platforms
                    </dt>
                    <dd className="mt-1">
                      {selected.targetPlatforms.map(humanize).join(", ") ||
                        "Not defined"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Product lifecycle
                    </dt>
                    <dd className="mt-1">{humanize(selected.productStage)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-company-muted">
                      Operating status
                    </dt>
                    <dd className="mt-1">{humanize(selected.status)}</dd>
                  </div>
                </dl>
              </section>
              <section className="rounded-company border border-base-300 bg-base-100 p-5">
                <div className="flex justify-between">
                  <h3 className="text-xl font-black">Readiness</h3>
                  <span className="text-2xl font-black text-primary">
                    {readiness?.overall || 0}%
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {dimensions.map((dimension) => (
                    <Meter
                      key={dimension.key}
                      label={dimension.name}
                      value={dimension.score}
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs text-company-muted">
                  Calculated from observed capability state (60%), Definition of
                  Done dimensions (25%), and verified evidence coverage (15%).
                </p>
              </section>
            </div>
          ) : null}
          {view === "capabilities" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <CapabilityMatrix
                application={selected}
                capabilities={capabilities}
                catalog={catalog}
                onRefresh={() => loadCockpit(selected.id)}
              />
            </section>
          ) : null}
          {view === "gaps" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <h3 className="text-xl font-black">What is missing?</h3>
              <div className="mt-4 grid gap-3">
                {gaps.map((gap) => (
                  <article
                    className={`rounded-company border p-4 ${gap.blocked ? "border-error/50 bg-error/5" : "border-base-300"}`}
                    key={gap.id}
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <strong>{gap.name}</strong>
                        <p className="text-xs text-company-muted">
                          {gap.domain.name} · Target {humanize(gap.targetState)}{" "}
                          · Observed {humanize(gap.observedState)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`badge ${gap.severity === "blocker" ? "badge-error" : "badge-warning"}`}
                        >
                          {humanize(gap.severity)}
                        </span>
                        <span className="badge badge-outline">
                          {gap.evidenceCount} evidence
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
                {!gaps.length ? (
                  <CcNotice tone="success" title="No capability gaps" />
                ) : null}
              </div>
            </section>
          ) : null}
          {view === "architecture" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <h3 className="text-xl font-black">Architecture map</h3>
              <form
                className="mt-4 grid gap-3 md:grid-cols-[auto_1fr_2fr_auto]"
                onSubmit={addArchitecture}
              >
                <select className="select select-bordered" name="type">
                  {architectureTypes.map((type) => (
                    <option key={type} value={type}>
                      {humanize(type)}
                    </option>
                  ))}
                </select>
                <input
                  className="input input-bordered"
                  name="name"
                  placeholder="Component name"
                  required
                />
                <input
                  className="input input-bordered"
                  name="description"
                  placeholder="Responsibility and boundary"
                />
                <CcButton type="submit">Add</CcButton>
              </form>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {selected.architecture?.map((item) => (
                  <article
                    className="rounded-company border border-base-300 p-4"
                    key={item.id}
                  >
                    <span className="badge badge-outline">
                      {humanize(item.type)}
                    </span>
                    <h4 className="mt-2 font-black">{item.name}</h4>
                    <p className="text-sm text-company-muted">
                      {item.description || "No responsibility description."}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {view === "interfaces" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <h3 className="text-xl font-black">
                Human, system and agent interfaces
              </h3>
              <form
                className="mt-4 grid gap-3 md:grid-cols-5"
                onSubmit={addInterface}
              >
                <select className="select select-bordered" name="type">
                  {interfaceTypes.map((type) => (
                    <option key={type} value={type}>
                      {humanize(type)}
                    </option>
                  ))}
                </select>
                <input
                  className="input input-bordered"
                  name="key"
                  placeholder="stable-key"
                  required
                />
                <input
                  className="input input-bordered"
                  name="name"
                  placeholder="Interface / operation"
                  required
                />
                <input
                  className="input input-bordered"
                  name="reference"
                  placeholder="Route, topic or command"
                />
                <CcButton type="submit">Add</CcButton>
                <label className="label cursor-pointer justify-start gap-2 md:col-span-5">
                  <input
                    className="checkbox checkbox-sm"
                    name="requiresApproval"
                    type="checkbox"
                  />{" "}
                  Requires approval
                </label>
              </form>
              <div className="mt-5 overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Interface</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Approval</th>
                      <th>Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.interfaces?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{humanize(item.type)}</td>
                        <td>{item.reference || "-"}</td>
                        <td>{item.requiresApproval ? "Required" : "No"}</td>
                        <td>{item.auditRequired ? "Required" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {view === "evidence" ? (
            <section className="rounded-company border border-base-300 bg-base-100 p-5">
              <h3 className="text-xl font-black">
                Application evidence ledger
              </h3>
              <p className="mt-2 text-company-muted">
                Evidence is attached in capability detail. Verification remains
                a separate audited action and never promotes observed state
                automatically.
              </p>
              <div className="mt-4 grid gap-2">
                {capabilities.flatMap((capability) =>
                  capability.evidence.map((evidence) => (
                    <article
                      className="rounded-company border border-base-300 p-3"
                      key={evidence.id}
                    >
                      <div className="flex justify-between gap-3">
                        <strong>{capability.capabilityDefinition.name}</strong>
                        <span className="badge badge-outline">
                          {humanize(evidence.verificationStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-company-muted">
                        {humanize(evidence.type)} · {evidence.reference}
                      </p>
                    </article>
                  )),
                )}
              </div>
            </section>
          ) : null}
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {portfolio
              ? Object.entries({
                  Applications: portfolio.summary.applications,
                  "Active development": portfolio.summary.activeDevelopment,
                  Prototypes: portfolio.summary.prototypes,
                  Productization: portfolio.summary.productization,
                  Products: portfolio.summary.products,
                  "Average readiness": `${portfolio.summary.averageReadiness}%`,
                }).map(([label, value]) => (
                  <article
                    className="rounded-company border border-base-300 bg-base-100 p-4"
                    key={label}
                  >
                    <p className="text-2xl font-black text-company-ink">
                      {value}
                    </p>
                    <p className="mt-1 text-xs font-bold text-company-muted">
                      {label}
                    </p>
                  </article>
                ))
              : null}
          </section>
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {portfolio?.applications.map((application) => (
              <ApplicationCard
                application={application}
                key={application.id}
                onOpen={() => {
                  setCatalogOpen(false);
                  setView("overview");
                  void loadCockpit(application.id);
                }}
              />
            ))}
            {portfolio && !portfolio.applications.length ? (
              <div className="lg:col-span-3">
                <CcNotice
                  tone="empty"
                  title="No applications defined"
                  detail="Create Roost, Soar, Featherly, Nest or Aviary to begin building the product source of truth."
                />
              </div>
            ) : null}
          </section>
        </>
      )}
    </Shell>
  );
}
