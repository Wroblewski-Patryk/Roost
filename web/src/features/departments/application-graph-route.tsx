import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, AppApiError } from "../../api/client";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { humanizeBusinessValue } from "./shared";
import type {
  ApplicationGraphMode,
  ApplicationGraphNode,
  ApplicationGraphPacket
} from "./application-graph-types";
import "./application-graph.css";

type GraphNodeData = {
  record: ApplicationGraphNode;
  mode: ApplicationGraphMode;
  dimmed: boolean;
  focused: boolean;
};

type GraphFlowNode = Node<GraphNodeData, "applicationGraph">;

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
  { id: "progress", label: "Progress", icon: "ph-chart-donut" },
  { id: "dependencies", label: "Dependencies", icon: "ph-git-branch" },
  { id: "agent-ready", label: "Agent Ready", icon: "ph-robot" },
  { id: "productization", label: "Productization", icon: "ph-rocket-launch" }
];

function iconFor(type: ApplicationGraphNode["type"]) {
  if (type === "company") return "ph-buildings";
  if (type === "application") return "ph-app-window";
  if (type === "domain") return "ph-circles-three-plus";
  if (type === "capability") return "ph-hexagon";
  return "ph-diamond";
}

function statusLabel(record: ApplicationGraphNode) {
  if (record.isBlocked) return "Blocked";
  return humanizeBusinessValue(record.status);
}

function ApplicationGraphNodeView({ data }: NodeProps<GraphFlowNode>) {
  const { record, dimmed, focused, mode } = data;
  const progress = Math.max(0, Math.min(100, record.completeness));
  const modeAttention = mode === "agent-ready"
    ? record.details.missingEvidence || record.completeness < 90
    : mode === "productization"
      ? record.isRequired && record.completeness < 90
      : false;

  return (
    <article
      className="application-graph-node"
      data-attention={modeAttention || undefined}
      data-blocked={record.isBlocked || undefined}
      data-dimmed={dimmed || undefined}
      data-focused={focused || undefined}
      data-type={record.type}
    >
      <Handle className="application-graph-handle" position={Position.Left} type="target" />
      <button
        aria-label={`Focus ${record.type} ${record.label}. ${statusLabel(record)}, ${record.completeness}% complete.`}
        className="application-graph-node__button nodrag nopan"
        type="button"
      >
        <span
          aria-hidden="true"
          className="application-graph-node__progress"
          style={{ "--graph-progress": `${progress * 3.6}deg` } as React.CSSProperties}
        >
          <span><i className={`ph-bold ${iconFor(record.type)}`}></i></span>
        </span>
        <span className="min-w-0 text-left">
          <span className="application-graph-node__category">{record.category}</span>
          <strong className="application-graph-node__label">{record.shortLabel}</strong>
          <span className="application-graph-node__meta">
            {record.isBlocked ? <i className="ph-bold ph-warning-diamond" aria-hidden="true"></i> : null}
            {mode === "structure" ? `${record.childCount} ${record.childCount === 1 ? "child" : "children"}` : `${progress}% · ${statusLabel(record)}`}
          </span>
        </span>
      </button>
      <Handle className="application-graph-handle" position={Position.Right} type="source" />
    </article>
  );
}

const nodeTypes = { applicationGraph: ApplicationGraphNodeView };

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
  if (node.type === "company" || node.type === "application") return true;
  if (filters.status !== "all" && node.status !== filters.status) return false;
  if (filters.domain !== "all" && !node.path.includes(filters.domain) && node.id !== filters.domain) return false;
  if (filters.requiredOnly && !node.isRequired) return false;
  if (filters.blockedOnly && !node.isBlocked) return false;
  if (filters.incompleteOnly && node.completeness >= 100) return false;
  if (filters.missingEvidenceOnly && !node.details.missingEvidence) return false;
  return true;
}

function visibleNodeIds(allNodes: ApplicationGraphNode[], focus: ApplicationGraphNode, mode: ApplicationGraphMode, filters: GraphFilters) {
  const byId = new Map(allNodes.map((node) => [node.id, node]));
  const visible = new Set(focus.path);
  const directChildren = allNodes.filter((node) => node.parentNodeId === focus.id && matchesFilters(node, filters));
  directChildren.forEach((node) => visible.add(node.id));

  const parent = focus.parentNodeId ? byId.get(focus.parentNodeId) : null;
  if (parent) {
    allNodes.filter((node) => node.parentNodeId === parent.id && matchesFilters(node, filters)).forEach((node) => visible.add(node.id));
  }

  if (focus.type === "company") {
    allNodes.filter((node) => node.type === "application").forEach((node) => visible.add(node.id));
  }
  if (focus.type === "application") {
    allNodes.filter((node) => node.type === "application" || node.parentNodeId === focus.id).forEach((node) => visible.add(node.id));
  }
  if (mode === "dependencies") {
    const applicationId = focus.path.find((id) => id.startsWith("application:"));
    if (applicationId) {
      allNodes.filter((node) => node.path.includes(applicationId) && (node.type === "domain" || node.type === "capability")).filter((node) => matchesFilters(node, filters)).forEach((node) => visible.add(node.id));
    }
  }
  return visible;
}

function radialPosition(index: number, total: number, radius: number, center = { x: 0, y: 0 }, start = -Math.PI / 2, verticalScale = 1) {
  const angle = start + (Math.PI * 2 * index) / Math.max(total, 1);
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius * verticalScale };
}

function layoutNodes(nodes: ApplicationGraphNode[], focus: ApplicationGraphNode) {
  const positions = new Map<string, { x: number; y: number }>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  positions.set(focus.id, { x: 0, y: 0 });

  const ancestors = focus.path.slice(0, -1).reverse();
  ancestors.forEach((id, index) => positions.set(id, { x: -390 - index * 300, y: -index * 100 }));

  const children = nodes.filter((node) => node.parentNodeId === focus.id);
  children.forEach((node, index) => positions.set(node.id, radialPosition(
    index,
    children.length,
    focus.type === "company" ? 380 : 310,
    { x: 0, y: 0 },
    -Math.PI / 2,
    focus.type === "company" ? 0.48 : 0.72
  )));

  if (focus.parentNodeId) {
    const parentPosition = positions.get(focus.parentNodeId) ?? { x: -390, y: 0 };
    const siblings = nodes.filter((node) => node.parentNodeId === focus.parentNodeId && node.id !== focus.id && !positions.has(node.id));
    siblings.forEach((node, index) => positions.set(node.id, radialPosition(index, siblings.length, 210, parentPosition, Math.PI / 2, 0.72)));
  }

  const remaining = nodes.filter((node) => !positions.has(node.id));
  remaining.forEach((node, index) => {
    const parentPosition = node.parentNodeId ? positions.get(node.parentNodeId) : null;
    positions.set(node.id, parentPosition
      ? radialPosition(index, remaining.length, 240, parentPosition)
      : { x: 460 + (index % 5) * 230, y: -300 + Math.floor(index / 5) * 160 });
  });

  for (const [id] of positions) if (!byId.has(id)) positions.delete(id);
  return positions;
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
          {typeof details.evidenceCount === "number" ? <div><dt>Evidence</dt><dd>{details.verifiedEvidenceCount ?? 0} verified / {details.evidenceCount}</dd></div> : null}
          <div><dt>Children</dt><dd>{node.childCount}</dd></div>
        </dl>

        {details.blockerLabels?.length ? <section><h3 className="application-graph-inspector__heading"><i className="ph-bold ph-warning-diamond" aria-hidden="true"></i> Blockers</h3><ul className="application-graph-inspector__list">{details.blockerLabels.map((label) => <li key={label}>{label}</li>)}</ul></section> : null}
        {details.recommendations?.length ? <section><h3 className="application-graph-inspector__heading"><i className="ph-bold ph-lightbulb" aria-hidden="true"></i> Recommended next step</h3><ul className="application-graph-inspector__list">{details.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul></section> : null}
        {details.links?.length ? <section><h3 className="application-graph-inspector__heading"><i className="ph-bold ph-link" aria-hidden="true"></i> Links</h3><div className="grid gap-2">{details.links.map((link) => <a className="btn btn-outline btn-sm justify-start" href={link.href} key={link.href} rel="noreferrer" target="_blank">{link.label}<i className="ph-bold ph-arrow-square-out" aria-hidden="true"></i></a>)}</div></section> : null}
      </div>
    </aside>
  );
}

function ApplicationGraphCanvas() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [portfolio, setPortfolio] = useState<ApplicationGraphPacket | null>(null);
  const [applicationPackets, setApplicationPackets] = useState<Map<string, ApplicationGraphPacket>>(new Map());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [mode, setMode] = useState<ApplicationGraphMode>("structure");
  const [filters, setFilters] = useState<GraphFilters>(initialFilters);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [allSearchDataLoaded, setAllSearchDataLoaded] = useState(false);
  const { fitView, setCenter } = useReactFlow<GraphFlowNode>();

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

  const focusNode = useCallback(async (node: ApplicationGraphNode) => {
    try {
      if (node.type === "application") await ensureApplication(node);
      setError(null);
      setFocusId(node.id);
      setInspectorId(node.id);
    } catch (caught) {
      setError(caught instanceof AppApiError ? caught.code : "application_graph_branch_load_failed");
    }
  }, [ensureApplication]);

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

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized.length < 2) return [];
    return graph.nodes.filter((node) => [node.label, node.category, ...node.tags].join(" ").toLocaleLowerCase().includes(normalized)).slice(0, 12);
  }, [graph.nodes, query]);

  const domainOptions = useMemo(() => graph.nodes.filter((node) => node.type === "domain").sort((a, b) => a.label.localeCompare(b.label)), [graph.nodes]);
  const visibleIds = useMemo(() => focus ? visibleNodeIds(graph.nodes, focus, mode, filters) : new Set<string>(), [filters, focus, graph.nodes, mode]);
  const visibleRecords = useMemo(() => graph.nodes.filter((node) => visibleIds.has(node.id)), [graph.nodes, visibleIds]);
  const positions = useMemo(() => focus ? layoutNodes(visibleRecords, focus) : new Map<string, { x: number; y: number }>(), [focus, visibleRecords]);

  const flowNodes = useMemo<GraphFlowNode[]>(() => visibleRecords.map((record) => ({
    id: record.id,
    type: "applicationGraph",
    position: positions.get(record.id) ?? { x: 0, y: 0 },
    data: {
      record,
      mode,
      focused: record.id === focus?.id,
      dimmed: record.id !== focus?.id && record.parentNodeId !== focus?.id && !focus?.path.includes(record.id)
    },
    draggable: false,
    selectable: true,
    focusable: true,
    ariaLabel: `${record.label}, ${record.category}, ${record.completeness}% complete`
  })), [focus, focusNode, mode, positions, visibleRecords]);

  const flowEdges = useMemo<Edge[]>(() => graph.edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .filter((edge) => mode === "dependencies" || edge.type === "hierarchy")
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: edge.type === "blocks",
      label: mode === "dependencies" && edge.type !== "hierarchy" ? edge.label || (edge.type === "blocks" ? "blocks" : "depends on") : undefined,
      markerEnd: edge.type === "hierarchy" ? undefined : { type: MarkerType.ArrowClosed, color: edge.type === "blocks" ? "#d66565" : "#7f8da8" },
      style: edge.type === "hierarchy"
        ? { stroke: "rgba(118, 132, 162, .48)", strokeWidth: 1.5 }
        : { stroke: edge.type === "blocks" ? "#d66565" : "#7f8da8", strokeWidth: edge.type === "blocks" ? 2.5 : 1.5, strokeDasharray: "6 6" },
      className: `application-graph-edge application-graph-edge--${edge.type}`
    })), [graph.edges, mode, visibleIds]);

  useEffect(() => {
    if (!focus || !positions.has(focus.id)) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (focus.type === "company" || flowNodes.length > 8 || mode === "dependencies") {
        void fitView({ padding: 0.18, duration: reducedMotion ? 0 : 400, maxZoom: 1 });
      } else {
        const position = positions.get(focus.id)!;
        void setCenter(position.x + 95, position.y + 55, { zoom: focus.type === "company" ? 0.82 : 1.02, duration: reducedMotion ? 0 : 420 });
      }
    }, 40);
    return () => window.clearTimeout(timer);
  }, [fitView, flowNodes.length, focus, mode, positions, setCenter]);

  const goToParent = useCallback(() => {
    if (!focus?.parentNodeId) return;
    setFocusId(focus.parentNodeId);
    setInspectorId(focus.parentNodeId);
  }, [focus]);

  const goHome = useCallback(() => {
    if (!portfolio) return;
    setFocusId(portfolio.rootNodeId);
    setInspectorId(null);
  }, [portfolio]);

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
        <span className="application-graph-breadcrumb__count">{visibleRecords.length} visible nodes</span>
      </div>

      <nav aria-label="Application Graph mode" className="application-graph-modes">
        {modes.map((item) => <button aria-label={item.label} aria-pressed={mode === item.id} className={mode === item.id ? "is-active" : ""} key={item.id} onClick={() => setMode(item.id)} type="button"><i className={`ph-bold ${item.icon}`} aria-hidden="true"></i><span>{item.label}</span></button>)}
      </nav>

      <div className="application-graph-canvas" data-inspector-open={Boolean(inspectorNode) || undefined}>
        {error ? <div className="application-graph-inline-error" role="alert"><i className="ph-bold ph-warning-diamond" aria-hidden="true"></i><span>The requested graph branch could not be loaded ({error}).</span><button aria-label="Dismiss graph error" onClick={() => setError(null)} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button></div> : null}
        {portfolio.nodes.filter((node) => node.type === "application").length === 0 ? <div className="application-graph-empty"><CcNotice action={<CcButton href="/areas?area=11-innowacje&view=overview" size="sm" variant="primary">Create an application</CcButton>} detail="Application Graph is a projection of Product Engineering. Add an application there to place it on this canvas." tone="empty" title="No applications to map yet" /></div> : null}
        <ReactFlow<GraphFlowNode>
          colorMode="dark"
          edges={flowEdges}
          elementsSelectable
          fitView
          maxZoom={1.8}
          minZoom={0.22}
          nodes={flowNodes}
          nodesConnectable={false}
          nodesDraggable={false}
          nodeTypes={nodeTypes}
          onNodeClick={(_event, node) => void focusNode(node.data.record)}
          onPaneClick={goToParent}
          panOnDrag
          proOptions={{ hideAttribution: true }}
          selectionOnDrag={false}
          zoomOnPinch
          zoomOnScroll
        >
          <Background color="rgba(126, 143, 179, .22)" gap={28} size={1} variant={BackgroundVariant.Dots} />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap ariaLabel="Application Graph minimap" maskColor="rgba(9, 13, 25, .72)" nodeColor={(node) => node.data?.record.isBlocked ? "#d66565" : node.data?.focused ? "#8ea5ff" : "#52617c"} pannable position="bottom-right" zoomable />
        </ReactFlow>
        <div className="application-graph-help" aria-label="Keyboard shortcuts"><span><kbd>Esc</kbd> Back</span><span><kbd>Home</kbd> Portfolio</span><span><kbd>F</kbd> Search</span></div>
        {inspectorNode ? <GraphInspector node={inspectorNode} onClose={() => setInspectorId(null)} /> : null}
      </div>
    </section>
  );
}

export function ApplicationGraphRoute() {
  return <ReactFlowProvider><ApplicationGraphCanvas /></ReactFlowProvider>;
}
