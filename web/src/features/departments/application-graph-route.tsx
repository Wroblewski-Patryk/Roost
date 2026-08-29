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
  role: "focus" | "lineage" | "descendant" | "relation";
  dimmed: boolean;
  focused: boolean;
  accent: string;
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
  { id: "execution", label: "Execution", icon: "ph-kanban" },
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
  if (record.type === "company") return "#9a8cff";
  const applicationId = record.type === "application"
    ? record.id
    : record.path.find((id) => id.startsWith("application:")) ?? record.id;
  let hash = 0;
  for (const character of applicationId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return branchPalette[hash % branchPalette.length];
}

function ApplicationGraphNodeView({ data }: NodeProps<GraphFlowNode>) {
  const { record, dimmed, focused, mode, accent } = data;
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
      data-role={data.role}
      data-type={record.type}
      style={{ "--graph-accent": accent } as React.CSSProperties}
    >
      {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((position) => (
        <Handle className="application-graph-handle" id={`target-${position}`} key={`target-${position}`} position={position} type="target" />
      ))}
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
            {record.type === "company"
              ? `${record.childCount} ${record.childCount === 1 ? "application" : "applications"}`
              : record.type === "application" && mode === "structure"
                ? "Open application map"
                : mode === "structure"
                  ? `${record.childCount} ${record.childCount === 1 ? "child" : "children"}`
                  : `${progress}% · ${statusLabel(record)}`}
          </span>
        </span>
        {record.type === "application" ? <span className="application-graph-node__readiness">{progress}%</span> : null}
      </button>
      {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((position) => (
        <Handle className="application-graph-handle" id={`source-${position}`} key={`source-${position}`} position={position} type="source" />
      ))}
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

function visibleNodeIds(
  allNodes: ApplicationGraphNode[],
  allEdges: ApplicationGraphPacket["edges"],
  focus: ApplicationGraphNode,
  mode: ApplicationGraphMode,
  filters: GraphFilters,
  revealDepth: 1 | 2
) {
  const byId = new Map(allNodes.map((node) => [node.id, node]));
  const visible = new Set<string>(focus.path);
  let frontier = [focus.id];
  const descendants: ApplicationGraphNode[] = [];
  for (let depth = 0; depth < revealDepth; depth += 1) {
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
      if (related && !["company", "application", "domain"].includes(related.type) && matchesFilters(related, filters)) relatedIds.push(relatedId);
    }

    // A local dependency neighbourhood remains readable; global discovery is
    // handled by search and successive focus changes.
    relatedIds.slice(0, 18).forEach((id) => visible.add(id));
  }

  return visible;
}

function layoutNodes(nodes: ApplicationGraphNode[], focus: ApplicationGraphNode) {
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(focus.id, { x: 0, y: 0 });

  const lineage = focus.path
    .slice(0, -1)
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is ApplicationGraphNode => Boolean(node));
  lineage.forEach((node, index) => {
    positions.set(node.id, { x: -410, y: (index - (lineage.length - 1) / 2) * 112 });
  });

  const depthById = new Map<string, number>([[focus.id, 0]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (!node.parentNodeId || depthById.has(node.id)) continue;
      const parentDepth = depthById.get(node.parentNodeId);
      if (parentDepth === undefined) continue;
      depthById.set(node.id, parentDepth + 1);
      changed = true;
    }
  }

  for (const depth of [1, 2]) {
    const level = nodes
      .filter((node) => depthById.get(node.id) === depth)
      .sort((left, right) => Number(right.isBlocked) - Number(left.isBlocked) || left.label.localeCompare(right.label));
    level.forEach((node, index) => {
      if (depth === 1 && lineage.length === 0 && level.length <= 8) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(level.length, 1);
        positions.set(node.id, { x: Math.cos(angle) * 360, y: Math.sin(angle) * 270 });
      } else if (depth === 1 && level.length <= 8) {
        const angle = level.length === 1 ? 0 : -Math.PI / 2 + (Math.PI * index) / (level.length - 1);
        positions.set(node.id, { x: 350 + Math.cos(angle) * 120, y: Math.sin(angle) * Math.max(270, level.length * 55) });
      } else if (depth === 2 && level.length <= 24) {
        const angle = level.length === 1 ? 0 : -Math.PI / 2 + (Math.PI * index) / (level.length - 1);
        positions.set(node.id, { x: 660 + Math.cos(angle) * 150, y: Math.sin(angle) * 440 });
      } else {
        const columns = depth === 1 ? 2 : 3;
        const column = index % columns;
        const row = Math.floor(index / columns);
        positions.set(node.id, { x: (depth === 1 ? 300 : 660) + column * 245, y: (row - (Math.ceil(level.length / columns) - 1) / 2) * 125 });
      }
    });
  }

  const relations = nodes.filter((node) => !positions.has(node.id));
  relations.forEach((node, index) => {
    positions.set(node.id, { x: 120 + (index % 3) * 280, y: 290 + Math.floor(index / 3) * 120 });
  });
  return positions;
}

function nextLevelLabel(type: ApplicationGraphNode["type"], count: number) {
  const labels: Record<ApplicationGraphNode["type"], [string, string]> = {
    company: ["application", "applications"],
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
  return `${count} ${labels[type][count === 1 ? 0 : 1]}`;
}

function handlesForEdge(source: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: `source-${Position.Right}`, targetHandle: `target-${Position.Left}` }
      : { sourceHandle: `source-${Position.Left}`, targetHandle: `target-${Position.Right}` };
  }
  return dy >= 0
    ? { sourceHandle: `source-${Position.Bottom}`, targetHandle: `target-${Position.Top}` }
    : { sourceHandle: `source-${Position.Top}`, targetHandle: `target-${Position.Bottom}` };
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
  const [portfolio, setPortfolio] = useState<ApplicationGraphPacket | null>(null);
  const [applicationPackets, setApplicationPackets] = useState<Map<string, ApplicationGraphPacket>>(new Map());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [mode, setMode] = useState<ApplicationGraphMode>("structure");
  const [revealDepth, setRevealDepth] = useState<1 | 2>(1);
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

  const activeApplicationNodeId = focus?.type === "application" ? focus.id : focus?.path.find((id) => id.startsWith("application:"));
  const domainOptions = useMemo(() => activeApplicationNodeId
    ? graph.nodes.filter((node) => node.type === "domain" && node.path.includes(activeApplicationNodeId)).sort((a, b) => a.label.localeCompare(b.label))
    : [], [activeApplicationNodeId, graph.nodes]);
  const visibleIds = useMemo(() => focus ? visibleNodeIds(graph.nodes, graph.edges, focus, mode, filters, revealDepth) : new Set<string>(), [filters, focus, graph.edges, graph.nodes, mode, revealDepth]);
  const visibleRecords = useMemo(() => graph.nodes.filter((node) => visibleIds.has(node.id)), [graph.nodes, visibleIds]);
  const positions = useMemo(() => focus ? layoutNodes(visibleRecords, focus) : new Map<string, { x: number; y: number }>(), [focus, visibleRecords]);
  const visibleChildren = useMemo(() => visibleRecords.filter((node) => node.parentNodeId === focus?.id), [focus?.id, visibleRecords]);
  const dependencyNeighbourCount = useMemo(() => focus
    ? visibleRecords.filter((node) => !focus.path.includes(node.id) && !node.path.includes(focus.id)).length
    : 0, [focus, visibleRecords]);

  const flowNodes = useMemo<GraphFlowNode[]>(() => visibleRecords.map((record) => ({
    id: record.id,
    type: "applicationGraph",
    position: positions.get(record.id) ?? { x: 0, y: 0 },
    data: {
      record,
      mode,
      role: record.id === focus?.id ? "focus" : focus?.path.includes(record.id) ? "lineage" : record.path.includes(focus?.id || "") ? "descendant" : "relation",
      focused: record.id === focus?.id,
      dimmed: record.id !== focus?.id && !record.path.includes(focus?.id || "") && !focus?.path.includes(record.id),
      accent: branchAccent(record)
    },
    draggable: false,
    selectable: true,
    focusable: true,
    ariaLabel: `${record.label}, ${record.category}, ${record.completeness}% complete`
  })), [focus, mode, positions, visibleRecords]);

  const flowEdges = useMemo<Edge[]>(() => graph.edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .filter((edge) => mode === "dependencies" || edge.type === "hierarchy")
    .map((edge) => {
      const sourceNode = byId.get(edge.source);
      const targetNode = byId.get(edge.target);
      const hierarchyAccent = sourceNode?.type === "company" && targetNode ? branchAccent(targetNode) : sourceNode ? branchAccent(sourceNode) : "#7f8da8";
      const handles = handlesForEdge(positions.get(edge.source) ?? { x: 0, y: 0 }, positions.get(edge.target) ?? { x: 0, y: 0 });
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...handles,
        type: "bezier",
        animated: edge.type === "blocks",
        label: mode === "dependencies" && edge.type !== "hierarchy" ? edge.label || (edge.type === "blocks" ? "blocks" : "depends on") : undefined,
        markerEnd: edge.type === "hierarchy" ? undefined : { type: MarkerType.ArrowClosed, color: edge.type === "blocks" ? "#d66565" : "#7f8da8" },
        style: edge.type === "hierarchy"
          ? { stroke: hierarchyAccent, strokeOpacity: 0.78, strokeWidth: 2 }
          : { stroke: edge.type === "blocks" ? "#d66565" : "#7f8da8", strokeWidth: edge.type === "blocks" ? 2.5 : 1.5, strokeDasharray: "6 6" },
        className: `application-graph-edge application-graph-edge--${edge.type}`
      };
    }), [byId, graph.edges, mode, positions, visibleIds]);

  useEffect(() => {
    if (!focus || !positions.has(focus.id)) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (flowNodes.length > 2) void fitView({ padding: 0.1, duration: reducedMotion ? 0 : 360, maxZoom: 1 });
      else {
        const position = positions.get(focus.id)!;
        void setCenter(position.x + 120, position.y + 52, { zoom: 1, duration: reducedMotion ? 0 : 320 });
      }
    }, 40);
    return () => window.clearTimeout(timer);
  }, [fitView, flowNodes.length, focus, inspectorId, mode, positions, setCenter]);

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
        <span className="application-graph-breadcrumb__count">{visibleRecords.length} visible {visibleRecords.length === 1 ? "node" : "nodes"}</span>
      </div>

      <nav aria-label="Application Graph mode" className="application-graph-modes">
        {modes.map((item) => <button aria-label={item.label} aria-pressed={mode === item.id} className={mode === item.id ? "is-active" : ""} key={item.id} onClick={() => setMode(item.id)} type="button"><i className={`ph-bold ${item.icon}`} aria-hidden="true"></i><span>{item.label}</span></button>)}
      </nav>

      <div className="application-graph-context">
        <span><i className="ph-bold ph-crosshair" aria-hidden="true"></i> Focus <strong>{focus.label}</strong></span>
        <span><i className="ph-bold ph-flow-arrow" aria-hidden="true"></i> {nextLevelLabel(focus.type, visibleChildren.length)}</span>
        <span className="application-graph-depth" aria-label="Visible graph depth">
          <i className="ph-bold ph-circles-three" aria-hidden="true"></i> Depth
          {([1, 2] as const).map((depth) => <button aria-pressed={revealDepth === depth} className={revealDepth === depth ? "is-active" : ""} key={depth} onClick={() => setRevealDepth(depth)} type="button">{depth}</button>)}
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
          onPaneClick={() => setInspectorId(null)}
          onlyRenderVisibleElements
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
