import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { UnifiedGraph3D, type UnifiedGraphEdge, type UnifiedGraphNode } from "../../components/graph/unified-graph-3d";
import { humanizeBusinessValue } from "./shared";
import type {
  ApplicationGraphMode,
  ApplicationGraphNode,
  ApplicationGraphPacket
} from "./application-graph-types";
import "./application-graph.css";

type GraphFilters = {
  status: string;
  domain: string;
  requiredOnly: boolean;
  blockedOnly: boolean;
  incompleteOnly: boolean;
  missingEvidenceOnly: boolean;
};

const initialFilters: GraphFilters = {
  status: "all",
  domain: "all",
  requiredOnly: false,
  blockedOnly: false,
  incompleteOnly: false,
  missingEvidenceOnly: false
};

const modes: Array<{ id: ApplicationGraphMode; label: string; icon: string }> = [
  { id: "structure", label: "Structure", icon: "ph-tree-structure" },
  { id: "execution", label: "Execution", icon: "ph-kanban" },
  { id: "progress", label: "Progress", icon: "ph-chart-donut" },
  { id: "dependencies", label: "Dependencies", icon: "ph-git-branch" },
  { id: "agent-ready", label: "Agent Ready", icon: "ph-robot" },
  { id: "productization", label: "Productization", icon: "ph-rocket-launch" }
];

const graphExitDuration = 150;

function iconFor(type: ApplicationGraphNode["type"]) {
  if (type === "portfolio") return "ph-app-window";
  if (type === "application") return "ph-app-window";
  if (type === "domain") return "ph-circles-three-plus";
  if (type === "capability") return "ph-hexagon";
  if (type === "layer") return "ph-stack";
  if (type === "implementation") return "ph-cube";
  if (type === "procedure") return "ph-list-checks";
  if (type === "procedure_step") return "ph-list-numbers";
  if (type === "project") return "ph-kanban";
  if (type === "task_list") return "ph-columns";
  if (type === "task") return "ph-check-square";
  return "ph-diamond";
}

function statusLabel(record: ApplicationGraphNode) {
  if (record.isBlocked) return "Blocked";
  return humanizeBusinessValue(record.status);
}

const branchPalette = ["#8b7cf6", "#2da9e9", "#16b985", "#e6a12a", "#d85b65", "#7d8ba8"];

function branchAccent(record: ApplicationGraphNode) {
  if (record.type === "portfolio") return "#9a8cff";
  const applicationId = record.type === "application"
    ? record.id
    : record.path.find((id) => id.startsWith("application:")) ?? record.id;
  let hash = 0;
  for (const character of applicationId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return branchPalette[hash % branchPalette.length];
}

function mergePackets(portfolio: ApplicationGraphPacket | null, applicationPackets: Map<string, ApplicationGraphPacket>) {
  const nodes = new Map<string, ApplicationGraphNode>();
  const edges = new Map<string, ApplicationGraphPacket["edges"][number]>();
  if (portfolio) {
    portfolio.nodes.forEach((node) => nodes.set(node.id, node));
    portfolio.edges.forEach((edge) => edges.set(edge.id, edge));
  }
  applicationPackets.forEach((packet) => {
    packet.nodes.forEach((node) => nodes.set(node.id, node));
    packet.edges.forEach((edge) => edges.set(edge.id, edge));
  });
  const portfolioRoot = portfolio?.nodes.find((node) => node.id === portfolio.rootNodeId);
  if (portfolioRoot) nodes.set(portfolioRoot.id, portfolioRoot);
  return { nodes: Array.from(nodes.values()), edges: Array.from(edges.values()) };
}

function matchesFilters(node: ApplicationGraphNode, filters: GraphFilters) {
  if (node.type === "portfolio" || node.type === "application") return true;
  if (filters.status !== "all" && node.status !== filters.status) return false;
  if (filters.domain !== "all" && !node.path.includes(filters.domain) && node.id !== filters.domain) return false;
  if (filters.requiredOnly && !node.isRequired) return false;
  if (filters.blockedOnly && !node.isBlocked) return false;
  if (filters.incompleteOnly && node.completeness >= 100) return false;
  if (filters.missingEvidenceOnly && !node.details.missingEvidence) return false;
  return true;
}

function visibleNodeIds(
  allNodes: ApplicationGraphNode[],
  allEdges: ApplicationGraphPacket["edges"],
  focus: ApplicationGraphNode,
  mode: ApplicationGraphMode,
  filters: GraphFilters,
  revealDepth: 1 | 2 | 3 | "all"
) {
  const byId = new Map(allNodes.map((node) => [node.id, node]));
  const visible = new Set<string>(focus.path);
  let frontier = [focus.id];
  const descendants: ApplicationGraphNode[] = [];
  for (let depth = 0; frontier.length && (revealDepth === "all" || depth < revealDepth); depth += 1) {
    const parents = new Set(frontier);
    const children = allNodes
      .filter((node) => node.parentNodeId && parents.has(node.parentNodeId))
      .filter((node) => matchesFilters(node, filters))
      .filter((node) => mode !== "execution" || node.type === "application" || node.tags.includes("execution"))
      .sort((left, right) => Number(right.isBlocked) - Number(left.isBlocked) || left.label.localeCompare(right.label));
    descendants.push(...children);
    children.forEach((node) => visible.add(node.id));
    frontier = children.map((node) => node.id);
  }

  const directChildren = descendants.filter((node) => node.parentNodeId === focus.id);

  if (mode === "dependencies") {
    const anchors = ["capability", "feature", "layer", "implementation"].includes(focus.type)
      ? new Set([focus.id])
      : new Set(directChildren.filter((node) => node.type === "capability" || node.type === "implementation").map((node) => node.id));
    const relatedIds: string[] = [];

    for (const edge of allEdges) {
      if (edge.type === "hierarchy") continue;
      const relatedId = anchors.has(edge.source) ? edge.target : anchors.has(edge.target) ? edge.source : null;
      if (!relatedId || anchors.has(relatedId) || relatedIds.includes(relatedId)) continue;
      const related = byId.get(relatedId);
      if (related && !["portfolio", "application", "domain"].includes(related.type) && matchesFilters(related, filters)) relatedIds.push(relatedId);
    }

    relatedIds.forEach((id) => visible.add(id));
  }

  return visible;
}

function nextLevelLabel(type: ApplicationGraphNode["type"], children: ApplicationGraphNode[]) {
  const count = children.length;
  const labels: Record<ApplicationGraphNode["type"], [string, string]> = {
    portfolio: ["application", "applications"],
    application: ["domain", "domains"],
    domain: ["capability", "capabilities"],
    capability: ["feature", "features"],
    feature: ["layer", "layers"],
    layer: ["atom", "atoms"],
    implementation: ["part", "parts"],
    procedure: ["step", "steps"],
    procedure_step: ["part", "parts"],
    project: ["work item", "work items"],
    task_list: ["task", "tasks"],
    task: ["part", "parts"]
  };
  const childTypes = Array.from(new Set(children.map((child) => child.type)));
  const labelType = childTypes.length === 1 ? childTypes[0] : null;
  const explicitChildLabels: Partial<Record<ApplicationGraphNode["type"], [string, string]>> = {
    application: ["application", "applications"],
    domain: ["domain", "domains"],
    capability: ["capability", "capabilities"],
    feature: ["feature", "features"],
    layer: ["layer", "layers"],
    implementation: ["atom", "atoms"],
    procedure: ["procedure", "procedures"],
    procedure_step: ["step", "steps"],
    project: ["project", "projects"],
    task_list: ["task list", "task lists"],
    task: ["task", "tasks"]
  };
  const nouns = labelType ? explicitChildLabels[labelType] : labels[type];
  return `${count} ${nouns?.[count === 1 ? 0 : 1] ?? (count === 1 ? "record" : "records")}`;
}

function GraphInspector({ node, onClose }: { node: ApplicationGraphNode; onClose: () => void }) {
  const details = node.details;
  return (
    <aside aria-label={`${node.label} details`} className="application-graph-inspector">
      <header className="flex items-start justify-between gap-3 border-b border-base-300 pb-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">{node.category}</p>
          <h2 className="mt-1 text-xl font-black text-company-ink">{node.label}</h2>
          <p className="mt-1 text-sm text-company-muted">{statusLabel(node)} · {node.completeness}% complete</p>
        </div>
        <button aria-label="Close details" className="btn btn-circle btn-ghost btn-sm" onClick={onClose} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button>
      </header>

      <div className="application-graph-inspector__content">
        {details.description ? <p className="text-sm leading-6 text-company-muted">{details.description}</p> : <p className="text-sm text-company-muted">No description has been recorded.</p>}
        <dl className="application-graph-detail-grid">
          {details.owner ? <div><dt>Owner</dt><dd>{details.owner}</dd></div> : null}
          {details.innovationStage ? <div><dt>Innovation</dt><dd>{humanizeBusinessValue(details.innovationStage)}</dd></div> : null}
          {details.productStage ? <div><dt>Product</dt><dd>{humanizeBusinessValue(details.productStage)}</dd></div> : null}
          {details.applicability ? <div><dt>Applicability</dt><dd>{humanizeBusinessValue(details.applicability)}</dd></div> : null}
          {details.targetState ? <div><dt>Target</dt><dd>{humanizeBusinessValue(details.targetState)}</dd></div> : null}
          {details.observedState ? <div><dt>Observed</dt><dd>{humanizeBusinessValue(details.observedState)}</dd></div> : null}
          {details.atomType ? <div><dt>Atom</dt><dd>{humanizeBusinessValue(details.atomType)}</dd></div> : null}
          {details.layer ? <div><dt>Layer</dt><dd>{humanizeBusinessValue(details.layer)}</dd></div> : null}
          {details.module ? <div><dt>Module</dt><dd>{details.module}</dd></div> : null}
          {details.riskLevel ? <div><dt>Risk</dt><dd>{humanizeBusinessValue(details.riskLevel)}</dd></div> : null}
          {details.verificationStatus ? <div><dt>Verification</dt><dd>{humanizeBusinessValue(details.verificationStatus)}</dd></div> : null}
          {details.relationType ? <div><dt>Relation</dt><dd>{humanizeBusinessValue(details.relationType)}</dd></div> : null}
          {details.processName ? <div><dt>Process</dt><dd>{details.processName}</dd></div> : null}
          {typeof details.procedureVersion === "number" ? <div><dt>Version</dt><dd>{details.procedureVersion}</dd></div> : null}
          {details.stepType ? <div><dt>Step type</dt><dd>{humanizeBusinessValue(details.stepType)}</dd></div> : null}
          {details.dueDate ? <div><dt>Due</dt><dd>{new Date(details.dueDate).toLocaleDateString()}</dd></div> : null}
          {details.priority ? <div><dt>Priority</dt><dd>{humanizeBusinessValue(details.priority)}</dd></div> : null}
          {typeof details.relationCount === "number" ? <div><dt>Relations</dt><dd>{details.relationCount}</dd></div> : null}
          {typeof details.evidenceCount === "number" ? <div><dt>Evidence</dt><dd>{details.verifiedEvidenceCount ?? 0} verified / {details.evidenceCount}</dd></div> : null}
          <div><dt>Children</dt><dd>{node.childCount}</dd></div>
        </dl>

        {details.filePath ? <section><h3 className="application-graph-inspector__heading"><i className="ph-bold ph-file-code" aria-hidden="true"></i> Implementation source</h3><code className="application-graph-inspector__path">{details.filePath}</code></section> : null}

        {details.blockerLabels?.length ? <section><h3 className="application-graph-inspector__heading"><i className="ph-bold ph-warning-diamond" aria-hidden="true"></i> Blockers</h3><ul className="application-graph-inspector__list">{details.blockerLabels.map((label) => <li key={label}>{label}</li>)}</ul></section> : null}
        {details.recommendations?.length ? <section><h3 className="application-graph-inspector__heading"><i className="ph-bold ph-lightbulb" aria-hidden="true"></i> Recommended next step</h3><ul className="application-graph-inspector__list">{details.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul></section> : null}
        {details.links?.length ? <section><h3 className="application-graph-inspector__heading"><i className="ph-bold ph-link" aria-hidden="true"></i> Links</h3><div className="grid gap-2">{details.links.map((link) => <a className="btn btn-outline btn-sm justify-start" href={link.href} key={link.href} rel="noreferrer" target="_blank">{link.label}<i className="ph-bold ph-arrow-square-out" aria-hidden="true"></i></a>)}</div></section> : null}
      </div>
    </aside>
  );
}

function ApplicationGraphCanvas() {
  const searchRef = useRef<HTMLInputElement>(null);
  const focusTransitionTimerRef = useRef<number | null>(null);
  const [portfolio, setPortfolio] = useState<ApplicationGraphPacket | null>(null);
  const [applicationPackets, setApplicationPackets] = useState<Map<string, ApplicationGraphPacket>>(new Map());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [mode, setMode] = useState<ApplicationGraphMode>("structure");
  const [revealDepth, setRevealDepth] = useState<1 | 2 | 3 | "all">("all");
  const [filters, setFilters] = useState<GraphFilters>(initialFilters);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [allSearchDataLoaded, setAllSearchDataLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    api<{ data: ApplicationGraphPacket }>("/v1/product-engineering/graph")
      .then((response) => {
        if (!active) return;
        setPortfolio(response.data);
        setFocusId(response.data.rootNodeId);
        setStatus("ready");
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof AppApiError ? caught.code : "application_graph_load_failed");
        setStatus("error");
      });
    return () => { active = false; };
  }, []);

  const graph = useMemo(() => mergePackets(portfolio, applicationPackets), [portfolio, applicationPackets]);
  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const focus = (focusId && byId.get(focusId)) || (portfolio ? byId.get(portfolio.rootNodeId) : null);

  const ensureApplication = useCallback(async (applicationNode: ApplicationGraphNode) => {
    if (applicationPackets.has(applicationNode.entityId)) return;
    const response = await api<{ data: ApplicationGraphPacket }>(`/v1/product-engineering/applications/${applicationNode.entityId}/graph`);
    setApplicationPackets((current) => new Map(current).set(applicationNode.entityId, response.data));
  }, [applicationPackets]);

  const scheduleFocus = useCallback((nextFocusId: string, nextInspectorId: string | null) => {
    if (focusTransitionTimerRef.current !== null) window.clearTimeout(focusTransitionTimerRef.current);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setPendingFocusId(null);
      setFocusId(nextFocusId);
      setInspectorId(nextInspectorId);
      return;
    }
    setPendingFocusId(nextFocusId);
    focusTransitionTimerRef.current = window.setTimeout(() => {
      setFocusId(nextFocusId);
      setInspectorId(nextInspectorId);
      setPendingFocusId(null);
      focusTransitionTimerRef.current = null;
    }, graphExitDuration);
  }, []);

  useEffect(() => () => {
    if (focusTransitionTimerRef.current !== null) window.clearTimeout(focusTransitionTimerRef.current);
  }, []);

  const focusNode = useCallback(async (node: ApplicationGraphNode) => {
    try {
      if (node.type === "application") await ensureApplication(node);
      setError(null);
      if (node.id === focusId) {
        setInspectorId(node.id);
        return;
      }
      scheduleFocus(node.id, node.id);
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "application_graph_branch_load_failed");
    }
  }, [ensureApplication, focusId, scheduleFocus]);

  const loadAllForSearch = useCallback(async () => {
    if (!portfolio || allSearchDataLoaded || searching) return;
    setSearching(true);
    try {
      const applications = portfolio.nodes.filter((node) => node.type === "application");
      const missing = applications.filter((node) => !applicationPackets.has(node.entityId));
      const responses = await Promise.all(missing.map((node) => api<{ data: ApplicationGraphPacket }>(`/v1/product-engineering/applications/${node.entityId}/graph`)));
      setApplicationPackets((current) => {
        const next = new Map(current);
        responses.forEach((response) => next.set(response.data.applicationId!, response.data));
        return next;
      });
      setAllSearchDataLoaded(true);
      setError(null);
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "application_graph_search_load_failed");
    } finally {
      setSearching(false);
    }
  }, [allSearchDataLoaded, applicationPackets, portfolio, searching]);

  useEffect(() => {
    if (query.trim().length >= 2) void loadAllForSearch();
  }, [loadAllForSearch, query]);

  useEffect(() => {
    if (portfolio) void loadAllForSearch();
  }, [loadAllForSearch, portfolio]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized.length < 2) return [];
    return graph.nodes.filter((node) => [node.label, node.category, ...node.tags].join(" ").toLocaleLowerCase().includes(normalized)).slice(0, 12);
  }, [graph.nodes, query]);

  const activeApplicationNodeId = focus?.type === "application" ? focus.id : focus?.path.find((id) => id.startsWith("application:"));
  const domainOptions = useMemo(() => activeApplicationNodeId
    ? graph.nodes.filter((node) => node.type === "domain" && node.path.includes(activeApplicationNodeId)).sort((a, b) => a.label.localeCompare(b.label))
    : [], [activeApplicationNodeId, graph.nodes]);
  const visibleIds = useMemo(() => focus ? visibleNodeIds(graph.nodes, graph.edges, focus, mode, filters, revealDepth) : new Set<string>(), [filters, focus, graph.edges, graph.nodes, mode, revealDepth]);
  const visibleRecords = useMemo(() => graph.nodes.filter((node) => visibleIds.has(node.id)), [graph.nodes, visibleIds]);
  const visibleChildren = useMemo(() => visibleRecords.filter((node) => node.parentNodeId === focus?.id), [focus?.id, visibleRecords]);
  const dependencyNeighbourCount = useMemo(() => focus
    ? visibleRecords.filter((node) => !focus.path.includes(node.id) && !node.path.includes(focus.id)).length
    : 0, [focus, visibleRecords]);
  const interactionLocked = Boolean(pendingFocusId);

  const unifiedNodes = useMemo<UnifiedGraphNode[]>(() => visibleRecords.map((record) => ({
    id: record.id,
    type: record.type,
    label: record.shortLabel || record.label,
    category: record.category,
    status: `${statusLabel(record)} · ${record.completeness}% complete`,
    parentId: record.parentNodeId,
    color: branchAccent(record),
    weight: record.childCount + (record.details.relationCount || 0),
    emphasis: record.isBlocked ? "blocked" : record.id === focus?.id || ["portfolio", "application"].includes(record.type) ? "anchor" : record.details.missingEvidence ? "attention" : "standard"
  })), [focus?.id, visibleRecords]);
  const unifiedEdges = useMemo<UnifiedGraphEdge[]>(() => graph.edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      label: edge.label,
      emphasis: edge.type === "blocks" ? "blocked" : edge.type === "hierarchy" || mode === "dependencies" ? "standard" : "muted"
    })), [graph.edges, mode, visibleIds]);

  const goToParent = useCallback(() => {
    if (!focus?.parentNodeId) return;
    scheduleFocus(focus.parentNodeId, focus.parentNodeId);
  }, [focus, scheduleFocus]);

  const goHome = useCallback(() => {
    if (!portfolio) return;
    scheduleFocus(portfolio.rootNodeId, null);
  }, [portfolio, scheduleFocus]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (event.key.toLowerCase() === "f" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Home" && !typing) {
        event.preventDefault();
        goHome();
      } else if ((event.key === "Escape" || event.key === "Backspace") && !typing) {
        event.preventDefault();
        goToParent();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goHome, goToParent]);

  const inspectorNode = inspectorId ? byId.get(inspectorId) : null;
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key === "status" || key === "domain" ? value !== "all" : value).length;

  if (status === "loading") return <div className="application-graph-state"><CcNotice detail="Loading the application portfolio and graph summary." live tone="loading" title="Building Application Graph…" /></div>;
  if (status === "error") return <div className="application-graph-state"><CcNotice action={<CcButton onClick={() => window.location.reload()} size="sm" variant="outline">Try again</CcButton>} detail="The Product Engineering graph projection could not be loaded." tone="error" title={error || "Application Graph unavailable"} /></div>;
  if (!portfolio || !focus) return null;

  return (
    <section className="application-graph-workbench">
      <header className="application-graph-toolbar">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">11 Innovation · Product Engineering</p>
          <h1 className="text-xl font-black text-company-ink">Application Graph</h1>
        </div>

        <div className="application-graph-search">
          <i className={`ph-bold ${searching ? "ph-circle-notch animate-spin" : "ph-magnifying-glass"}`} aria-hidden="true"></i>
          <input aria-label="Search applications, domains, capabilities and features" onChange={(event) => setQuery(event.target.value)} placeholder="Search the graph…" ref={searchRef} type="search" value={query} />
          <kbd>F</kbd>
          {query.trim().length >= 2 ? <div className="application-graph-search__results" role="listbox">
            {searchResults.length ? searchResults.map((result) => <button key={result.id} onClick={() => { void focusNode(result); setQuery(""); }} role="option" type="button"><i className={`ph-bold ${iconFor(result.type)}`} aria-hidden="true"></i><span><strong>{result.label}</strong><small>{result.category} · {result.completeness}%</small></span></button>) : <p>{searching ? "Loading searchable branches…" : "No matching application graph records."}</p>}
          </div> : null}
        </div>

        <div className="application-graph-toolbar__actions">
          <details className="dropdown dropdown-end">
            <summary className="btn btn-outline btn-sm"><i className="ph-bold ph-funnel" aria-hidden="true"></i> Filters {activeFilterCount ? <span className="badge badge-primary badge-sm">{activeFilterCount}</span> : null}</summary>
            <div className="dropdown-content z-30 mt-2 w-72 rounded-company border border-base-300 bg-base-100 p-4 shadow-xl">
              <label className="form-control"><span className="label-text text-xs font-bold">Status</span><select className="select select-bordered select-sm" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}><option value="all">All statuses</option>{["unknown", "not_started", "partial", "complete", "verified", "blocked"].map((statusValue) => <option key={statusValue} value={statusValue}>{humanizeBusinessValue(statusValue)}</option>)}</select></label>
              <label className="form-control mt-3"><span className="label-text text-xs font-bold">Domain</span><select className="select select-bordered select-sm" onChange={(event) => setFilters((current) => ({ ...current, domain: event.target.value }))} value={filters.domain}><option value="all">All domains</option>{domainOptions.map((domain) => <option key={domain.id} value={domain.id}>{domain.label}</option>)}</select></label>
              <div className="mt-3 grid gap-2">{[
                ["requiredOnly", "Required only"],
                ["blockedOnly", "Blocked only"],
                ["incompleteOnly", "Incomplete only"],
                ["missingEvidenceOnly", "Missing evidence"]
              ].map(([key, label]) => <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm" key={key}><input checked={Boolean(filters[key as keyof GraphFilters])} className="checkbox checkbox-sm" onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox" />{label}</label>)}</div>
              <button className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => setFilters(initialFilters)} type="button">Clear filters</button>
            </div>
          </details>
          <CcButton iconLeft="ph-books" href="/areas?area=11-innowacje&view=overview" size="sm" variant="outline">Open Product Engineering</CcButton>
        </div>
      </header>

      <div className="application-graph-breadcrumb" aria-label="Application Graph breadcrumb">
        {focus.path.map((id, index) => {
          const crumb = byId.get(id);
          if (!crumb) return null;
          return <span key={id}>{index ? <i className="ph-bold ph-caret-right" aria-hidden="true"></i> : null}<button aria-current={id === focus.id ? "page" : undefined} onClick={() => void focusNode(crumb)} type="button">{crumb.label}</button></span>;
        })}
        <span className="application-graph-breadcrumb__count">{visibleRecords.length} visible {visibleRecords.length === 1 ? "node" : "nodes"}</span>
      </div>

      <nav aria-label="Application Graph mode" className="application-graph-modes">
        {modes.map((item) => <button aria-label={item.label} aria-pressed={mode === item.id} className={mode === item.id ? "is-active" : ""} key={item.id} onClick={() => setMode(item.id)} type="button"><i className={`ph-bold ${item.icon}`} aria-hidden="true"></i><span>{item.label}</span></button>)}
      </nav>

      <div className="application-graph-context">
        <span><i className="ph-bold ph-crosshair" aria-hidden="true"></i> Focus <strong>{focus.label}</strong></span>
        <span><i className="ph-bold ph-flow-arrow" aria-hidden="true"></i> {nextLevelLabel(focus.type, visibleChildren)}</span>
        <span className="application-graph-depth" aria-label="Visible graph depth">
          <i className="ph-bold ph-circles-three" aria-hidden="true"></i> Depth
          {([1, 2, 3, "all"] as const).map((depth) => <button aria-pressed={revealDepth === depth} className={revealDepth === depth ? "is-active" : ""} key={depth} onClick={() => setRevealDepth(depth)} type="button">{depth === "all" ? "All" : depth}</button>)}
        </span>
        <span className="application-graph-context__hint">
          {mode === "dependencies"
            ? dependencyNeighbourCount
              ? `${dependencyNeighbourCount} directly related ${dependencyNeighbourCount === 1 ? "record" : "records"}. Select one to follow the implementation chain.`
              : "No recorded dependencies for this node."
            : focus.childCount === 0
              ? "No deeper records are assigned yet. Use Product Engineering to add them."
              : "The lineage stays visible while you move deeper. Select an atom or switch to Dependencies to inspect its neighbourhood."}
        </span>
      </div>

      <div className="application-graph-canvas" data-inspector-open={Boolean(inspectorNode) || undefined} data-layout-moving={interactionLocked || undefined}>
        {error ? <div className="application-graph-inline-error" role="alert"><i className="ph-bold ph-warning-diamond" aria-hidden="true"></i><span>The requested graph branch could not be loaded ({error}).</span><button aria-label="Dismiss graph error" onClick={() => setError(null)} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button></div> : null}
        {portfolio.nodes.filter((node) => node.type === "application").length === 0 ? <div className="application-graph-empty"><CcNotice action={<CcButton href="/areas?area=11-innowacje&view=overview" size="sm" variant="primary">Create an application</CcButton>} detail="Application Graph is a projection of Product Engineering. Add an application there to place it on this canvas." tone="empty" title="No applications to map yet" /></div> : null}
        <UnifiedGraph3D
          ariaLabel="Interactive 3D map of applications, capabilities, procedures and execution work"
          edges={unifiedEdges}
          focusId={focus.id}
          nodes={unifiedNodes}
          onClearSelection={() => setInspectorId(null)}
          onNodeActivate={(node) => { const record = byId.get(node.id); if (record) void focusNode(record); }}
          onNodeSelect={(node) => setInspectorId(node.id)}
          rootId={portfolio.rootNodeId}
          selectedId={inspectorId}
        />
        <div className="application-graph-help" aria-label="Keyboard shortcuts"><span><kbd>Esc</kbd> Back</span><span><kbd>Home</kbd> Portfolio</span><span><kbd>F</kbd> Search</span></div>
        {inspectorNode ? <GraphInspector key={inspectorNode.id} node={inspectorNode} onClose={() => setInspectorId(null)} /> : null}
      </div>
    </section>
  );
}

export function ApplicationGraphRoute() {
  return <ApplicationGraphCanvas />;
}
