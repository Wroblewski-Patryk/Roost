import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { layoutUnifiedGraph3D, type UnifiedGraphPosition } from "./unified-graph-layout";
import "./unified-graph-3d.css";

export type UnifiedGraphNode = {
  id: string;
  type: string;
  label: string;
  category?: string;
  status?: string;
  parentId?: string | null;
  color?: string;
  weight?: number;
  emphasis?: "anchor" | "standard" | "attention" | "blocked";
};

export type UnifiedGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string | null;
  status?: string;
  emphasis?: "standard" | "muted" | "attention" | "blocked";
};

type Props = {
  nodes: UnifiedGraphNode[];
  edges: UnifiedGraphEdge[];
  rootId: string;
  focusId?: string | null;
  selectedId?: string | null;
  ariaLabel: string;
  emptyLabel?: string;
  onNodeSelect?: (node: UnifiedGraphNode) => void;
  onNodeActivate?: (node: UnifiedGraphNode) => void;
  onClearSelection?: () => void;
};

type ZoomCommand = { sequence: number; factor: number };

const fallbackColor = "#7f8da8";

function radiusFor(node: UnifiedGraphNode, selected: boolean, focused: boolean) {
  const base = node.emphasis === "anchor" ? 0.72 : node.emphasis === "blocked" ? 0.6 : 0.48;
  return base * (1 + Math.min(0.45, (node.weight || 0) / 250)) * (selected || focused ? 1.28 : 1);
}

function CameraRig({ positions, pivotId, zoomCommand }: { positions: Map<string, UnifiedGraphPosition>; pivotId: string; zoomCommand: ZoomCommand }) {
  const { camera, size } = useThree();
  const target = positions.get(pivotId) || { x: 0, y: 0, z: 0 };
  const initialized = useRef(false);
  const previousTarget = useRef(new THREE.Vector3(target.x, target.y, target.z));
  const previousZoomSequence = useRef(zoomCommand.sequence);
  const extent = useMemo(() => {
    let value = 8;
    positions.forEach((position) => {
      value = Math.max(value, Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z));
    });
    return value;
  }, [positions, target.x, target.y, target.z]);

  useEffect(() => {
    const nextTarget = new THREE.Vector3(target.x, target.y, target.z);
    if (initialized.current) {
      camera.position.add(nextTarget.clone().sub(previousTarget.current));
      camera.lookAt(nextTarget);
      camera.updateProjectionMatrix();
      previousTarget.current.copy(nextTarget);
      return;
    }
    const aspect = Math.max(0.55, size.width / Math.max(1, size.height));
    const distance = extent * (aspect < 1 ? 1.85 / aspect : 1.85);
    camera.position.set(target.x + distance * 0.24, target.y + distance * 0.16, target.z + distance * 0.94);
    camera.lookAt(nextTarget);
    camera.updateProjectionMatrix();
    previousTarget.current.copy(nextTarget);
    initialized.current = true;
  }, [camera, extent, size.height, size.width, target.x, target.y, target.z]);

  useEffect(() => {
    if (zoomCommand.sequence === previousZoomSequence.current) return;
    previousZoomSequence.current = zoomCommand.sequence;
    const pivot = new THREE.Vector3(target.x, target.y, target.z);
    const offset = camera.position.clone().sub(pivot);
    const nextDistance = THREE.MathUtils.clamp(offset.length() * zoomCommand.factor, 3.5, Math.max(72, extent * 6));
    camera.position.copy(pivot.clone().add(offset.setLength(nextDistance)));
    camera.lookAt(pivot);
    camera.updateProjectionMatrix();
  }, [camera, extent, target.x, target.y, target.z, zoomCommand.factor, zoomCommand.sequence]);

  return <OrbitControls makeDefault target={[target.x, target.y, target.z]} enableDamping dampingFactor={0.09} minDistance={3.5} maxDistance={Math.max(72, extent * 6)} screenSpacePanning />;
}

function EdgeCloud({ edges, positions, selectedId }: { edges: UnifiedGraphEdge[]; positions: Map<string, UnifiedGraphPosition>; selectedId?: string | null }) {
  const geometry = useMemo(() => {
    const coordinates: number[] = [];
    const colors: number[] = [];
    edges.forEach((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return;
      coordinates.push(source.x, source.y, source.z, target.x, target.y, target.z);
      const connected = selectedId === edge.source || selectedId === edge.target;
      const color = new THREE.Color(selectedId && !connected ? "#202839" : edge.emphasis === "blocked" ? "#d66565" : edge.emphasis === "attention" ? "#d4a35d" : connected ? "#c9d2ff" : edge.emphasis === "muted" ? "#37445c" : "#667694");
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    });
    const value = new THREE.BufferGeometry();
    value.setAttribute("position", new THREE.Float32BufferAttribute(coordinates, 3));
    value.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return value;
  }, [edges, positions, selectedId]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry}><lineBasicMaterial vertexColors transparent opacity={selectedId ? 0.72 : 0.56} /></lineSegments>;
}

function NodeCloud({ nodes, positions, focusId, selectedId, highlightedIds, onHover, onSelect, onActivate }: {
  nodes: UnifiedGraphNode[];
  positions: Map<string, UnifiedGraphPosition>;
  focusId: string;
  selectedId?: string | null;
  highlightedIds: Set<string> | null;
  onHover: (node: UnifiedGraphNode | null) => void;
  onSelect?: (node: UnifiedGraphNode) => void;
  onActivate?: (node: UnifiedGraphNode) => void;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    nodes.forEach((node, index) => {
      const position = positions.get(node.id) || { x: 0, y: 0, z: 0 };
      const radius = radiusFor(node, node.id === selectedId, node.id === focusId);
      dummy.position.set(position.x, position.y, position.z);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
      const dimmed = highlightedIds && !highlightedIds.has(node.id);
      mesh.current!.setColorAt(index, new THREE.Color(dimmed ? "#394153" : node.emphasis === "blocked" ? "#d66565" : node.emphasis === "attention" ? "#d4a35d" : node.color || fallbackColor));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [dummy, focusId, highlightedIds, nodes, positions, selectedId]);

  const resolveNode = (event: ThreeEvent<PointerEvent | MouseEvent>) => typeof event.instanceId === "number" ? nodes[event.instanceId] : null;
  return <instancedMesh
    ref={mesh}
    args={[undefined, undefined, nodes.length]}
    onClick={(event) => { event.stopPropagation(); const node = resolveNode(event); if (node) onSelect?.(node); }}
    onDoubleClick={(event) => { event.stopPropagation(); const node = resolveNode(event); if (node) onActivate?.(node); }}
    onPointerOver={(event) => { event.stopPropagation(); const node = resolveNode(event); if (node) onHover(node); }}
    onPointerOut={() => onHover(null)}
  >
    <icosahedronGeometry args={[1, 2]} />
    <meshStandardMaterial roughness={0.38} metalness={0.18} emissive="#111827" emissiveIntensity={0.32} />
  </instancedMesh>;
}

function GraphScene(props: Props & { hovered: UnifiedGraphNode | null; viewKey: number; zoomCommand: ZoomCommand; onHover: (node: UnifiedGraphNode | null) => void }) {
  const positions = useMemo(() => layoutUnifiedGraph3D(props.nodes, props.edges, props.focusId || props.rootId), [props.edges, props.focusId, props.nodes, props.rootId]);
  const focusId = props.focusId || props.rootId;
  const pivotId = props.selectedId || focusId;
  const highlightedIds = useMemo(() => {
    if (!props.selectedId) return null;
    const ids = new Set<string>([props.selectedId]);
    props.edges.forEach((edge) => {
      if (edge.source === props.selectedId) ids.add(edge.target);
      if (edge.target === props.selectedId) ids.add(edge.source);
    });
    return ids;
  }, [props.edges, props.selectedId]);
  const labelNodes = useMemo(() => {
    const ids = new Set([focusId, props.selectedId, props.hovered?.id].filter((id): id is string => Boolean(id)));
    return [...ids].map((id) => props.nodes.find((node) => node.id === id)).filter((node): node is UnifiedGraphNode => Boolean(node));
  }, [focusId, props.hovered?.id, props.nodes, props.selectedId]);

  return <>
    <color attach="background" args={["#080d19"]} />
    <fog attach="fog" args={["#080d19", 48, 180]} />
    <ambientLight intensity={1.08} />
    <directionalLight intensity={2.2} position={[8, 12, 10]} />
    <pointLight color="#7187ef" intensity={38} position={[0, 1, 0]} distance={72} />
    <EdgeCloud edges={props.edges} positions={positions} selectedId={props.selectedId} />
    <NodeCloud nodes={props.nodes} positions={positions} focusId={focusId} highlightedIds={highlightedIds} selectedId={props.selectedId} onHover={props.onHover} onSelect={(node) => node.id === props.selectedId ? props.onClearSelection?.() : props.onNodeSelect?.(node)} onActivate={props.onNodeActivate} />
    {labelNodes.map((node) => {
      const position = positions.get(node.id);
      if (!position) return null;
      const active = node.id === focusId || node.id === props.selectedId;
      return <Html center key={node.id} position={[position.x, position.y + radiusFor(node, false, active) + 0.48, position.z]} zIndexRange={[12, 1]}>
          <button className="unified-graph3d-label" data-active={active || undefined} data-hovered={node.id === props.hovered?.id || undefined} onClick={(event) => { event.stopPropagation(); node.id === props.selectedId ? props.onClearSelection?.() : props.onNodeSelect?.(node); }} onDoubleClick={(event) => { event.stopPropagation(); props.onNodeActivate?.(node); }} type="button">
            <small>{node.category || node.type}</small><strong>{node.label}</strong>{node.status ? <span>{node.status}</span> : null}
          </button>
        </Html>;
    })}
    <gridHelper args={[80, 40, "#28344d", "#131c2c"]} position={[0, -10, 0]} />
    <CameraRig key={props.viewKey} positions={positions} pivotId={pivotId} zoomCommand={props.zoomCommand} />
  </>;
}

export function UnifiedGraph3D(props: Props) {
  const [hovered, setHovered] = useState<UnifiedGraphNode | null>(null);
  const [viewKey, setViewKey] = useState(0);
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ sequence: 0, factor: 1 });
  if (!props.nodes.length) return <div className="unified-graph3d unified-graph3d--empty">{props.emptyLabel || "No graph records to display."}</div>;

  return <div aria-label={props.ariaLabel} className="unified-graph3d" role="application">
    <Canvas camera={{ fov: 48, near: 0.1, far: 240 }} dpr={[1, 1.65]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onPointerMissed={props.onClearSelection}>
      <GraphScene {...props} hovered={hovered} onHover={setHovered} viewKey={viewKey} zoomCommand={zoomCommand} />
    </Canvas>
    <div className="unified-graph3d-controls">
      {props.selectedId ? <button onClick={props.onClearSelection} title="Clear graph selection" type="button"><i className="ph-bold ph-x" aria-hidden="true"></i><span>Clear selection</span></button> : null}
      <div aria-label="Graph zoom" className="unified-graph3d-zoom" role="group"><button aria-label="Zoom in" onClick={() => setZoomCommand((value) => ({ sequence: value.sequence + 1, factor: 0.72 }))} title="Zoom in" type="button"><i className="ph-bold ph-plus" aria-hidden="true"></i></button><button aria-label="Zoom out" onClick={() => setZoomCommand((value) => ({ sequence: value.sequence + 1, factor: 1.38 }))} title="Zoom out" type="button"><i className="ph-bold ph-minus" aria-hidden="true"></i></button></div>
      <button onClick={() => setViewKey((value) => value + 1)} title="Reset 3D view" type="button"><i className="ph-bold ph-crosshair" aria-hidden="true"></i><span>Reset</span></button>
      <span><i className="ph-bold ph-cube" aria-hidden="true"></i> Drag to orbit · scroll zooms {props.selectedId ? "selection" : "focus"}</span>
    </div>
    <div className="unified-graph3d-access" aria-label="Keyboard graph navigation">
      {props.nodes.slice(0, 80).map((node) => <button key={node.id} onClick={() => props.onNodeSelect?.(node)} onDoubleClick={() => props.onNodeActivate?.(node)} type="button">{node.label}</button>)}
    </div>
  </div>;
}
