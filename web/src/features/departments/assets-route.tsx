import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcResourceSelector, type CcResourceSelectorGroup } from "../../components/cc-resource-selector";
import { CcTextInput } from "../../components/cc-text-input";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage, type Translate } from "../../i18n/i18n";
import { AssetResource, AssetsPacket, CoreAreaKey } from "../../types";
import { SummaryGrid } from "./shared";
import { coreAreas } from "./core-area-data";
import { backendAreaToDepartmentKey, departmentLabel } from "./department-labels";

type AssetsView = "overview" | "files";
type AssetKindFilter = "all" | "folders" | "files";
type AssetTypeFilter = "all" | "folder" | "markdown" | "csv" | "json" | "image" | "pdf" | "text" | "unsupported";
type AssetSort = "name" | "modified" | "type" | "source";

function currentAssetsView(): AssetsView {
  return new URLSearchParams(window.location.search).get("view") === "files" ? "files" : "overview";
}

function sourceRecord(resource: AssetResource) {
  return resource.source && typeof resource.source === "object" ? resource.source : null;
}

function sourceProvider(resource: AssetResource) {
  const source = sourceRecord(resource);
  if (source?.provider) return source.provider;
  return typeof resource.source === "string" ? resource.source : "CompanyCore";
}

function sourceLink(resource: AssetResource) {
  return sourceRecord(resource)?.webViewLink || resource.webViewLink || null;
}

function sourceContentLink(resource: AssetResource) {
  return sourceRecord(resource)?.webContentLink || sourceRecord(resource)?.thumbnailLink || null;
}

function sourceExternalId(resource: AssetResource) {
  return sourceRecord(resource)?.externalId || null;
}

function sourceParentExternalId(resource: AssetResource) {
  return sourceRecord(resource)?.parentExternalId || null;
}

function isFolder(resource: AssetResource) {
  return Boolean(sourceRecord(resource)?.isFolder || resource.resourceType === "folder" || resource.type === "folder");
}

function resourceType(resource: AssetResource) {
  return resource.resourceType || resource.type || "resource";
}

function resourceSummary(resource: AssetResource) {
  return resource.aiCompatibility?.contentSnapshot?.summary
    || resource.aiCompatibility?.summary
    || resource.aiCompatibility?.contentSnapshot?.previewText
    || resource.organization?.folder
    || resource.organization?.knowledgeRoot
    || "";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function departmentForResource(resource: AssetResource): CoreAreaKey | "unassigned" {
  return resource.organization?.departmentCanonical
    || backendAreaToDepartmentKey(resource.organization?.department)
    || backendAreaToDepartmentKey(resource.relations?.operatingArea?.key)
    || "unassigned";
}

function resourceIcon(resource: AssetResource) {
  const type = resourceType(resource);
  if (isFolder(resource)) return "ph-folder";
  if (type === "csv") return "ph-table";
  if (type === "json") return "ph-brackets-curly";
  if (type === "pdf") return "ph-file-pdf";
  if (type === "spreadsheet") return "ph-table";
  if (type === "image" || type === "brand_asset") return "ph-image";
  if (type === "video") return "ph-video";
  if (type === "repository") return "ph-git-branch";
  if (type === "contract") return "ph-file-lock";
  if (type === "architecture_doc" || type === "api_reference" || type === "deployment_doc") return "ph-file-code";
  return "ph-file-text";
}

function resourceIconTone(resource: AssetResource) {
  const kind = previewKind(resource);
  if (kind === "folder") return "text-primary";
  if (kind === "image") return "text-accent";
  if (kind === "pdf") return "text-error";
  if (kind === "csv") return "text-success";
  if (kind === "json") return "text-warning";
  if (kind === "markdown" || kind === "text") return "text-info";
  return "text-company-muted";
}

function resourceKindLabel(resource: AssetResource, t: Translate) {
  const kind = previewKind(resource);
  if (kind === "folder") return t("assets.folder");
  if (kind === "markdown") return t("assets.preview.markdown");
  if (kind === "csv") return t("assets.preview.csv");
  if (kind === "json") return t("assets.preview.json");
  if (kind === "image") return t("assets.preview.image");
  if (kind === "pdf") return t("assets.preview.pdf");
  if (kind === "text") return t("assets.preview.text");
  return resourceType(resource);
}

function compareAssets(left: AssetResource, right: AssetResource, sort: AssetSort) {
  if (sort === "modified") {
    const leftTime = left.freshness?.modifiedTime ? new Date(left.freshness.modifiedTime).getTime() : 0;
    const rightTime = right.freshness?.modifiedTime ? new Date(right.freshness.modifiedTime).getTime() : 0;
    return rightTime - leftTime || left.name.localeCompare(right.name);
  }
  if (sort === "type") {
    return resourceType(left).localeCompare(resourceType(right)) || left.name.localeCompare(right.name);
  }
  if (sort === "source") {
    return sourceProvider(left).localeCompare(sourceProvider(right)) || left.name.localeCompare(right.name);
  }
  return left.name.localeCompare(right.name);
}

function previewKind(resource: AssetResource) {
  const type = resourceType(resource);
  const contentKind = resource.aiCompatibility?.contentSnapshot?.contentKind || "";
  const mimeType = sourceRecord(resource)?.mimeType || "";
  const name = resource.name.toLowerCase();

  if (isFolder(resource)) return "folder";
  if (type === "image" || mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return "image";
  if (type === "pdf" || mimeType.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (type === "csv" || type === "spreadsheet" || contentKind === "csv" || contentKind === "google_sheet") return "csv";
  if (type === "json" || contentKind === "json" || mimeType.includes("json") || name.endsWith(".json")) return "json";
  if (type === "markdown" || contentKind === "markdown" || name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  if (contentKind === "plain_text" || mimeType.startsWith("text/") || name.endsWith(".txt")) return "text";
  return "unsupported";
}

function isEditableTextResource(resource: AssetResource) {
  const kind = previewKind(resource);
  const mimeType = sourceRecord(resource)?.mimeType || "";
  return Boolean(resource.sourceId)
    && ["markdown", "csv", "json", "text"].includes(kind)
    && !mimeType.startsWith("application/vnd.google-apps.");
}

function csvRowsFromResource(resource: AssetResource) {
  const structured = resource.aiCompatibility?.contentSnapshot?.structuredPreview;
  if (structured && typeof structured === "object" && !Array.isArray(structured)) {
    const values = (structured as { values?: unknown; rows?: unknown }).values ?? (structured as { rows?: unknown }).rows;
    if (Array.isArray(values)) {
      return values
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) => row.map((cell) => String(cell ?? "")));
    }
  }

  const text = resource.aiCompatibility?.contentSnapshot?.previewText || "";
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 80)
    .map((row) => row.includes("|")
      ? row.split("|").map((cell) => cell.trim())
      : row.split(",").map((cell) => cell.trim()));
}

function prettyJson(resource: AssetResource) {
  const structured = resource.aiCompatibility?.contentSnapshot?.structuredPreview;
  if (structured && structured !== null) {
    try {
      return JSON.stringify(structured, null, 2);
    } catch {
      // fall through to raw text
    }
  }

  const text = resource.aiCompatibility?.contentSnapshot?.previewText || "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

type FolderTreeNode = {
  resource: AssetResource;
  externalId: string;
  parentExternalId: string | null;
  children: FolderTreeNode[];
  files: AssetResource[];
};

function buildFolderTree(resources: AssetResource[]) {
  const folders = resources.filter(isFolder).filter((resource) => sourceExternalId(resource));
  const folderByExternalId = new Map<string, AssetResource>();
  const nodes = new Map<string, FolderTreeNode>();

  folders.forEach((folder) => {
    const externalId = sourceExternalId(folder);
    if (!externalId) return;
    folderByExternalId.set(externalId, folder);
    nodes.set(externalId, {
      resource: folder,
      externalId,
      parentExternalId: sourceParentExternalId(folder),
      children: [],
      files: []
    });
  });

  const roots: FolderTreeNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentExternalId ? nodes.get(node.parentExternalId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  resources.filter((resource) => !isFolder(resource)).forEach((resource) => {
    const parentExternalId = sourceParentExternalId(resource);
    const parent = parentExternalId ? nodes.get(parentExternalId) : null;
    if (parent) parent.files.push(resource);
  });

  function sortNode(node: FolderTreeNode) {
    node.children.sort((left, right) => left.resource.name.localeCompare(right.resource.name));
    node.files.sort((left, right) => left.name.localeCompare(right.name));
    node.children.forEach(sortNode);
  }

  roots.sort((left, right) => left.resource.name.localeCompare(right.resource.name));
  roots.forEach(sortNode);

  return { roots, nodes, folderByExternalId };
}

function collectFolderTreeIds(node: FolderTreeNode) {
  return [node.externalId, ...node.children.flatMap(collectFolderTreeIds)];
}

function rootExternalIdForResource(resource: AssetResource, folderByExternalId: Map<string, AssetResource>) {
  let externalId = isFolder(resource) ? sourceExternalId(resource) : sourceParentExternalId(resource);
  const visited = new Set<string>();

  while (externalId) {
    const folder = folderByExternalId.get(externalId);
    if (!folder || visited.has(externalId)) return externalId;
    visited.add(externalId);
    const parentExternalId = sourceParentExternalId(folder);
    if (!parentExternalId || !folderByExternalId.has(parentExternalId)) return externalId;
    externalId = parentExternalId;
  }

  return null;
}

function descendantFolderIds(folder: AssetResource, folderNodes: Map<string, FolderTreeNode>) {
  const externalId = sourceExternalId(folder);
  if (!externalId) return new Set<string>();
  const node = folderNodes.get(externalId);
  return new Set(node ? collectFolderTreeIds(node) : [externalId]);
}

function inheritedDepartment(resource: AssetResource, folderByExternalId: Map<string, AssetResource>) {
  const rootExternalId = rootExternalIdForResource(resource, folderByExternalId);
  const rootFolder = rootExternalId ? folderByExternalId.get(rootExternalId) : null;
  return rootFolder ? departmentForResource(rootFolder) : departmentForResource(resource);
}

function departmentDisplayName(key: CoreAreaKey | "unassigned", t: Translate) {
  return key === "unassigned" ? t("state.unassigned") : departmentLabel(key, t);
}

function resourcePath(resource: AssetResource, folderByExternalId: Map<string, AssetResource>) {
  const parts = [resource.name];
  let parentExternalId = isFolder(resource) ? sourceParentExternalId(resource) : sourceParentExternalId(resource);
  const visited = new Set<string>();

  while (parentExternalId && !visited.has(parentExternalId)) {
    visited.add(parentExternalId);
    const parent = folderByExternalId.get(parentExternalId);
    if (!parent) break;
    parts.unshift(parent.name);
    parentExternalId = sourceParentExternalId(parent);
  }

  return parts;
}

function AssetsOverview({ packet }: { packet: AssetsPacket | null }) {
  const { t } = useLanguage();
  return (
    <section className="grid gap-4">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">{t("areas.08.label")}</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{t("assets.title")}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("assets.description")}</p>
      </section>
      <SummaryGrid summary={packet?.summary} />
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-company-ink">{t("assets.filesFoldersTitle")}</h2>
            <p className="mt-1 text-sm text-company-muted">{t("assets.filesFoldersDescription")}</p>
          </div>
          <CcButton href="/areas?area=08-zasoby&view=files" iconLeft="ph-folders" variant="primary">{t("assets.openFiles")}</CcButton>
        </div>
      </section>
    </section>
  );
}

function RootFolderSelector({
  roots,
  selectedRootIds,
  setSelectedRootIds,
  onEditFolder
}: {
  roots: FolderTreeNode[];
  selectedRootIds: string[];
  setSelectedRootIds: (ids: string[]) => void;
  onEditFolder: (folder: AssetResource) => void;
}) {
  const { t } = useLanguage();
  const groups: CcResourceSelectorGroup[] = coreAreas
    .map((area) => {
      const items = roots
        .filter((root) => inheritedDepartment(root.resource, new Map()) === area.key)
        .map((root) => ({
          id: root.externalId,
          title: root.resource.name,
          detail: `${departmentLabel(area.key, t)} - ${root.children.length + root.files.length} ${t("state.resource")}`,
          actionLabel: t("assets.editFolder"),
          actionIcon: "ph-gear-six",
          onAction: () => onEditFolder(root.resource)
        }));
      return {
        id: area.key,
        title: departmentLabel(area.key, t),
        items
      };
    })
    .filter((group) => group.items.length > 0);
  const unassignedItems = roots
    .filter((root) => inheritedDepartment(root.resource, new Map()) === "unassigned")
    .map((root) => ({
      id: root.externalId,
      title: root.resource.name,
      detail: `${t("state.unassigned")} - ${root.children.length + root.files.length} ${t("state.resource")}`,
      actionLabel: t("assets.editFolder"),
      actionIcon: "ph-gear-six",
      onAction: () => onEditFolder(root.resource)
    }));

  return (
    <CcResourceSelector
      allDetail={t("assets.visibleSources", { count: roots.length })}
      allLabel={t("assets.allRootFolders")}
      clearLabel={t("operations.clearLists")}
      emptyLabel={t("assets.noMatchingFolders")}
      groups={groups}
      onSelectedIdsChange={setSelectedRootIds}
      searchLabel={t("assets.searchRootFolders")}
      searchPlaceholder={t("assets.searchRootFolders")}
      selectedIds={selectedRootIds}
      title={t("assets.rootFolderFilter")}
      ungroupedItems={unassignedItems}
      ungroupedTitle={t("operations.unassigned")}
    />
  );
}

function AssetCard({
  resource,
  folderByExternalId,
  selected,
  onSelect
}: {
  resource: AssetResource;
  folderByExternalId: Map<string, AssetResource>;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const department = inheritedDepartment(resource, folderByExternalId);
  const summary = resourceSummary(resource).replace(/\s+/g, " ").trim();
  const thumbnail = previewKind(resource) === "image" ? sourceContentLink(resource) : null;
  return (
    <button className={`roost-file-card grid gap-2 rounded-company border p-3 text-left transition hover:border-primary hover:bg-primary/5 ${selected ? "is-selected border-primary/50 bg-primary/10" : "border-base-300"}`} onClick={onSelect} type="button">
      <div className="flex items-start gap-3">
        {thumbnail ? (
          <img alt="" className="h-10 w-10 shrink-0 rounded-company border border-base-300 object-cover" src={thumbnail} />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-company border border-base-300 bg-base-200/80">
            <i className={`ph-bold ${resourceIcon(resource)} ${resourceIconTone(resource)}`} aria-hidden="true"></i>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <strong className="line-clamp-2 text-sm leading-5 text-company-ink">{resource.name}</strong>
          <span className="mt-1 block truncate text-xs text-company-muted">{resourceKindLabel(resource, t)} - {sourceProvider(resource)}</span>
        </span>
      </div>
      {summary ? <p className="line-clamp-2 text-xs leading-5 text-company-muted">{summary}</p> : null}
      <div className="flex items-center justify-between gap-2 text-xs text-company-muted">
        <span className="truncate">{department === "unassigned" ? t("state.unassigned") : departmentLabel(department, t)}</span>
        <span className="shrink-0">{formatDate(resource.freshness?.modifiedTime)}</span>
      </div>
    </button>
  );
}

function FolderTree({
  roots,
  selectedRootIds,
  selectedResourceId,
  selectedFolderExternalId,
  expandedFolderIds,
  onToggleFolder,
  onSelectResource,
  onSelectFolder,
  onClearFolder,
  onEditFolder
}: {
  roots: FolderTreeNode[];
  selectedRootIds: string[];
  selectedResourceId: string;
  selectedFolderExternalId: string | null;
  expandedFolderIds: Set<string>;
  onToggleFolder: (externalId: string) => void;
  onSelectResource: (resource: AssetResource) => void;
  onSelectFolder: (folder: AssetResource, externalId: string) => void;
  onClearFolder: () => void;
  onEditFolder: (folder: AssetResource) => void;
}) {
  const { t } = useLanguage();
  const selectedRoots = new Set(selectedRootIds);
  const visibleRoots = roots.filter((root) => selectedRoots.has(root.externalId));

  function renderFile(resource: AssetResource, depth: number) {
    const selected = selectedResourceId === resource.id;
    return (
      <button className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-company py-1.5 pr-2 text-left text-sm ${selected ? "bg-primary/10 text-company-ink" : "hover:bg-base-200/70"}`} key={resource.id} onClick={() => onSelectResource(resource)} style={{ paddingLeft: `${0.6 + depth * 0.75}rem` }} type="button">
        <i className={`ph-bold ${resourceIcon(resource)} text-company-muted`} aria-hidden="true"></i>
        <span className="truncate">{resource.name}</span>
      </button>
    );
  }

  function renderNode(node: FolderTreeNode, depth = 0) {
    const selected = selectedFolderExternalId === node.externalId;
    const expanded = expandedFolderIds.has(node.externalId);
    const hasChildren = node.children.length > 0 || node.files.length > 0;
    return (
      <div className="grid gap-1" key={node.externalId}>
        <div className={`grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center rounded-company ${selected ? "bg-primary/10 text-company-ink" : "hover:bg-base-200/70"}`}>
          <button className="grid h-8 place-items-center text-company-muted" disabled={!hasChildren} onClick={() => onToggleFolder(node.externalId)} type="button">
            <i className={`ph-bold ${expanded ? "ph-caret-down" : "ph-caret-right"}`} aria-hidden="true"></i>
          </button>
          <button className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 py-1.5 text-left text-sm" onClick={() => onSelectFolder(node.resource, node.externalId)} style={{ paddingLeft: `${depth * 0.75}rem` }} type="button">
            <i className="ph-bold ph-folder text-primary" aria-hidden="true"></i>
            <span className="truncate font-bold">{node.resource.name}</span>
          </button>
          <button className="grid h-8 place-items-center text-company-muted hover:text-company-ink" aria-label={t("assets.editFolder")} onClick={() => onEditFolder(node.resource)} type="button">
            <i className="ph-bold ph-gear-six" aria-hidden="true"></i>
          </button>
        </div>
        {expanded ? (
          <div className="grid gap-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
            {node.files.map((file) => renderFile(file, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <aside className="roost-work-surface grid content-start gap-3 overflow-y-auto rounded-company p-3 xl:min-h-0">
      <div className="roost-work-panel sticky top-0 z-10 grid gap-2 rounded-company p-2.5 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black uppercase text-company-muted">{t("assets.folderTree")}</span>
          <button className={`btn btn-xs ${selectedFolderExternalId ? "btn-ghost" : "btn-primary"}`} onClick={onClearFolder} type="button">{t("assets.allFolders")}</button>
        </div>
      </div>
      {visibleRoots.length ? <div className="grid gap-1">{visibleRoots.map((root) => renderNode(root))}</div> : (
        <p className="roost-empty-state rounded-company p-3 text-sm text-company-muted">{t("assets.noFolders")}</p>
      )}
    </aside>
  );
}

function FolderEditModal({
  folder,
  allFolders,
  folderNodes,
  onClose,
  onSaved
}: {
  folder: AssetResource;
  allFolders: AssetResource[];
  folderNodes: Map<string, FolderTreeNode>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const currentParent = sourceParentExternalId(folder) || "";
  const knownParentIds = useMemo(() => new Set(allFolders.map(sourceExternalId).filter((id): id is string => Boolean(id))), [allFolders]);
  const currentParentIsManaged = Boolean(currentParent && knownParentIds.has(currentParent));
  const initialParentExternalId = currentParentIsManaged ? currentParent : "";
  const [parentExternalId, setParentExternalId] = useState(initialParentExternalId);
  const [departmentKey, setDepartmentKey] = useState<CoreAreaKey | "unassigned">(departmentForResource(folder));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const excludedFolderIds = descendantFolderIds(folder, folderNodes);
  const canAssignDepartment = parentExternalId === "";
  const folderId = folder.sourceId;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderId) return;

    const form = new FormData(event.currentTarget);
    setSaveState("saving");
    setError("");

    try {
      const parentChanged = parentExternalId !== initialParentExternalId;
      await api(`/v1/assets/folders/${folderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(form.get("name") || "").trim(),
          ...(parentChanged ? { parentExternalId: parentExternalId || null } : {}),
          ...(canAssignDepartment ? { departmentKey: departmentKey === "unassigned" ? null : departmentKey } : {})
        })
      });
      onSaved();
      onClose();
    } catch (saveError) {
      setSaveState("error");
      setError(userErrorMessage(saveError, t));
    } finally {
      setSaveState((current) => current === "saving" ? "idle" : current);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-neutral/55 p-4" role="dialog" aria-modal="true" aria-labelledby="assets-folder-modal-title">
      <form className="roost-work-surface grid max-h-[92vh] w-full max-w-2xl gap-4 overflow-y-auto rounded-company p-5 shadow-2xl" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-primary">{t("assets.folderSettings")}</p>
            <h2 className="mt-1 text-2xl font-black text-company-ink" id="assets-folder-modal-title">{folder.name}</h2>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" aria-label={t("operations.cancel")} onClick={onClose} type="button">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
          </button>
        </div>

        {error ? <CcNotice tone="error" title={error} live /> : null}

        <CcField label={t("assets.folderName")} required>
          {({ id }) => <CcTextInput autoFocus id={id} name="name" defaultValue={folder.name} required />}
        </CcField>

        <label className="form-control">
          <span className="label py-0"><span className="label-text font-bold">{t("assets.parentFolder")}</span></span>
          <select className="select select-bordered" onChange={(event) => setParentExternalId(event.target.value)} value={parentExternalId}>
            <option value="">{t("assets.noParentFolder")}</option>
            {allFolders
              .filter((candidate) => {
                const externalId = sourceExternalId(candidate);
                return externalId && !excludedFolderIds.has(externalId);
              })
              .map((candidate) => {
                const externalId = sourceExternalId(candidate)!;
                return <option key={candidate.id} value={externalId}>{candidate.name}</option>;
              })}
          </select>
          <span className="mt-1 text-xs text-company-muted">
            {currentParent && !currentParentIsManaged ? t("assets.externalParentHint") : t("assets.parentFolderHint")}
          </span>
        </label>

        <label className="form-control">
          <span className="label py-0"><span className="label-text font-bold">{t("assets.departmentAssignment")}</span></span>
          <select className="select select-bordered" disabled={!canAssignDepartment} onChange={(event) => setDepartmentKey(event.target.value as CoreAreaKey | "unassigned")} value={departmentKey}>
            <option value="unassigned">{t("state.unassigned")}</option>
            {coreAreas.map((area) => <option key={area.key} value={area.key}>{departmentLabel(area.key, t)}</option>)}
          </select>
          <span className="mt-1 text-xs text-company-muted">{canAssignDepartment ? t("assets.rootDepartmentHint") : t("assets.inheritedDepartmentHint")}</span>
        </label>

        <div className="flex flex-wrap justify-end gap-2 border-t border-base-300 pt-4">
          <CcButton onClick={onClose} type="button" variant="ghost">{t("operations.cancel")}</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">{t("assets.saveFolder")}</CcButton>
        </div>
      </form>
    </div>
  );
}

function MarkdownPreview({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).slice(0, 260);
  return (
    <article className="roost-file-prose">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) return <h4 key={index}>{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={index}>{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={index}>{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <p className="pl-3" key={index}>- {line.slice(2)}</p>;
        if (!line.trim()) return <div className="h-3" key={index}></div>;
        return <p key={index}>{line}</p>;
      })}
    </article>
  );
}

function CsvPreview({ rows }: { rows: string[][] }) {
  const previewRows = rows.slice(0, 80);
  return (
    <div className="overflow-auto rounded-company border border-base-300">
      <table className="table table-sm w-full min-w-max">
        <tbody>
          {previewRows.map((row, rowIndex) => (
            <tr className={rowIndex === 0 ? "bg-base-200/80 font-bold text-company-ink" : ""} key={rowIndex}>
              {row.slice(0, 12).map((cell, cellIndex) => (
                <td className="max-w-64 truncate" key={`${rowIndex}-${cellIndex}`}>{cell || "-"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FileContentEditor({
  resource,
  onClose,
  onSaved
}: {
  resource: AssetResource;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [content, setContent] = useState(resource.aiCompatibility?.contentSnapshot?.previewText || "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resource.sourceId) return;
    setSaveState("saving");
    setError("");
    try {
      await api(`/v1/google-drive/files/${resource.sourceId}/text-content`, {
        method: "PATCH",
        body: JSON.stringify({ content })
      });
      onSaved();
      onClose();
    } catch (saveError) {
      setSaveState("error");
      setError(userErrorMessage(saveError, t));
    } finally {
      setSaveState((current) => current === "saving" ? "idle" : current);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-neutral/55 p-4" role="dialog" aria-modal="true" aria-labelledby="assets-content-editor-title">
      <form className="roost-work-surface grid max-h-[92vh] w-full max-w-5xl gap-4 overflow-y-auto rounded-company p-5 shadow-2xl" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-primary">{t("assets.contentEditor")}</p>
            <h2 className="mt-1 text-2xl font-black text-company-ink" id="assets-content-editor-title">{resource.name}</h2>
            <p className="mt-1 text-sm text-company-muted">{t("assets.contentEditorHint")}</p>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" aria-label={t("operations.cancel")} onClick={onClose} type="button">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
          </button>
        </div>

        {error ? <CcNotice tone="error" title={error} live /> : null}

        <textarea
          className="textarea textarea-bordered min-h-[55vh] w-full font-mono text-sm leading-6"
          onChange={(event) => setContent(event.target.value)}
          value={content}
        ></textarea>

        <div className="flex flex-wrap justify-end gap-2 border-t border-base-300 pt-4">
          <CcButton onClick={onClose} type="button" variant="ghost">{t("operations.cancel")}</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">{t("assets.saveContent")}</CcButton>
        </div>
      </form>
    </div>
  );
}

function FilePreviewPanel({
  resource,
  folderByExternalId,
  onEditFolder,
  onEditContent
}: {
  resource: AssetResource | null;
  folderByExternalId: Map<string, AssetResource>;
  onEditFolder: (folder: AssetResource) => void;
  onEditContent: (resource: AssetResource) => void;
}) {
  const { t } = useLanguage();
  if (!resource) {
    return <aside className="roost-work-surface rounded-company p-4 xl:col-span-2 2xl:col-span-1"><p className="text-sm text-company-muted">{t("assets.selectResource")}</p></aside>;
  }

  const kind = previewKind(resource);
  const text = resource.aiCompatibility?.contentSnapshot?.previewText || "";
  const imageUrl = sourceContentLink(resource);
  const openUrl = sourceLink(resource);
  const rows = csvRowsFromResource(resource);
  const canEditContent = isEditableTextResource(resource);
  const pathParts = resourcePath(resource, folderByExternalId);

  return (
    <aside className="roost-work-surface grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden rounded-company p-4 xl:col-span-2 2xl:col-span-1">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-company border border-base-300 bg-base-200/80">
            <i className={`ph-bold ${resourceIcon(resource)} ${resourceIconTone(resource)}`} aria-hidden="true"></i>
          </span>
          <div className="min-w-0">
            <h2 className="line-clamp-2 font-black text-company-ink">{resource.name}</h2>
            <p className="mt-1 text-sm text-company-muted">{resourceKindLabel(resource, t)} - {departmentDisplayName(inheritedDepartment(resource, folderByExternalId), t)}</p>
            <nav className="mt-2 flex flex-wrap items-center gap-1 text-xs text-company-muted" aria-label={t("assets.resourcePath")}>
              {pathParts.map((part, index) => (
                <span className="inline-flex min-w-0 items-center gap-1" key={`${part}-${index}`}>
                  {index ? <i className="ph-bold ph-caret-right text-[0.65rem]" aria-hidden="true"></i> : null}
                  <span className={index === pathParts.length - 1 ? "max-w-44 truncate text-company-ink" : "max-w-32 truncate"}>{part}</span>
                </span>
              ))}
            </nav>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {canEditContent ? <CcButton iconLeft="ph-pencil-simple" onClick={() => onEditContent(resource)} size="sm" variant="outline">{t("assets.editContent")}</CcButton> : null}
          {openUrl ? <CcButton href={openUrl} iconLeft="ph-arrow-square-out" rel="noreferrer" size="sm" target="_blank" variant="primary">{t("assets.open")}</CcButton> : null}
        </div>
      </header>

      <div className="roost-file-preview min-h-0 overflow-y-auto rounded-company p-3">
        {kind === "folder" ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <i className="ph-bold ph-folder-open text-4xl text-primary" aria-hidden="true"></i>
              <h3 className="mt-3 font-black text-company-ink">{resource.name}</h3>
              <p className="mt-1 text-sm text-company-muted">{t("assets.folderPreviewHint")}</p>
            </div>
          </div>
        ) : kind === "markdown" && text ? (
          <MarkdownPreview text={text} />
        ) : kind === "csv" && rows.length ? (
          <CsvPreview rows={rows} />
        ) : kind === "json" && (prettyJson(resource) || text) ? (
          <pre className="whitespace-pre-wrap break-words rounded-company bg-base-200/60 p-3 font-mono text-xs leading-6 text-company-ink">{prettyJson(resource)}</pre>
        ) : kind === "text" && text ? (
          <pre className="whitespace-pre-wrap break-words rounded-company bg-base-200/60 p-3 font-mono text-xs leading-6 text-company-ink">{text}</pre>
        ) : kind === "image" && imageUrl ? (
          <div className="grid h-full place-items-center">
            <img alt={resource.name} className="max-h-full max-w-full rounded-company object-contain" src={imageUrl} />
          </div>
        ) : kind === "pdf" && openUrl ? (
          <div className="grid h-full min-h-72 place-items-center text-center">
            <div>
              <i className="ph-bold ph-file-pdf text-4xl text-company-muted" aria-hidden="true"></i>
              <h3 className="mt-3 font-black text-company-ink">{t("assets.pdfPreviewTitle")}</h3>
              <p className="mt-1 text-sm text-company-muted">{t("assets.pdfPreviewDetail")}</p>
              <CcButton className="mt-4" href={openUrl} iconLeft="ph-arrow-square-out" rel="noreferrer" target="_blank" variant="primary">{t("assets.open")}</CcButton>
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-64 place-items-center text-center">
            <div>
              <i className="ph-bold ph-file-search text-4xl text-company-muted" aria-hidden="true"></i>
              <h3 className="mt-3 font-black text-company-ink">{t("assets.noPreviewTitle")}</h3>
              <p className="mt-1 text-sm text-company-muted">{resourceSummary(resource) || t("assets.noPreviewDetail")}</p>
            </div>
          </div>
        )}
      </div>

      <footer className="grid gap-3 border-t border-base-300 pt-3">
        {resource.aiCompatibility?.contentSnapshot?.isTextTruncated ? <p className="text-xs text-company-muted">{t("assets.previewTruncated")}</p> : null}
        <div className="grid gap-2 text-xs text-company-muted sm:grid-cols-2">
          <span>{t("assets.source")}: {sourceProvider(resource)}</span>
          <span>{t("table.status")}: {resource.organization?.status || resource.freshness?.syncStatus || "-"}</span>
          <span>{t("assets.modified")}: {formatDate(resource.freshness?.modifiedTime)}</span>
          <span>{t("assets.pathDepth")}: {Math.max(pathParts.length - 1, 0)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {isFolder(resource) ? <CcButton iconLeft="ph-gear-six" onClick={() => onEditFolder(resource)} variant="outline">{t("assets.editFolder")}</CcButton> : null}
        </div>
      </footer>
    </aside>
  );
}

function AssetsFilesView({ packet, onRefresh }: { packet: AssetsPacket; onRefresh: () => void }) {
  const { t } = useLanguage();
  const resources = packet.resources || [];
  const { roots, nodes: folderNodes, folderByExternalId } = useMemo(() => buildFolderTree(resources), [resources]);
  const rootIds = roots.map((root) => root.externalId);
  const [selectedRootIds, setSelectedRootIds] = useState<string[]>(rootIds);
  const [kindFilter, setKindFilter] = useState<AssetKindFilter>("all");
  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>("all");
  const [sort, setSort] = useState<AssetSort>("name");
  const [query, setQuery] = useState("");
  const [selectedFolderExternalId, setSelectedFolderExternalId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState(resources[0]?.id || "");
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set(rootIds));
  const [editingFolder, setEditingFolder] = useState<AssetResource | null>(null);
  const [editingContent, setEditingContent] = useState<AssetResource | null>(null);

  useEffect(() => {
    setSelectedRootIds((current) => current.length ? current.filter((id) => rootIds.includes(id)) : rootIds);
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      rootIds.forEach((id) => next.add(id));
      return next;
    });
  }, [rootIds.join("|")]);

  const selectedRootSet = useMemo(() => new Set(selectedRootIds), [selectedRootIds]);
  const allFolders = useMemo(() => resources.filter(isFolder), [resources]);
  const hasActiveAssetFilters = query.trim().length > 0
    || kindFilter !== "all"
    || typeFilter !== "all"
    || sort !== "name"
    || Boolean(selectedFolderExternalId)
    || selectedRootIds.length !== rootIds.length;

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources.filter((resource) => {
      const rootExternalId = rootExternalIdForResource(resource, folderByExternalId);
      const rootMatch = roots.length === 0 || (rootExternalId ? selectedRootSet.has(rootExternalId) : selectedRootIds.length === 0);
      const kindMatch = kindFilter === "all" || (kindFilter === "folders" ? isFolder(resource) : !isFolder(resource));
      const typeMatch = typeFilter === "all" || previewKind(resource) === typeFilter;
      const folderMatch = query.trim()
        ? true
        : !selectedFolderExternalId
          || sourceParentExternalId(resource) === selectedFolderExternalId
          || sourceExternalId(resource) === selectedFolderExternalId;
      const textMatch = !normalizedQuery || [resource.name, resourceType(resource), sourceProvider(resource), resourceSummary(resource)].join(" ").toLowerCase().includes(normalizedQuery);
      return rootMatch && kindMatch && typeMatch && folderMatch && textMatch;
    }).sort((left, right) => compareAssets(left, right, sort));
  }, [resources, folderByExternalId, roots.length, selectedRootSet, selectedRootIds.length, kindFilter, typeFilter, query, selectedFolderExternalId, sort]);

  const selectedResource = filteredResources.find((resource) => resource.id === selectedResourceId) || filteredResources[0] || null;
  const selectedFolder = selectedFolderExternalId ? folderByExternalId.get(selectedFolderExternalId) : null;

  function toggleFolder(externalId: string) {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(externalId)) next.delete(externalId);
      else next.add(externalId);
      return next;
    });
  }

  function selectFolder(folder: AssetResource, externalId: string) {
    setSelectedFolderExternalId(externalId);
    setSelectedResourceId(folder.id);
    setExpandedFolderIds((current) => new Set(current).add(externalId));
  }

  function clearAssetFilters() {
    setQuery("");
    setKindFilter("all");
    setTypeFilter("all");
    setSort("name");
    setSelectedFolderExternalId(null);
    setSelectedRootIds(rootIds);
  }

  return (
    <section className="grid gap-4 xl:h-[calc(100vh-12.5rem)] xl:min-h-[34rem] xl:grid-cols-[17rem_minmax(0,1fr)]">
      <RootFolderSelector roots={roots} selectedRootIds={selectedRootIds} setSelectedRootIds={setSelectedRootIds} onEditFolder={setEditingFolder} />
      <div className="grid gap-4 xl:min-h-0 xl:grid-cols-[18rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,0.9fr)_minmax(24rem,0.8fr)]">
        <FolderTree
          expandedFolderIds={expandedFolderIds}
          onEditFolder={setEditingFolder}
          onSelectFolder={selectFolder}
          onClearFolder={() => setSelectedFolderExternalId(null)}
          onSelectResource={(resource) => {
            setSelectedResourceId(resource.id);
            if (!isFolder(resource)) setSelectedFolderExternalId(sourceParentExternalId(resource));
          }}
          onToggleFolder={toggleFolder}
          roots={roots}
          selectedFolderExternalId={selectedFolderExternalId}
          selectedResourceId={selectedResource?.id || ""}
          selectedRootIds={selectedRootIds}
        />

        <main className="roost-work-surface grid gap-3 rounded-company p-3 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-black text-company-ink">{selectedFolder ? selectedFolder.name : t("assets.filesFoldersTitle")}</h1>
                <p className="text-sm text-company-muted">{t("assets.visibleItems", { count: filteredResources.length })}</p>
              </div>
              <div className="join">
                {(["all", "folders", "files"] as AssetKindFilter[]).map((kind) => (
                  <button className={`btn join-item btn-sm ${kindFilter === kind ? "btn-primary" : "btn-outline"}`} key={kind} onClick={() => setKindFilter(kind)} type="button">{t(`assets.kind.${kind}`)}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
              <label className="input input-bordered flex min-w-0 items-center gap-2">
                <i className="ph-bold ph-magnifying-glass text-company-muted" aria-hidden="true"></i>
                <input className="grow" onChange={(event) => setQuery(event.target.value)} placeholder={t("assets.searchPlaceholder")} type="search" value={query} />
              </label>
              <select aria-label={t("assets.typeFilter.label")} className="select select-bordered" onChange={(event) => setTypeFilter(event.target.value as AssetTypeFilter)} value={typeFilter}>
                {(["all", "folder", "markdown", "csv", "json", "image", "pdf", "text", "unsupported"] as AssetTypeFilter[]).map((type) => (
                  <option key={type} value={type}>{t(`assets.typeFilter.${type}`)}</option>
                ))}
              </select>
              <select aria-label={t("assets.sort.label")} className="select select-bordered" onChange={(event) => setSort(event.target.value as AssetSort)} value={sort}>
                <option value="name">{t("assets.sort.name")}</option>
                <option value="modified">{t("assets.sort.modified")}</option>
                <option value="type">{t("assets.sort.type")}</option>
                <option value="source">{t("assets.sort.source")}</option>
              </select>
            </div>
            {hasActiveAssetFilters ? (
              <div className="flex justify-end">
                <CcButton iconLeft="ph-x-circle" onClick={clearAssetFilters} size="sm" variant="ghost">{t("assets.clearFilters")}</CcButton>
              </div>
            ) : null}
          </div>

          <div className="overflow-y-auto xl:min-h-0">
            {filteredResources.length ? (
              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredResources.map((resource) => (
                  <AssetCard folderByExternalId={folderByExternalId} key={resource.id} onSelect={() => setSelectedResourceId(resource.id)} resource={resource} selected={selectedResource?.id === resource.id} />
                ))}
              </div>
            ) : (
              <div className="grid h-full place-items-center rounded-company border border-dashed border-base-300 p-8 text-center">
                <div>
                  <i className="ph-bold ph-folder-open text-3xl text-company-muted" aria-hidden="true"></i>
                  <h2 className="mt-3 font-black text-company-ink">{t(hasActiveAssetFilters ? "assets.noMatchingItems" : "assets.noItems")}</h2>
                  <p className="mt-1 text-sm text-company-muted">{t(hasActiveAssetFilters ? "assets.noMatchingItems.detail" : "assets.noItems.detail")}</p>
                  {hasActiveAssetFilters ? <CcButton className="mt-4" iconLeft="ph-x-circle" onClick={clearAssetFilters} variant="outline">{t("assets.clearFilters")}</CcButton> : null}
                </div>
              </div>
            )}
          </div>
        </main>

        <FilePreviewPanel
          folderByExternalId={folderByExternalId}
          onEditContent={setEditingContent}
          onEditFolder={setEditingFolder}
          resource={selectedResource}
        />

      </div>
      {editingFolder ? <FolderEditModal allFolders={allFolders} folder={editingFolder} folderNodes={folderNodes} onClose={() => setEditingFolder(null)} onSaved={onRefresh} /> : null}
      {editingContent ? <FileContentEditor resource={editingContent} onClose={() => setEditingContent(null)} onSaved={onRefresh} /> : null}
    </section>
  );
}

export function AssetsRoute() {
  const { t } = useLanguage();
  const activeView = currentAssetsView();
  const [refreshKey, setRefreshKey] = useState(0);
  const packet = useOwnerPacket<AssetsPacket>(`/v1/assets/context?areaKey=all&limit=200&refresh=${refreshKey}`, true, t);

  return (
    <Shell activeArea="08-zasoby">
      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("assets.packetError")} live /> : null}

      {packet.status === "ready" && activeView === "files" && packet.data ? <AssetsFilesView packet={packet.data} onRefresh={() => setRefreshKey((current) => current + 1)} /> : null}
      {packet.status === "ready" && activeView === "overview" ? <AssetsOverview packet={packet.data} /> : null}
    </Shell>
  );
}
