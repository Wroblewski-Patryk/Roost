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

function resourceReadiness(resource: AssetResource) {
  if (resource.aiCompatibility?.readiness) return resource.aiCompatibility.readiness;
  if (resource.aiCompatibility?.aiContextReady || resource.aiContextReady) return "ai_context_ready";
  return "metadata_ready";
}

function resourceSummary(resource: AssetResource) {
  return resource.aiCompatibility?.summary || resource.organization?.folder || resource.organization?.knowledgeRoot || "";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function departmentForResource(resource: AssetResource): CoreAreaKey | "unassigned" {
  return backendAreaToDepartmentKey(resource.organization?.department)
    || backendAreaToDepartmentKey(resource.relations?.operatingArea?.key)
    || "unassigned";
}

function resourceIcon(resource: AssetResource) {
  const type = resourceType(resource);
  if (isFolder(resource)) return "ph-folder";
  if (type === "spreadsheet") return "ph-table";
  if (type === "image" || type === "brand_asset") return "ph-image";
  if (type === "video") return "ph-video";
  if (type === "repository") return "ph-git-branch";
  if (type === "contract") return "ph-file-lock";
  if (type === "architecture_doc" || type === "api_reference" || type === "deployment_doc") return "ph-file-code";
  return "ph-file-text";
}

function readinessTone(readiness: string) {
  if (readiness === "ai_context_ready") return "badge-success";
  if (readiness === "relation_ready" || readiness === "summary_ready") return "badge-primary badge-outline";
  if (readiness === "not_indexed") return "badge-warning";
  return "badge-ghost";
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
          detail: `${departmentLabel(area.key, t)} · ${root.children.length + root.files.length} ${t("state.resource")}`,
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
      detail: `${t("state.unassigned")} · ${root.children.length + root.files.length} ${t("state.resource")}`,
      actionLabel: t("assets.editFolder"),
      actionIcon: "ph-gear-six",
      onAction: () => onEditFolder(root.resource)
    }));

  return (
    <CcResourceSelector
      allDetail={t("assets.visibleSources", { count: roots.length })}
      allLabel={t("assets.allRootFolders")}
      clearLabel={t("operations.clearLists")}
      groups={groups}
      onSelectedIdsChange={setSelectedRootIds}
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
  const readiness = resourceReadiness(resource);
  const department = inheritedDepartment(resource, folderByExternalId);
  return (
    <button className={`grid gap-2 rounded-company border p-3 text-left transition hover:border-primary hover:bg-primary/5 ${selected ? "border-primary/50 bg-primary/10" : "border-base-300 bg-base-100"}`} onClick={onSelect} type="button">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-company border border-base-300 bg-base-200 text-company-muted">
          <i className={`ph-bold ${resourceIcon(resource)}`} aria-hidden="true"></i>
        </span>
        <span className="min-w-0 flex-1">
          <strong className="line-clamp-2 text-sm leading-5 text-company-ink">{resource.name}</strong>
          <span className="mt-1 block truncate text-xs text-company-muted">{isFolder(resource) ? t("assets.folder") : resourceType(resource)} · {sourceProvider(resource)}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className={`badge badge-sm ${readinessTone(readiness)}`}>{readiness.replaceAll("_", " ")}</span>
        <span className="badge badge-outline badge-sm">{department === "unassigned" ? t("state.unassigned") : departmentLabel(department, t)}</span>
      </div>
      <span className="truncate text-xs text-company-muted">{formatDate(resource.freshness?.modifiedTime)}</span>
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
  const [parentExternalId, setParentExternalId] = useState(currentParent);
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
      await api(`/v1/assets/folders/${folderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(form.get("name") || "").trim(),
          parentExternalId: parentExternalId || null,
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
          <span className="mt-1 text-xs text-company-muted">{t("assets.parentFolderHint")}</span>
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

function AssetsFilesView({ packet, onRefresh }: { packet: AssetsPacket; onRefresh: () => void }) {
  const { t } = useLanguage();
  const resources = packet.resources || [];
  const { roots, nodes: folderNodes, folderByExternalId } = useMemo(() => buildFolderTree(resources), [resources]);
  const rootIds = roots.map((root) => root.externalId);
  const [selectedRootIds, setSelectedRootIds] = useState<string[]>(rootIds);
  const [kindFilter, setKindFilter] = useState<AssetKindFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedFolderExternalId, setSelectedFolderExternalId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState(resources[0]?.id || "");
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set(rootIds));
  const [editingFolder, setEditingFolder] = useState<AssetResource | null>(null);

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

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources.filter((resource) => {
      const rootExternalId = rootExternalIdForResource(resource, folderByExternalId);
      const rootMatch = roots.length === 0 || (rootExternalId ? selectedRootSet.has(rootExternalId) : selectedRootIds.length === 0);
      const kindMatch = kindFilter === "all" || (kindFilter === "folders" ? isFolder(resource) : !isFolder(resource));
      const folderMatch = query.trim()
        ? true
        : !selectedFolderExternalId
          || sourceParentExternalId(resource) === selectedFolderExternalId
          || sourceExternalId(resource) === selectedFolderExternalId;
      const textMatch = !normalizedQuery || [resource.name, resourceType(resource), sourceProvider(resource), resourceSummary(resource)].join(" ").toLowerCase().includes(normalizedQuery);
      return rootMatch && kindMatch && folderMatch && textMatch;
    });
  }, [resources, folderByExternalId, roots.length, selectedRootSet, selectedRootIds.length, kindFilter, query, selectedFolderExternalId]);

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

  return (
    <section className="grid gap-4 xl:h-[calc(100vh-12.5rem)] xl:min-h-[34rem] xl:grid-cols-[17rem_minmax(0,1fr)]">
      <RootFolderSelector roots={roots} selectedRootIds={selectedRootIds} setSelectedRootIds={setSelectedRootIds} onEditFolder={setEditingFolder} />
      <div className="grid gap-4 xl:min-h-0 xl:grid-cols-[18rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
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
            <label className="input input-bordered flex items-center gap-2">
              <i className="ph-bold ph-magnifying-glass text-company-muted" aria-hidden="true"></i>
              <input className="grow" onChange={(event) => setQuery(event.target.value)} placeholder={t("assets.searchPlaceholder")} type="search" value={query} />
            </label>
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
                  <h2 className="mt-3 font-black text-company-ink">{t("assets.noItems")}</h2>
                  <p className="mt-1 text-sm text-company-muted">{t("assets.noItems.detail")}</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="roost-work-surface overflow-y-auto rounded-company p-4 xl:col-span-2 xl:min-h-0 2xl:col-span-1">
          {selectedResource ? (
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-company border border-base-300 bg-base-200 text-company-muted">
                  <i className={`ph-bold ${resourceIcon(selectedResource)}`} aria-hidden="true"></i>
                </span>
                <div className="min-w-0">
                  <h2 className="line-clamp-3 font-black text-company-ink">{selectedResource.name}</h2>
                  <p className="mt-1 text-sm text-company-muted">{resourceType(selectedResource)} · {sourceProvider(selectedResource)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className={`badge badge-sm ${readinessTone(resourceReadiness(selectedResource))}`}>{resourceReadiness(selectedResource).replaceAll("_", " ")}</span>
                <span className="badge badge-outline badge-sm">{selectedResource.organization?.visibility || "workspace"}</span>
                {selectedResource.freshness?.needsCleanup ? <span className="badge badge-warning badge-sm">{t("assets.needsCleanup")}</span> : null}
              </div>

              {resourceSummary(selectedResource) ? <p className="rounded-company border border-base-300 bg-base-200/50 p-3 text-sm leading-6 text-company-muted">{resourceSummary(selectedResource)}</p> : null}

              <dl className="grid gap-3 text-sm">
                <div><dt className="font-bold text-company-muted">{t("table.source")}</dt><dd>{sourceProvider(selectedResource)}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("table.status")}</dt><dd>{selectedResource.organization?.status || selectedResource.freshness?.syncStatus || "-"}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("assets.departmentAssignment")}</dt><dd>{departmentDisplayName(inheritedDepartment(selectedResource, folderByExternalId), t)}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("table.readiness")}</dt><dd>{resourceReadiness(selectedResource).replaceAll("_", " ")}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("assets.modified")}</dt><dd>{formatDate(selectedResource.freshness?.modifiedTime)}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("assets.folder")}</dt><dd>{selectedResource.organization?.folder || "-"}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("assets.knowledgeRoot")}</dt><dd>{selectedResource.organization?.knowledgeRoot || "-"}</dd></div>
              </dl>

              <div className="flex flex-wrap gap-2">
                {isFolder(selectedResource) ? <CcButton iconLeft="ph-gear-six" onClick={() => setEditingFolder(selectedResource)} variant="outline">{t("assets.editFolder")}</CcButton> : null}
                {sourceLink(selectedResource) ? <CcButton href={sourceLink(selectedResource) || undefined} iconLeft="ph-arrow-square-out" rel="noreferrer" target="_blank" variant="primary">{t("assets.open")}</CcButton> : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-company-muted">{t("assets.selectResource")}</p>
          )}
        </aside>
      </div>
      {editingFolder ? <FolderEditModal allFolders={allFolders} folder={editingFolder} folderNodes={folderNodes} onClose={() => setEditingFolder(null)} onSaved={onRefresh} /> : null}
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
