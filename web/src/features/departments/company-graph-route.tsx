import { useEffect, useMemo, useState } from "react";
import { CcButton } from "../../components/cc-button";
import { CcNotice } from "../../components/cc-notice";
import { CcPageHeader } from "../../components/cc-page-header";
import { UnifiedGraph3D, type UnifiedGraphEdge, type UnifiedGraphNode } from "../../components/graph/unified-graph-3d";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { humanizeBusinessValue } from "./shared";

type GraphNode = { id: string; entityType: string; recordType?: string; label: string; state?: string };
type GraphEdge = { id: string; type: string; from: { entityType: string; entityId: string }; to: { entityType: string; entityId: string }; status: string; source?: "explicit" | "structural" | "derived" | "fallback" };
type GraphPacket = { schemaVersion: string; generatedAt: string; rootNodeId: string; nodes: GraphNode[]; edges: GraphEdge[]; summary?: { recordCount: number; contextualizedRecordCount: number; unassignedRecordCount: number; unrootedComponentCount: number; relationshipCoverage: number }; organizationalMemberships: Array<{ entityType: string; entityId: string; departmentKey: string; role: string }> };

const typeColors: Record<string, string> = { workspace: "#8ea5ff", department: "#7c8bad", portfolio: "#9a8cff", goal: "#7c3aed", project: "#2563eb", application: "#0891b2", domain: "#14b8a6", capability: "#22c55e", feature: "#84cc16", layer: "#a855f7", implementation: "#64748b", requirement: "#4f46e5", company_record: "#4f46e5", task: "#ea580c", task_list: "#b7791f", procedure: "#16a34a", procedure_step: "#65a30d", risk: "#dc2626", metric: "#0d9488", resource: "#64748b", file: "#64748b", policy: "#9333ea", client: "#db2777", workforce: "#ca8a04" };
type GraphMode = "all" | "explore";
type PerspectiveDepth = 1 | 2 | 3 | "all";
function entityHref(node: GraphNode) {
  if (node.entityType === "workspace") return "/areas?area=00-ogolny&view=overview";
  if (node.entityType === "department" && node.recordType) return `/areas?area=${encodeURIComponent(node.recordType)}&view=overview`;
  if (["portfolio", "domain", "layer"].includes(node.entityType)) return "/areas?area=11-innowacje&view=application-graph";
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
  const { locale, t } = useLanguage(); const graph = useOwnerPacket<GraphPacket>("/v1/company-intelligence/graph", true, t); const [query, setQuery] = useState(""); const [enabledTypes, setEnabledTypes] = useState<string[]>([]); const [selectedId, setSelectedId] = useState<string | null>(null); const [focusId, setFocusId] = useState<string | null>(null); const [mode, setMode] = useState<GraphMode>("all"); const [perspectiveDepth, setPerspectiveDepth] = useState<PerspectiveDepth>("all");
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
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    allEdges.forEach((edge) => {
      incoming.set(edge.to.entityId, [...(incoming.get(edge.to.entityId) || []), edge.from.entityId]);
      outgoing.set(edge.from.entityId, [...(outgoing.get(edge.from.entityId) || []), edge.to.entityId]);
    });
    const candidateIds = new Set<string>([activeFocus.id]);
    const addAncestors = (startId: string) => {
      const frontier = [startId];
      for (let cursor = 0; cursor < frontier.length; cursor += 1) {
        (incoming.get(frontier[cursor]) || []).forEach((id) => {
          if (candidateIds.has(id)) return;
          candidateIds.add(id);
          frontier.push(id);
        });
      }
    };
    addAncestors(activeFocus.id);
    if (normalized.length >= 2) {
      const matches = allRecords
        .filter((node) => !["workspace", "department"].includes(node.entityType))
        .filter(passesType)
        .filter((node) => `${node.label} ${node.entityType} ${node.recordType || ""}`.toLocaleLowerCase().includes(normalized))
        .sort((left, right) => nodePriority(left) - nodePriority(right) || left.label.localeCompare(right.label));
      matches.forEach((node) => { candidateIds.add(node.id); addAncestors(node.id); });
    } else {
      let frontier = [activeFocus.id];
      let depth = 0;
      while (frontier.length && (perspectiveDepth === "all" || depth < perspectiveDepth)) {
        const next: string[] = [];
        frontier.forEach((id) => (outgoing.get(id) || []).forEach((childId) => {
          if (candidateIds.has(childId)) return;
          const child = recordById.get(childId);
          if (!child || !passesType(child)) return;
          candidateIds.add(childId);
          next.push(childId);
        }));
        frontier = next;
        depth += 1;
      }
    }
    const candidates = [...candidateIds].map((id) => recordById.get(id)).filter((node): node is GraphNode => Boolean(node)).sort((left, right) => left.id === activeFocus.id ? -1 : right.id === activeFocus.id ? 1 : nodePriority(left) - nodePriority(right) || left.label.localeCompare(right.label));
    return { records: candidates, total: candidates.length };
  }, [activeFocus, allEdges, allRecords, enabledTypes, mode, perspectiveDepth, query, recordById]);
  const visibleRecords = visibility.records;
  const visibleIds = useMemo(() => new Set(visibleRecords.map((node) => node.id)), [visibleRecords]);
  const parentById = useMemo(() => {
    const priority = (edge: GraphEdge) => edge.source === "structural" ? 0 : edge.source === "derived" ? 1 : edge.source === "fallback" ? 2 : 3;
    const incoming = [...allEdges].sort((left, right) => priority(left) - priority(right)).reduce((result, edge) => {
      if (!result.has(edge.to.entityId)) result.set(edge.to.entityId, edge.from.entityId);
      return result;
    }, new Map<string, string>());
    return incoming;
  }, [allEdges]);
  const nodes = useMemo<UnifiedGraphNode[]>(() => visibleRecords.map((record) => ({
    id: record.id,
    type: record.entityType,
    label: record.label,
    category: humanizeBusinessValue(record.recordType || record.entityType, undefined, locale),
    status: record.entityType === "workspace" ? `${allRecords.length - 1} mapped records` : humanizeBusinessValue(record.state || "unknown", undefined, locale),
    parentId: parentById.get(record.id),
    color: typeColors[record.entityType] || "#64748b",
    weight: allEdges.filter((edge) => edge.from.entityId === record.id || edge.to.entityId === record.id).length,
    emphasis: ["workspace", "department"].includes(record.entityType) ? "anchor" : record.state === "blocked" ? "blocked" : "standard"
  })), [allEdges, allRecords.length, locale, parentById, visibleRecords]);
  const edges = useMemo<UnifiedGraphEdge[]>(() => allEdges.filter((edge) => visibleIds.has(edge.from.entityId) && visibleIds.has(edge.to.entityId)).map((edge) => ({
    id: edge.id,
    source: edge.from.entityId,
    target: edge.to.entityId,
    type: edge.type,
    label: humanizeBusinessValue(edge.type),
    status: edge.status,
    emphasis: edge.status === "blocked" ? "blocked" : edge.source === "fallback" ? "attention" : edge.source === "explicit" ? "standard" : "muted"
  })), [allEdges, visibleIds]);
  const selected = selectedId ? recordById.get(selectedId) || null : null; const selectedMemberships = selected ? (graph.data?.organizationalMemberships || []).filter((item) => item.entityId === selected.id && item.entityType === selected.entityType) : [];
  function toggleType(type: string) { setEnabledTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]); }
  function focusNode(id: string) { setFocusId(id); setSelectedId(id); setQuery(""); }
  return <><CcPageHeader actions={<CcButton href="/areas?area=00-ogolny&view=overview" iconLeft="ph-gauge" size="sm" variant="outline">Company dashboard</CcButton>} description="Interactive, whole-workspace state graph. Filter layers, inspect typed relationships and open any canonical object without switching between mini-applications." eyebrow="00 General · Company intelligence" title="Company Graph" />
    <section className="roost-work-panel rounded-company overflow-hidden">
      <header className="company-graph-toolbar"><label className="company-graph-search"><i className="ph-bold ph-magnifying-glass" aria-hidden="true"></i><input aria-label="Search Company Graph" onChange={(event) => setQuery(event.target.value)} placeholder="Search objects and relationships…" type="search" value={query} /></label><div className="company-graph-mode" aria-label="Graph scope"><button aria-pressed={mode === "all"} className={mode === "all" ? "is-active" : ""} onClick={() => setMode("all")} type="button"><i className="ph-bold ph-share-network" aria-hidden="true"></i> Full company</button><button aria-pressed={mode === "explore"} className={mode === "explore" ? "is-active" : ""} onClick={() => setMode("explore")} type="button"><i className="ph-bold ph-crosshair" aria-hidden="true"></i> Focused perspective</button></div><div className="company-graph-health"><span className={`badge badge-outline company-graph-health--${graph.data?.summary?.unassignedRecordCount ? "attention" : "healthy"}`}>{graph.data?.summary ? `${graph.data.summary.relationshipCoverage}% contextualized` : "Coverage…"}</span><span>{visibleRecords.length} nodes · {edges.length} relations{graph.data?.summary?.unassignedRecordCount ? ` · ${graph.data.summary.unassignedRecordCount} need context` : ""}</span></div></header>
      <div className="company-graph-filterbar" aria-label="Entity layer filters">{availableTypes.map((type) => <button aria-pressed={enabledTypes.includes(type)} className={enabledTypes.includes(type) ? "is-active" : ""} key={type} onClick={() => toggleType(type)} type="button"><span style={{ backgroundColor: typeColors[type] || "#64748b" }}></span>{humanizeBusinessValue(type, undefined, locale)}<small>{graph.data?.nodes.filter((node) => node.entityType === type).length}</small></button>)}{enabledTypes.length ? <button onClick={() => setEnabledTypes([])} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i> Clear</button> : null}</div>
      {activeFocus ? <div className="company-graph-focusbar"><button disabled={mode === "all" || activeFocus.id === graph.data?.rootNodeId} onClick={() => graph.data?.rootNodeId && focusNode(graph.data.rootNodeId)} type="button"><i className="ph-bold ph-buildings" aria-hidden="true"></i>{mode === "all" ? "Whole company" : "Company map"}</button><i className="ph-bold ph-caret-right" aria-hidden="true"></i><strong>{mode === "all" ? "Every mapped object and relationship" : activeFocus.label}</strong>{mode === "explore" ? <span className="application-graph-depth" aria-label="Perspective depth"><i className="ph-bold ph-circles-three" aria-hidden="true"></i> Depth {([1, 2, 3, "all"] as const).map((depth) => <button aria-pressed={perspectiveDepth === depth} className={perspectiveDepth === depth ? "is-active" : ""} key={depth} onClick={() => setPerspectiveDepth(depth)} type="button">{depth === "all" ? "All" : depth}</button>)}</span> : <span>Use layer filters to reduce the cloud without losing company context.</span>}<span>{mode === "explore" ? "The complete lineage and selected depth of descendants stay visible." : "Double-click any node to open its complete perspective."}</span></div> : null}
      {graph.status === "error" ? <div className="p-4"><CcNotice live tone="error" title={graph.error || "Company Graph could not load."} /></div> : null}
      {graph.status === "loading" ? <div className="p-4"><CcNotice live tone="loading" title="Building Company Graph…" detail="Loading canonical objects, organizational memberships and typed dependencies." /></div> : null}
      {graph.status === "ready" && !visibleRecords.length ? <div className="p-4"><CcNotice tone="empty" title="No objects match these filters" detail="Clear a layer filter or adjust the graph search." /></div> : null}
      {visibleRecords.length ? <div className={`company-graph-stage${selected ? " has-inspector" : ""}`}><div className="company-graph-canvas"><UnifiedGraph3D ariaLabel="Interactive 3D map of company relationships" edges={edges} focusId={activeFocus?.id} nodes={nodes} onClearSelection={() => setSelectedId(null)} onNodeActivate={(node) => { setMode("explore"); focusNode(node.id); }} onNodeSelect={(node) => setSelectedId(node.id)} rootId={graph.data?.rootNodeId || visibleRecords[0].id} selectedId={selectedId} /></div>{selected ? <aside className="company-graph-inspector"><button aria-label="Close inspector" className="btn btn-ghost btn-circle btn-sm" onClick={() => setSelectedId(null)} type="button"><i className="ph-bold ph-x" aria-hidden="true"></i></button><p>{humanizeBusinessValue(selected.recordType || selected.entityType, undefined, locale)}</p><h2>{selected.label}</h2><span className="badge badge-outline">{humanizeBusinessValue(selected.state || "unknown", undefined, locale)}</span><section><h3>Departments</h3>{selectedMemberships.length ? selectedMemberships.map((membership) => <div className="flex justify-between gap-2 text-sm" key={`${membership.departmentKey}:${membership.role}`}><strong>{humanizeBusinessValue(membership.departmentKey)}</strong><span>{humanizeBusinessValue(membership.role)}</span></div>) : <span className="text-sm text-company-muted">{["workspace", "department"].includes(selected.entityType) ? "Structural graph anchor" : "No organizational assignment"}</span>}</section><section><h3>Connected objects</h3><p>{allEdges.filter((edge) => edge.from.entityId === selected.id || edge.to.entityId === selected.id).length} direct relationships in the company graph</p></section>{selected.id !== activeFocus?.id || mode === "all" ? <CcButton iconLeft="ph-crosshair" onClick={() => { setMode("explore"); focusNode(selected.id); }} variant="primary">Explore relationships</CcButton> : null}<CcButton href={entityHref(selected)} iconLeft="ph-arrow-square-out" variant={selected.id === activeFocus?.id && mode === "explore" ? "primary" : "outline"}>Open full context</CcButton></aside> : null}</div> : null}
    </section>
  </>;
}
