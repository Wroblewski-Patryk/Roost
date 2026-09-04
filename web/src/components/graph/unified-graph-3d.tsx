import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { type ComponentRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { layoutUnifiedGraph3D, type UnifiedGraphPosition } from "./unified-graph-layout";
import { resolveGraphSelection, type GraphSelectionContext } from "./unified-graph-selection";
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
  const base = node.emphasis === "anchor" ? 0.46 : node.emphasis === "blocked" ? 0.34 : node.emphasis === "attention" ? 0.3 : 0.24;
  return base * (1 + Math.min(0.28, (node.weight || 0) / 360)) * (selected || focused ? 1.22 : 1);
}

function colorFor(node: UnifiedGraphNode) {
  return new THREE.Color(node.emphasis === "blocked" ? "#d96b67" : node.emphasis === "attention" ? "#d0a354" : node.color || fallbackColor);
}

function CameraRig({ positions, pivotId, resetSequence, zoomCommand }: { positions: Map<string, UnifiedGraphPosition>; pivotId: string; resetSequence: number; zoomCommand: ZoomCommand }) {
  const { camera, size } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const target = positions.get(pivotId) || { x: 0, y: 0, z: 0 };
  const initialized = useRef(false);
  const transitioning = useRef(false);
  const desiredTarget = useRef(new THREE.Vector3(target.x, target.y, target.z));
  const desiredPosition = useRef(new THREE.Vector3());
  const previousResetSequence = useRef(resetSequence);
  const previousZoomSequence = useRef(zoomCommand.sequence);
  const extent = useMemo(() => {
    let value = 8;
    positions.forEach((position) => {
      value = Math.max(value, Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z));
    });
    return value;
  }, [positions, target.x, target.y, target.z]);

  const framedPosition = () => {
    const aspect = Math.max(0.55, size.width / Math.max(1, size.height));
    const distance = extent * (aspect < 1 ? 1.85 / aspect : 1.85);
    return new THREE.Vector3(target.x + distance * 0.24, target.y + distance * 0.16, target.z + distance * 0.94);
  };

  useEffect(() => {
    const nextTarget = new THREE.Vector3(target.x, target.y, target.z);
    if (initialized.current) {
      const currentTarget = controls.current?.target || desiredTarget.current;
      const offset = camera.position.clone().sub(currentTarget);
      desiredTarget.current.copy(nextTarget);
      desiredPosition.current.copy(nextTarget).add(offset);
      transitioning.current = true;
      return;
    }
    const initialPosition = framedPosition();
    camera.position.copy(initialPosition);
    controls.current?.target.copy(nextTarget);
    desiredTarget.current.copy(nextTarget);
    desiredPosition.current.copy(initialPosition);
    camera.lookAt(nextTarget);
    camera.updateProjectionMatrix();
    initialized.current = true;
  }, [camera, extent, size.height, size.width, target.x, target.y, target.z]);

  useEffect(() => {
    if (resetSequence === previousResetSequence.current) return;
    previousResetSequence.current = resetSequence;
    desiredTarget.current.set(target.x, target.y, target.z);
    desiredPosition.current.copy(framedPosition());
    transitioning.current = true;
  }, [extent, resetSequence, size.height, size.width, target.x, target.y, target.z]);

  useEffect(() => {
    if (zoomCommand.sequence === previousZoomSequence.current) return;
    previousZoomSequence.current = zoomCommand.sequence;
    const pivot = controls.current?.target.clone() || new THREE.Vector3(target.x, target.y, target.z);
    const offset = camera.position.clone().sub(pivot);
    const nextDistance = THREE.MathUtils.clamp(offset.length() * zoomCommand.factor, 0.8, Math.max(96, extent * 8));
    desiredTarget.current.copy(pivot);
    desiredPosition.current.copy(pivot).add(offset.setLength(nextDistance));
    transitioning.current = true;
  }, [camera, extent, target.x, target.y, target.z, zoomCommand.factor, zoomCommand.sequence]);

  useFrame((_, delta) => {
    if (!transitioning.current || !controls.current) return;
    const step = Math.min(delta, 0.1);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPosition.current.x, 5.2, step);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPosition.current.y, 5.2, step);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPosition.current.z, 5.2, step);
    controls.current.target.x = THREE.MathUtils.damp(controls.current.target.x, desiredTarget.current.x, 6.4, step);
    controls.current.target.y = THREE.MathUtils.damp(controls.current.target.y, desiredTarget.current.y, 6.4, step);
    controls.current.target.z = THREE.MathUtils.damp(controls.current.target.z, desiredTarget.current.z, 6.4, step);
    controls.current.update();
    if (camera.position.distanceToSquared(desiredPosition.current) < 0.0004 && controls.current.target.distanceToSquared(desiredTarget.current) < 0.0004) {
      camera.position.copy(desiredPosition.current);
      controls.current.target.copy(desiredTarget.current);
      controls.current.update();
      transitioning.current = false;
    }
  });

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.09} minDistance={0.8} maxDistance={Math.max(96, extent * 8)} onEnd={() => { if (!controls.current) return; desiredTarget.current.copy(controls.current.target); desiredPosition.current.copy(camera.position); }} onStart={() => { transitioning.current = false; }} screenSpacePanning zoomSpeed={0.82} />;
}

function EdgeCloud({ edges, positions, selection }: { edges: UnifiedGraphEdge[]; positions: Map<string, UnifiedGraphPosition>; selection: GraphSelectionContext | null }) {
  const geometry = useMemo(() => {
    const coordinates: number[] = [];
    const colors: number[] = [];
    edges.forEach((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return;
      coordinates.push(source.x, source.y, source.z, target.x, target.y, target.z);
      const active = selection?.highlightedEdgeIds.has(edge.id);
      const onPath = selection?.pathEdgeIds.has(edge.id);
      const color = new THREE.Color(selection && !active ? "#202839" : onPath ? "#eef1ff" : active ? "#aebcf2" : edge.emphasis === "blocked" ? "#d66565" : edge.emphasis === "attention" ? "#d4a35d" : edge.emphasis === "muted" ? "#37445c" : "#667694");
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    });
    const value = new THREE.BufferGeometry();
    value.setAttribute("position", new THREE.Float32BufferAttribute(coordinates, 3));
    value.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return value;
  }, [edges, positions, selection]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry}><lineBasicMaterial vertexColors transparent opacity={selection ? 0.76 : 0.56} /></lineSegments>;
}

function NodeCloud({ nodes, positions, focusId, selectedId, hoveredId, highlightedIds, onHover, onSelect, onActivate }: {
  nodes: UnifiedGraphNode[];
  positions: Map<string, UnifiedGraphPosition>;
  focusId: string;
  selectedId?: string | null;
  hoveredId?: string | null;
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
      const active = highlightedIds?.has(node.id) || (!highlightedIds && node.id === focusId);
      const radius = radiusFor(node, node.id === selectedId || node.id === hoveredId, Boolean(active));
      dummy.position.set(position.x, position.y, position.z);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
      mesh.current!.setColorAt(index, colorFor(node));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [dummy, focusId, highlightedIds, hoveredId, nodes, positions, selectedId]);

  const resolveNode = (event: ThreeEvent<PointerEvent | MouseEvent>) => typeof event.instanceId === "number" ? nodes[event.instanceId] : null;
  return <instancedMesh
    ref={mesh}
    args={[undefined, undefined, nodes.length]}
    onClick={(event) => { event.stopPropagation(); const node = resolveNode(event); if (node) onSelect?.(node); }}
    onDoubleClick={(event) => { event.stopPropagation(); const node = resolveNode(event); if (node) onActivate?.(node); }}
    onPointerOver={(event) => { event.stopPropagation(); const node = resolveNode(event); if (node) onHover(node); }}
    onPointerOut={() => onHover(null)}
  >
    <icosahedronGeometry args={[1, 1]} />
    <meshStandardMaterial roughness={0.78} metalness={0.04} emissive="#141d30" emissiveIntensity={0.14} />
  </instancedMesh>;
}

function GraphScene(props: Props & { hovered: UnifiedGraphNode | null; resetSequence: number; zoomCommand: ZoomCommand; onHover: (node: UnifiedGraphNode | null) => void }) {
  const positions = useMemo(() => layoutUnifiedGraph3D(props.nodes, props.edges, props.focusId || props.rootId), [props.edges, props.focusId, props.nodes, props.rootId]);
  const focusId = props.focusId || props.rootId;
  const pivotId = props.selectedId || focusId;
  const selection = useMemo(() => resolveGraphSelection(props.edges, props.selectedId, props.rootId), [props.edges, props.rootId, props.selectedId]);
  const labelNodes = useMemo(() => {
    const ids = new Set<string>(selection ? selection.highlightedIds : [focusId]);
    if (props.hovered?.id) ids.add(props.hovered.id);
    return [...ids].map((id) => props.nodes.find((node) => node.id === id)).filter((node): node is UnifiedGraphNode => Boolean(node));
  }, [focusId, props.hovered?.id, props.nodes, selection]);

  return <>
    <color attach="background" args={["#080d19"]} />
    <fog attach="fog" args={["#080d19", 48, 180]} />
    <ambientLight intensity={1.28} />
    <directionalLight intensity={1.45} position={[8, 12, 10]} />
    <pointLight color="#7187ef" intensity={18} position={[0, 1, 0]} distance={92} />
    <EdgeCloud edges={props.edges} positions={positions} selection={selection} />
    <NodeCloud nodes={props.nodes} positions={positions} focusId={focusId} highlightedIds={selection?.highlightedIds || null} hoveredId={props.hovered?.id} selectedId={props.selectedId} onHover={props.onHover} onSelect={(node) => node.id === props.selectedId ? props.onClearSelection?.() : props.onNodeSelect?.(node)} onActivate={props.onNodeActivate} />
    {labelNodes.map((node) => {
      const position = positions.get(node.id);
      if (!position) return null;
      const active = node.id === props.selectedId || (!selection && node.id === focusId);
      const onPath = Boolean(selection?.pathIds.includes(node.id));
      const relationshipContext = !selection ? null : node.id === props.selectedId ? "Selected" : node.id === props.rootId && onPath ? "Workspace root" : onPath ? "Path to workspace" : selection.directIds.has(node.id) ? "Direct relationship" : null;
      return <Html key={node.id} position={[position.x, position.y + radiusFor(node, false, active) + 0.34, position.z]} zIndexRange={[12, 1]}>
        <div className="unified-graph3d-label-anchor">
          <button className="unified-graph3d-label" data-active={active || undefined} data-hovered={node.id === props.hovered?.id || undefined} data-path={onPath || undefined} onClick={(event) => { event.stopPropagation(); node.id === props.selectedId ? props.onClearSelection?.() : props.onNodeSelect?.(node); }} onDoubleClick={(event) => { event.stopPropagation(); props.onNodeActivate?.(node); }} type="button">
            <small>{node.category || node.type}</small><strong>{node.label}</strong>{node.status || relationshipContext ? <span>{[relationshipContext, node.status].filter(Boolean).join(" · ")}</span> : null}
          </button>
        </div>
        </Html>;
    })}
    <gridHelper args={[80, 40, "#28344d", "#131c2c"]} position={[0, -10, 0]} />
    <CameraRig positions={positions} pivotId={pivotId} resetSequence={props.resetSequence} zoomCommand={props.zoomCommand} />
  </>;
}

export function UnifiedGraph3D(props: Props) {
  const [hovered, setHovered] = useState<UnifiedGraphNode | null>(null);
  const [resetSequence, setResetSequence] = useState(0);
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ sequence: 0, factor: 1 });
  if (!props.nodes.length) return <div className="unified-graph3d unified-graph3d--empty">{props.emptyLabel || "No graph records to display."}</div>;

  return <div aria-label={props.ariaLabel} className="unified-graph3d" role="application">
    <Canvas camera={{ fov: 48, near: 0.1, far: 240 }} dpr={[1, 1.65]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onPointerMissed={props.onClearSelection}>
      <GraphScene {...props} hovered={hovered} onHover={setHovered} resetSequence={resetSequence} zoomCommand={zoomCommand} />
    </Canvas>
    <div className="unified-graph3d-controls">
      {props.selectedId ? <button onClick={props.onClearSelection} title="Clear graph selection" type="button"><i className="ph-bold ph-x" aria-hidden="true"></i><span>Clear selection</span></button> : null}
      <div aria-label="Graph zoom" className="unified-graph3d-zoom" role="group"><button aria-label="Zoom in" onClick={() => setZoomCommand((value) => ({ sequence: value.sequence + 1, factor: 0.72 }))} title="Zoom in" type="button"><i className="ph-bold ph-plus" aria-hidden="true"></i></button><button aria-label="Zoom out" onClick={() => setZoomCommand((value) => ({ sequence: value.sequence + 1, factor: 1.38 }))} title="Zoom out" type="button"><i className="ph-bold ph-minus" aria-hidden="true"></i></button></div>
      <button onClick={() => setResetSequence((value) => value + 1)} title="Reset 3D view" type="button"><i className="ph-bold ph-crosshair" aria-hidden="true"></i><span>Reset</span></button>
      <span><i className="ph-bold ph-cube" aria-hidden="true"></i> Drag to orbit · scroll zooms {props.selectedId ? "selection" : "focus"}</span>
    </div>
    <div className="unified-graph3d-access" aria-label="Keyboard graph navigation">
      {props.nodes.slice(0, 80).map((node) => <button key={node.id} onClick={() => props.onNodeSelect?.(node)} onDoubleClick={() => props.onNodeActivate?.(node)} type="button">{node.label}</button>)}
    </div>
  </div>;
}
