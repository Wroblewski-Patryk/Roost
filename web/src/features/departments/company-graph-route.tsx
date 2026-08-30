import { useEffect, useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, MarkerType, MiniMap, ReactFlow, type Edge, type Node, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue } from "./shared";
import { layoutCompanyGraphNodes } from "./company-graph-layout";

type GraphNode = { id: string; entityType: string; recordType?: string; label: string; state?: string };
type GraphEdge = { id: string; type: string; from: { entityType: string; entityId: string }; to: { entityType: string; entityId: string }; status: string };
type GraphPacket = { schemaVersion: string; generatedAt: string; nodes: GraphNode[]; edges: GraphEdge[]; organizationalMemberships: Array<{ entityType: string; entityId: string; departmentKey: string; role: string }> };
type HealthPacket = { score: number; status: string; signals: Record<string, unknown> };

const typeColors: Record<string, string> = { goal: "#7c3aed", project: "#2563eb", application: "#0891b2", company_record: "#4f46e5", task: "#ea580c", procedure: "#16a34a", risk: "#dc2626", metric: "#0d9488", resource: "#64748b", policy: "#9333ea", client: "#db2777", workforce: "#ca8a04" };
function entityHref(node: GraphNode) { return `/areas?area=00-ogolny&view=entity&type=${encodeURIComponent(node.recordType === "requirement" ? "requirement" : node.entityType)}&id=${encodeURIComponent(node.id)}`; }

export function CompanyGraphRoute() {
  const { locale, t } = useLanguage(); const graph = useOwnerPacket<GraphPacket>("/v1/company-intelligence/graph", true, t); const health = useOwnerPacket<HealthPacket>("/v1/company-intelligence/health", true, t); const [query, setQuery] = useState(""); const [enabledTypes, setEnabledTypes] = useState<string[]>([]); const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const availableTypes = useMemo(() => [...new Set((graph.data?.nodes || []).map((node) => node.entityType))].sort(), [graph.data]);
  const visibleRecords = useMemo(() => { const normalized = query.trim().toLocaleLowerCase(); return (graph.data?.nodes || []).filter((node) => (!enabledTypes.length || enabledTypes.includes(node.entityType)) && (!normalized || `${node.label} ${node.entityType} ${node.recordType || ""}`.toLocaleLowerCase().includes(normalized))); }, [enabledTypes, graph.data, query]);
  const visibleIds = useMemo(() => new Set(visibleRecords.map((node) => node.id)), [visibleRecords]);
  const nodes = useMemo<Array<Node>>(() => {
    const visibleEdges = (graph.data?.edges || []).filter((edge) => visibleIds.has(edge.from.entityId) && visibleIds.has(edge.to.entityId));
    const positions = layoutCompanyGraphNodes(visibleRecords, visibleEdges);
    return visibleRecords.map((record) => ({ id: record.id, position: positions.get(record.id) ?? { x: 0, y: 0 }, data: { label: <div className="company-graph-node-copy"><small>{humanizeBusinessValue(record.recordType || record.entityType, undefined, locale)}</small><strong>{record.label}</strong><span>{humanizeBusinessValue(record.state || "unknown", undefined, locale)}</span></div> }, className: `company-graph-node${selectedId === record.id ? " is-selected" : ""}`, style: { borderColor: typeColors[record.entityType] || "#64748b", borderLeftWidth: 5, width: 220 }, zIndex: selectedId === record.id ? 2 : 0 }));
  }, [graph.data, locale, selectedId, visibleIds, visibleRecords]);
  const edges = useMemo<Array<Edge>>(() => (graph.data?.edges || []).filter((edge) => visibleIds.has(edge.from.entityId) && visibleIds.has(edge.to.entityId)).map((edge) => {
    const connectedToSelection = selectedId === edge.from.entityId || selectedId === edge.to.entityId;
    const stroke = edge.status === "blocked" ? "#dc626f" : connectedToSelection ? "#8ea5ff" : "#71809d";
    return { id: edge.id, source: edge.from.entityId, target: edge.to.entityId, type: "straight", label: humanizeBusinessValue(edge.type), animated: edge.status === "blocked", markerEnd: { type: MarkerType.ArrowClosed, color: stroke }, labelBgBorderRadius: 5, labelBgPadding: [5, 3], labelBgStyle: { fill: "#111827", fillOpacity: 0.94 }, labelStyle: { fill: "#d3daea", fontSize: 10, fontWeight: 700 }, style: { stroke, strokeOpacity: connectedToSelection || !selectedId ? 0.86 : 0.22, strokeWidth: connectedToSelection ? 2.6 : 1.6 }, zIndex: connectedToSelection ? 1 : 0 };
  }), [graph.data, selectedId, visibleIds]);
  const selected = (graph.data?.nodes || []).find((node) => node.id === selectedId) || null; const selectedMemberships = selected ? (graph.data?.organizationalMemberships || []).filter((item) => item.entityId === selected.id && item.entityType === selected.entityType) : [];
  useEffect(() => {
    if (!flow || !visibleRecords.length) return;
    const frame = window.requestAnimationFrame(() => void flow.fitView({ duration: 320, maxZoom: 1, minZoom: 0.45, padding: 0.16 }));
    return () => window.cancelAnimationFrame(frame);
  }, [flow, visibleRecords]);
  function toggleType(type: string) { setEnabledTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]); }
  return <><CcPageHeader actions={<CcButton href="/areas?area=00-ogolny&view=overview" iconLeft="ph-gauge" size="sm" variant="outline">Company dashboard</CcButton>} description="Interactive, whole-workspace state graph. Filter layers, inspect typed relationships and open any canonical object without switching between mini-applications." eyebrow="00 General · Company intelligence" title="Company Graph" />
    <section className="roost-work-panel rounded-company overflow-hidden">
      <header className="company-graph-toolbar"><label className="company-graph-search"><i className="ph-bold ph-magnifying-glass" aria-hidden="true"></i><input aria-label="Search Company Graph" onChange={(event) => setQuery(event.target.value)} placeholder="Search objects and layers…" type="search" value={query} /></label><div className="company-graph-health"><span className={`badge badge-outline company-graph-health--${health.data?.status || "unknown"}`}>{health.data ? `${health.data.score}% ${humanizeBusinessValue(health.data.status)}` : "Health…"}</span><span>{visibleRecords.length} nodes · {edges.length} relations</span></div></header>
      <div className="company-graph-filterbar" aria-label="Entity layer filters">{availableTypes.map((type) => <button aria-pressed={enabledTypes.includes(type)} className={enabledTypes.includes(type) ? "is-active" : ""} key={type} onClick={() => toggleType(type)} type="button"><span style={{ backgroundColor: typeColors[type] || "#64748b" }}></span>{humanizeBusinessValue(type, undefined, locale)}<small>{graph.data?.nodes.filter((node) => node.entityType === type).length}</small></button>)}{enabledTypes.length ? <button onClick={() => setEnabledTypes([])} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i> Clear</button> : null}</div>
      {graph.status === "error" ? <div className="p-4"><CcNotice live tone="error" title={graph.error || "Company Graph could not load."} /></div> : null}
      {graph.status === "loading" ? <div className="p-4"><CcNotice live tone="loading" title="Building Company Graph…" detail="Loading canonical objects, organizational memberships and typed dependencies." /></div> : null}
      {graph.status === "ready" && !visibleRecords.length ? <div className="p-4"><CcNotice tone="empty" title="No objects match these filters" detail="Clear a layer filter or adjust the graph search." /></div> : null}
      {visibleRecords.length ? <div className={`company-graph-stage${selected ? " has-inspector" : ""}`}><div className="company-graph-canvas"><ReactFlow edges={edges} maxZoom={1.6} minZoom={0.45} nodes={nodes} onInit={setFlow} onNodeClick={(_event, node) => setSelectedId(node.id)} proOptions={{ hideAttribution: true }}><Background color="rgba(126, 143, 179, .22)" gap={28} size={1} variant={BackgroundVariant.Dots} /><MiniMap ariaLabel="Company Graph minimap" maskColor="rgba(9, 13, 25, .72)" nodeColor={(node) => String(node.style?.borderColor || "#64748b")} pannable zoomable /><Controls position="bottom-left" showInteractive={false} /></ReactFlow></div>{selected ? <aside className="company-graph-inspector"><button aria-label="Close inspector" className="btn btn-ghost btn-circle btn-sm" onClick={() => setSelectedId(null)} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button><p>{humanizeBusinessValue(selected.recordType || selected.entityType, undefined, locale)}</p><h2>{selected.label}</h2><span className="badge badge-outline">{humanizeBusinessValue(selected.state || "unknown", undefined, locale)}</span><section><h3>Departments</h3>{selectedMemberships.length ? selectedMemberships.map((membership) => <div className="flex justify-between gap-2 text-sm" key={`${membership.departmentKey}:${membership.role}`}><strong>{humanizeBusinessValue(membership.departmentKey)}</strong><span>{humanizeBusinessValue(membership.role)}</span></div>) : <span className="text-sm text-company-muted">No organizational assignment</span>}</section><section><h3>Connected objects</h3><p>{edges.filter((edge) => edge.source === selected.id || edge.target === selected.id).length} visible typed relationships</p></section><CcButton href={entityHref(selected)} iconLeft="ph-arrow-square-out" variant="primary">Open full context</CcButton></aside> : null}</div> : null}
    </section>
  </>;
}
