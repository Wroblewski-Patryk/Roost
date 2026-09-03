import { useEffect, useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, type Edge, type Node, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue } from "./shared";
import { layoutCompanyGraphNodes } from "./company-graph-layout";

type GraphNode = { id: string; entityType: string; recordType?: string; label: string; state?: string };
type GraphEdge = { id: string; type: string; from: { entityType: string; entityId: string }; to: { entityType: string; entityId: string }; status: string; source?: "explicit" | "structural" | "derived" | "fallback" };
type GraphPacket = { schemaVersion: string; generatedAt: string; rootNodeId: string; nodes: GraphNode[]; edges: GraphEdge[]; summary?: { recordCount: number; contextualizedRecordCount: number; unassignedRecordCount: number; relationshipCoverage: number }; organizationalMemberships: Array<{ entityType: string; entityId: string; departmentKey: string; role: string }> };

const typeColors: Record<string, string> = { workspace: "#8ea5ff", department: "#7c8bad", goal: "#7c3aed", project: "#2563eb", application: "#0891b2", company_record: "#4f46e5", task: "#ea580c", task_list: "#b7791f", procedure: "#16a34a", risk: "#dc2626", metric: "#0d9488", resource: "#64748b", file: "#64748b", policy: "#9333ea", client: "#db2777", workforce: "#ca8a04" };
const maximumNeighbourhoodSize = 28;
type GraphMode = "all" | "explore";
type CompanyFlowData = { record: GraphNode; mappedCount: number; locale: "en" | "pl" };

function CompanyGraphNodeView({ data }: NodeProps<Node<CompanyFlowData>>) {
  const record = data.record;
  return <>
    {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((position) => <Handle className="company-graph-port" id={`target-${position}`} key={`target-${position}`} position={position} type="target" />)}
    <div className="company-graph-node-copy"><small>{humanizeBusinessValue(record.recordType || record.entityType, undefined, data.locale)}</small><strong>{record.label}</strong><span>{record.entityType === "workspace" ? `${data.mappedCount} mapped records` : humanizeBusinessValue(record.state || "unknown", undefined, data.locale)}</span></div>
    {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((position) => <Handle className="company-graph-port" id={`source-${position}`} key={`source-${position}`} position={position} type="source" />)}
  </>;
}

const nodeTypes = { companyGraph: CompanyGraphNodeView };

function edgePorts(source: { x: number; y: number }, target: { x: number; y: number }) {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX >= 0 ? { sourceHandle: "source-right", targetHandle: "target-left" } : { sourceHandle: "source-left", targetHandle: "target-right" };
  return deltaY >= 0 ? { sourceHandle: "source-bottom", targetHandle: "target-top" } : { sourceHandle: "source-top", targetHandle: "target-bottom" };
}

function entityHref(node: GraphNode) {
  if (node.entityType === "workspace") return "/areas?area=00-ogolny&view=overview";
  if (node.entityType === "department" && node.recordType) return `/areas?area=${encodeURIComponent(node.recordType)}&view=overview`;
  return `/areas?area=00-ogolny&view=entity&type=${encodeURIComponent(node.recordType === "requirement" ? "requirement" : node.entityType)}&id=${encodeURIComponent(node.id)}`;
}

function nodePriority(node: GraphNode) {
  if (node.entityType === "workspace") return 0;
  if (node.entityType === "department") return 1;
  if (["application", "project", "goal", "risk", "policy"].includes(node.entityType)) return 2;
  if (["procedure", "workforce", "metric", "resource", "company_record", "client", "task_list"].includes(node.entityType)) return 3;
  return 4;
}

export function CompanyGraphRoute() {
  const { locale, t } = useLanguage(); const graph = useOwnerPacket<GraphPacket>("/v1/company-intelligence/graph", true, t); const [query, setQuery] = useState(""); const [enabledTypes, setEnabledTypes] = useState<string[]>([]); const [selectedId, setSelectedId] = useState<string | null>(null); const [focusId, setFocusId] = useState<string | null>(null); const [mode, setMode] = useState<GraphMode>("explore");
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const allRecords = useMemo(() => graph.data?.nodes || [], [graph.data]);
  const allEdges = useMemo(() => graph.data?.edges || [], [graph.data]);
  const recordById = useMemo(() => new Map(allRecords.map((node) => [node.id, node])), [allRecords]);
  useEffect(() => {
    if (!graph.data?.rootNodeId) return;
    setFocusId((current) => current && recordById.has(current) ? current : graph.data!.rootNodeId);
  }, [graph.data, recordById]);
  const activeFocus = (focusId && recordById.get(focusId)) || (graph.data?.rootNodeId ? recordById.get(graph.data.rootNodeId) : null) || null;
  const availableTypes = useMemo(() => [...new Set(allRecords.filter((node) => !["workspace", "department", "task_list"].includes(node.entityType)).map((node) => node.entityType))].sort(), [allRecords]);
  const visibility = useMemo(() => {
    if (!activeFocus) return { records: [] as GraphNode[], total: 0 };
    const normalized = query.trim().toLocaleLowerCase();
    const passesType = (node: GraphNode) => ["workspace", "department"].includes(node.entityType) || !enabledTypes.length || enabledTypes.includes(node.entityType);
    if (mode === "all" && normalized.length < 2) {
      const records = allRecords.filter(passesType).sort((left, right) => nodePriority(left) - nodePriority(right) || left.label.localeCompare(right.label));
      return { records, total: records.length };
    }
    const candidateIds = new Set<string>([activeFocus.id]);
    if (normalized.length >= 2) {
      const matches = allRecords
        .filter((node) => !["workspace", "department"].includes(node.entityType))
        .filter(passesType)
        .filter((node) => `${node.label} ${node.entityType} ${node.recordType || ""}`.toLocaleLowerCase().includes(normalized))
        .sort((left, right) => nodePriority(left) - nodePriority(right) || left.label.localeCompare(right.label));
      matches.slice(0, 18).forEach((node) => candidateIds.add(node.id));
      allEdges.forEach((edge) => {
        if (candidateIds.has(edge.from.entityId) && ["workspace", "department", "application", "project", "task_list"].includes(edge.to.entityType)) candidateIds.add(edge.to.entityId);
        if (candidateIds.has(edge.to.entityId) && ["workspace", "department", "application", "project", "task_list"].includes(edge.from.entityType)) candidateIds.add(edge.from.entityId);
      });
    } else {
      const neighbours = allEdges.flatMap((edge) => edge.from.entityId === activeFocus.id ? [recordById.get(edge.to.entityId)] : edge.to.entityId === activeFocus.id ? [recordById.get(edge.from.entityId)] : []).filter((node): node is GraphNode => Boolean(node)).filter(passesType).sort((left, right) => nodePriority(left) - nodePriority(right) || left.label.localeCompare(right.label));
      neighbours.forEach((node) => candidateIds.add(node.id));
    }
    const candidates = [...candidateIds].map((id) => recordById.get(id)).filter((node): node is GraphNode => Boolean(node)).sort((left, right) => left.id === activeFocus.id ? -1 : right.id === activeFocus.id ? 1 : nodePriority(left) - nodePriority(right) || left.label.localeCompare(right.label));
    return { records: candidates.slice(0, maximumNeighbourhoodSize), total: candidates.length };
  }, [activeFocus, allEdges, allRecords, enabledTypes, mode, query, recordById]);
  const visibleRecords = visibility.records;
  const visibleIds = useMemo(() => new Set(visibleRecords.map((node) => node.id)), [visibleRecords]);
  const nodes = useMemo<Array<Node>>(() => {
    const visibleEdges = (graph.data?.edges || []).filter((edge) => visibleIds.has(edge.from.entityId) && visibleIds.has(edge.to.entityId));
    const positions = layoutCompanyGraphNodes(visibleRecords, visibleEdges);
    return visibleRecords.map((record) => ({ id: record.id, type: "companyGraph", position: positions.get(record.id) ?? { x: 0, y: 0 }, data: { record, mappedCount: allRecords.length - 1, locale }, className: `company-graph-node${selectedId === record.id ? " is-selected" : ""}${["workspace", "department"].includes(record.entityType) ? " is-anchor" : ""}`, style: { borderColor: typeColors[record.entityType] || "#64748b", borderLeftWidth: 5, width: record.entityType === "workspace" ? 250 : 220 }, zIndex: selectedId === record.id ? 2 : record.id === activeFocus?.id ? 1 : 0 }));
  }, [activeFocus?.id, allEdges, allRecords.length, locale, selectedId, visibleIds, visibleRecords]);
  const edges = useMemo<Array<Edge>>(() => {
    const visibleGraphEdges = allEdges.filter((edge) => visibleIds.has(edge.from.entityId) && visibleIds.has(edge.to.entityId));
    const positions = layoutCompanyGraphNodes(visibleRecords, visibleGraphEdges);
    return visibleGraphEdges.map((edge) => {
    const connectedToSelection = selectedId === edge.from.entityId || selectedId === edge.to.entityId;
    const stroke = edge.status === "blocked" ? "#dc626f" : edge.source === "fallback" ? "#d39a5a" : connectedToSelection ? "#a7b7ff" : edge.source === "explicit" ? "#8ea5ff" : "#667694";
    const showLabel = connectedToSelection || visibleGraphEdges.length <= 16;
    const ports = edgePorts(positions.get(edge.from.entityId) ?? { x: 0, y: 0 }, positions.get(edge.to.entityId) ?? { x: 0, y: 0 });
    return { id: edge.id, source: edge.from.entityId, target: edge.to.entityId, ...ports, type: "smoothstep", pathOptions: { borderRadius: 14, offset: 22 }, label: showLabel ? humanizeBusinessValue(edge.type) : undefined, animated: edge.status === "blocked", markerEnd: { type: MarkerType.ArrowClosed, color: stroke }, labelBgBorderRadius: 5, labelBgPadding: [5, 3], labelBgStyle: { fill: "#111827", fillOpacity: 0.94 }, labelStyle: { fill: "#d3daea", fontSize: 10, fontWeight: 700 }, style: { stroke, strokeDasharray: edge.source === "explicit" ? undefined : edge.source === "fallback" ? "2 7" : "5 4", strokeOpacity: connectedToSelection || !selectedId ? 0.88 : 0.18, strokeWidth: connectedToSelection ? 2.8 : edge.source === "explicit" ? 2 : 1.35 }, zIndex: connectedToSelection ? 1 : 0 };
    });
  }, [allEdges, selectedId, visibleIds, visibleRecords]);
  const selected = selectedId ? recordById.get(selectedId) || null : null; const selectedMemberships = selected ? (graph.data?.organizationalMemberships || []).filter((item) => item.entityId === selected.id && item.entityType === selected.entityType) : [];
  useEffect(() => {
    if (!flow || !visibleRecords.length) return;
    const frame = window.requestAnimationFrame(() => void flow.fitView({ duration: 320, maxZoom: mode === "all" ? 0.72 : 1, minZoom: mode === "all" ? 0.08 : 0.45, padding: 0.12 }));
    return () => window.cancelAnimationFrame(frame);
  }, [activeFocus?.id, flow, mode, visibleRecords]);
  function toggleType(type: string) { setEnabledTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]); }
  function focusNode(id: string) { setFocusId(id); setSelectedId(id); setQuery(""); }
  return <><CcPageHeader actions={<CcButton href="/areas?area=00-ogolny&view=overview" iconLeft="ph-gauge" size="sm" variant="outline">Company dashboard</CcButton>} description="Interactive, whole-workspace state graph. Filter layers, inspect typed relationships and open any canonical object without switching between mini-applications." eyebrow="00 General · Company intelligence" title="Company Graph" />
    <section className="roost-work-panel rounded-company overflow-hidden">
      <header className="company-graph-toolbar"><label className="company-graph-search"><i className="ph-bold ph-magnifying-glass" aria-hidden="true"></i><input aria-label="Search Company Graph" onChange={(event) => setQuery(event.target.value)} placeholder="Search objects and relationships…" type="search" value={query} /></label><div className="company-graph-mode" aria-label="Graph scope"><button aria-pressed={mode === "explore"} className={mode === "explore" ? "is-active" : ""} onClick={() => setMode("explore")} type="button"><i className="ph-bold ph-crosshair" aria-hidden="true"></i> Explore context</button><button aria-pressed={mode === "all"} className={mode === "all" ? "is-active" : ""} onClick={() => setMode("all")} type="button"><i className="ph-bold ph-share-network" aria-hidden="true"></i> Full topology</button></div><div className="company-graph-health"><span className={`badge badge-outline company-graph-health--${graph.data?.summary?.unassignedRecordCount ? "attention" : "healthy"}`}>{graph.data?.summary ? `${graph.data.summary.relationshipCoverage}% contextualized` : "Coverage…"}</span><span>{visibleRecords.length} nodes · {edges.length} relations{visibility.total > visibleRecords.length ? ` · ${visibility.total - visibleRecords.length} more` : ""}{graph.data?.summary?.unassignedRecordCount ? ` · ${graph.data.summary.unassignedRecordCount} need context` : ""}</span></div></header>
      <div className="company-graph-filterbar" aria-label="Entity layer filters">{availableTypes.map((type) => <button aria-pressed={enabledTypes.includes(type)} className={enabledTypes.includes(type) ? "is-active" : ""} key={type} onClick={() => toggleType(type)} type="button"><span style={{ backgroundColor: typeColors[type] || "#64748b" }}></span>{humanizeBusinessValue(type, undefined, locale)}<small>{graph.data?.nodes.filter((node) => node.entityType === type).length}</small></button>)}{enabledTypes.length ? <button onClick={() => setEnabledTypes([])} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i> Clear</button> : null}</div>
      {activeFocus ? <div className="company-graph-focusbar"><button disabled={mode === "all" || activeFocus.id === graph.data?.rootNodeId} onClick={() => graph.data?.rootNodeId && focusNode(graph.data.rootNodeId)} type="button"><i className="ph-bold ph-buildings" aria-hidden="true"></i>{mode === "all" ? "Whole company" : "Company map"}</button><i className="ph-bold ph-caret-right" aria-hidden="true"></i><strong>{mode === "all" ? "Every mapped object and relationship" : activeFocus.label}</strong><span>{mode === "all" ? "Use layer filters to reduce the canvas without losing the company context." : "Double-click a node to explore its direct relationships."}</span></div> : null}
      {graph.status === "error" ? <div className="p-4"><CcNotice live tone="error" title={graph.error || "Company Graph could not load."} /></div> : null}
      {graph.status === "loading" ? <div className="p-4"><CcNotice live tone="loading" title="Building Company Graph…" detail="Loading canonical objects, organizational memberships and typed dependencies." /></div> : null}
      {graph.status === "ready" && !visibleRecords.length ? <div className="p-4"><CcNotice tone="empty" title="No objects match these filters" detail="Clear a layer filter or adjust the graph search." /></div> : null}
      {visibleRecords.length ? <div className={`company-graph-stage${selected ? " has-inspector" : ""}`}><div className="company-graph-canvas"><ReactFlow edges={edges} maxZoom={1.6} minZoom={mode === "all" ? 0.08 : 0.45} nodes={nodes} nodeTypes={nodeTypes} onInit={setFlow} onNodeClick={(_event, node) => setSelectedId(node.id)} onNodeDoubleClick={(_event, node) => { setMode("explore"); focusNode(node.id); }} onPaneClick={() => setSelectedId(null)} proOptions={{ hideAttribution: true }}><Background color="rgba(126, 143, 179, .22)" gap={28} size={1} variant={BackgroundVariant.Dots} /><MiniMap ariaLabel="Company Graph minimap" maskColor="rgba(9, 13, 25, .72)" nodeColor={(node) => String(node.style?.borderColor || "#64748b")} pannable zoomable /><Controls position="bottom-left" showInteractive={false} /></ReactFlow></div>{selected ? <aside className="company-graph-inspector"><button aria-label="Close inspector" className="btn btn-ghost btn-circle btn-sm" onClick={() => setSelectedId(null)} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button><p>{humanizeBusinessValue(selected.recordType || selected.entityType, undefined, locale)}</p><h2>{selected.label}</h2><span className="badge badge-outline">{humanizeBusinessValue(selected.state || "unknown", undefined, locale)}</span><section><h3>Departments</h3>{selectedMemberships.length ? selectedMemberships.map((membership) => <div className="flex justify-between gap-2 text-sm" key={`${membership.departmentKey}:${membership.role}`}><strong>{humanizeBusinessValue(membership.departmentKey)}</strong><span>{humanizeBusinessValue(membership.role)}</span></div>) : <span className="text-sm text-company-muted">{["workspace", "department"].includes(selected.entityType) ? "Structural graph anchor" : "No organizational assignment"}</span>}</section><section><h3>Connected objects</h3><p>{allEdges.filter((edge) => edge.from.entityId === selected.id || edge.to.entityId === selected.id).length} direct relationships in the company graph</p></section>{selected.id !== activeFocus?.id || mode === "all" ? <CcButton iconLeft="ph-crosshair" onClick={() => { setMode("explore"); focusNode(selected.id); }} variant="primary">Explore relationships</CcButton> : null}<CcButton href={entityHref(selected)} iconLeft="ph-arrow-square-out" variant={selected.id === activeFocus?.id && mode === "explore" ? "primary" : "outline"}>Open full context</CcButton></aside> : null}</div> : null}
    </section>
  </>;
}
