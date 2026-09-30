"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com";

const MAX_VISIBLE_LEVEL = 12;
const LEVELS_PER_VIEW = 1;

const getToken = () =>
  localStorage.getItem("authToken") ??
  localStorage.getItem("token") ??
  sessionStorage.getItem("token") ??
  "";

interface TreeNode {
  id: string;
  name: string;
  sponsorId: string;
  sponsorName: string;
  idStatus: string;
  level: number;
  directCount: number;
  isEligibleForWithdrawal: boolean;
  calculatedBv: number;
  levelCommissionPercentage: number;
  estimatedEarnings: number;
  totalIncentive: number;
  hasChildren: boolean;
  profilePictureUrl?: string | null;
  children: TreeNode[];
}

interface WalletDto {
  planType: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

async function fetchFullTree(): Promise<TreeNode> {
  const res = await fetch(`${API_URL}/api/Tree`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchTotalEarned(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/api/wallet`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return 0;
    const wallets: WalletDto[] = await res.json();
    const dreamWallet = wallets.find((w) => w.planType === "Dream Plan");
    return dreamWallet?.totalEarned ?? 0;
  } catch {
    return 0;
  }
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], isMobile: boolean) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  const nodeWidth = isMobile ? 108 : 260;
  const nodeHeight = isMobile ? 92 : 90;
  g.setGraph({
    rankdir: "TB",
    nodesep: isMobile ? 14 : 30,
    ranksep: isMobile ? 40 : 55,
  });
  nodes.forEach((n) => g.setNode(n.id, { width: nodeWidth, height: nodeHeight }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return { ...n, position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 } };
    }),
    edges,
  };
};

function buildNodeMap(node: TreeNode, map: Map<string, TreeNode>) {
  map.set(node.id, node);
  node.children.forEach((c) => buildNodeMap(c, map));
}

function collectSubtree(root: TreeNode) {
  const nodes: TreeNode[] = [];
  const edges: { source: string; target: string }[] = [];
  const maxDepth = Math.min(LEVELS_PER_VIEW, MAX_VISIBLE_LEVEL - root.level);

  const walk = (node: TreeNode, depth: number, parentId?: string) => {
    nodes.push(node);
    if (parentId) edges.push({ source: parentId, target: node.id });
    if (depth >= maxDepth) return;
    node.children.forEach((c) => walk(c, depth + 1, node.id));
  };

  walk(root, 0, undefined);
  return { nodes, edges };
}

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

const CustomUserNode = ({ data }: { data: any }) => {
  const canExpand =
    data.hasChildren && data.level < MAX_VISIBLE_LEVEL && !data.isLeafOfView;
  const [imgError, setImgError] = useState(false);
  const hasPhoto = Boolean(data.profilePictureUrl) && !imgError;

  const handleClick = () => {
    if (canExpand) data.onExpand(data.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    data.onShowDetail(data.id);
  };

  // ---------- MOBILE LAYOUT ----------
  if (data.isMobile) {
    const isActive = String(data.idStatus).toLowerCase() === "active";

    return (
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`relative select-text w-[100px] px-2 py-2.5 rounded-2xl border-2 bg-white flex flex-col items-center text-center transition-all ${
          canExpand ? "cursor-pointer active:shadow-md" : "cursor-default"
        } ${
          isActive
            ? "border-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]"
            : "border-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]"
        }`}
      >
        <Handle type="target" position={Position.Top} className="!bg-slate-400" />

        {/* Info button - top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onShowDetail(data.id);
          }}
          title="Show Detail"
          className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 border-none outline-none cursor-pointer z-10"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>

        <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center overflow-hidden mb-1.5">
          {hasPhoto ? (
            <img
              src={data.profilePictureUrl}
              alt={data.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-5 h-5">
              <UserIcon />
            </div>
          )}
        </div>

        <h3 className="text-[11px] font-bold text-slate-800 leading-tight truncate w-full">
          {data.id}
        </h3>
        <p className="text-[10px] text-slate-400 leading-tight truncate w-full">
          {data.name}
        </p>

        <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
      </div>
    );
  }

  // ---------- DESKTOP LAYOUT (unchanged) ----------
  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`select-text px-4 py-3 rounded-2xl border-2 w-64 bg-white transition-all ${
        canExpand ? "cursor-pointer hover:shadow-md" : "cursor-default"
      } border-blue-200 hover:border-blue-300`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center overflow-hidden">
          {hasPhoto ? (
            <img
              src={data.profilePictureUrl}
              alt={data.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-6 h-6">
              <UserIcon />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-800 truncate">{data.name}</h3>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onShowDetail(data.id);
          }}
          title="Show Detail"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 border-none outline-none cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>

      <p className="text-[11px] text-slate-400 font-mono mt-1 ml-14">{data.id}</p>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
};

const nodeTypes = { userNode: CustomUserNode };

function DetailModal({
  node,
  rootTotalEarned,
  onClose,
}: {
  node: TreeNode;
  rootTotalEarned: number;
  onClose: () => void;
}) {
  const requirementMet = node.directCount >= 3;
  const isRoot = node.level === 0;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-80 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Level {node.level}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              requirementMet
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {requirementMet ? "Withdrawal Active" : "Locked (Min 3 Directs)"}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-800 truncate flex items-center gap-2">
          {node.name}
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
              String(node.idStatus).toLowerCase() === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {String(node.idStatus).toLowerCase() === "active" ? "Active" : "Inactive"}
          </span>
        </h3>
        <p className="text-xs text-slate-400 font-mono mb-2">ID: {node.id}</p>

        <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 text-slate-700 border border-slate-100">
          <div className="flex justify-between">
            <span>Direct Downlines:</span>
            <span className="font-bold">{node.directCount} / 10</span>
          </div>
          <div className="flex justify-between">
            <span>Business Volume:</span>
            <span className="font-semibold text-blue-600">{node.calculatedBv} BV</span>
          </div>
          <div className="flex justify-between">
            <span>Sponsor:</span>
            <span className="font-semibold">{node.sponsorName || "-"}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200/60 pt-1.5 mt-1.5 font-medium">
            {isRoot ? (
              <>
                <span>Total Earning:</span>
                <span className="text-green-600 font-bold">
                  ₹{Number(rootTotalEarned ?? 0).toFixed(2)}
                </span>
              </>
            ) : (
              <>
                <span>Commission to Parent:</span>
                <span className="text-green-600 font-bold">
                  ₹{Number(node.estimatedEarnings).toFixed(2)}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 text-sm text-white bg-slate-600 hover:bg-slate-700 font-semibold py-2 rounded cursor-pointer border-none outline-none"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function TreeCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const fullTree = useRef<TreeNode | null>(null);
  const nodeMap = useRef<Map<string, TreeNode>>(new Map());
  const focusedNodeId = useRef<string | null>(null);
  const historyStack = useRef<string[]>([]);
  const rootTotalEarned = useRef<number>(0);
  const isFirstRender = useRef<boolean>(true);
  const isMobileRef = useRef(false);

  const { fitView } = useReactFlow();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const renderView = useCallback(
    (
      focusNode: TreeNode,
      callbacks: { onExpand: (id: string) => void; onShowDetail: (id: string) => void }
    ) => {
      const { nodes: subNodes, edges: subEdges } = collectSubtree(focusNode);

      const rfNodes: Node[] = subNodes.map((n) => ({
        id: n.id,
        type: "userNode",
        data: {
          ...n,
          isMobile: isMobileRef.current,
          onExpand: callbacks.onExpand,
          onShowDetail: callbacks.onShowDetail,
        },
        position: { x: 0, y: 0 },
      }));

      const rfEdges: Edge[] = subEdges.map((e) => ({
        id: `e-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      }));

      const layouted = getLayoutedElements(rfNodes, rfEdges, isMobileRef.current);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);

      if (isFirstRender.current) {
        isFirstRender.current = false;
        setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 60);
      }
    },
    [setNodes, setEdges, fitView]
  );

  const callbacksRef = useRef({
    onExpand: (id: string) => {},
    onShowDetail: (id: string) => {},
  });

  const handleShowDetail = useCallback((id: string) => {
    setDetailNodeId(id);
  }, []);

  const handleExpand = useCallback(
    (id: string) => {
      const node = nodeMap.current.get(id);
      if (!node || !node.hasChildren) return;
      if (node.level >= MAX_VISIBLE_LEVEL) return;
      if (id === focusedNodeId.current) return;

      historyStack.current.push(focusedNodeId.current ?? "ROOT");
      focusedNodeId.current = id;

      renderView(node, callbacksRef.current);
    },
    [renderView]
  );

  const goToFocus = useCallback(
    (id: string | null) => {
      const node = id ? nodeMap.current.get(id) : fullTree.current;
      if (!node) return;
      focusedNodeId.current = id;
      renderView(node, callbacksRef.current);
    },
    [renderView]
  );

  const handleBack = useCallback(() => {
    const prev = historyStack.current.pop();
    if (prev === undefined) return;
    const targetId = prev === "ROOT" ? null : prev;
    goToFocus(targetId);
  }, [goToFocus]);

  useEffect(() => {
    callbacksRef.current = { onExpand: handleExpand, onShowDetail: handleShowDetail };
  }, [handleExpand, handleShowDetail]);

  // Re-render current view when mobile/desktop breakpoint changes
  useEffect(() => {
    if (!fullTree.current) return;
    const currentNode = focusedNodeId.current
      ? nodeMap.current.get(focusedNodeId.current)
      : fullTree.current;
    if (currentNode) renderView(currentNode, callbacksRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tree, totalEarned] = await Promise.all([
          fetchFullTree(),
          fetchTotalEarned(),
        ]);
        fullTree.current = tree;
        rootTotalEarned.current = totalEarned;
        buildNodeMap(tree, nodeMap.current);
        focusedNodeId.current = null;
        historyStack.current = [];
        renderView(tree, callbacksRef.current);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detailNode = detailNodeId ? nodeMap.current.get(detailNodeId) : null;

  return (
    <div className="relative flex-1 w-full h-full bg-white overflow-hidden">
      {historyStack.current.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow text-xs text-slate-500">
          <span
            className="cursor-pointer hover:text-blue-600"
            onClick={() => {
              historyStack.current = [];
              goToFocus(null);
            }}
          >
            🌳 Root
          </span>
          <span className="text-slate-300">›</span>
          <span
            className="cursor-pointer hover:text-blue-600 font-medium"
            onClick={handleBack}
          >
            ← Back
          </span>
          <span className="text-slate-300">›</span>
          <span className="font-semibold text-blue-600">
            {nodeMap.current.get(focusedNodeId.current ?? "")?.name ?? "Root"}
          </span>
        </div>
      )}

      {loading && (
        <div className="absolute top-4 right-4 z-50 bg-blue-600 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg animate-pulse">
          Syncing Live Ledger Database Matrix...
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900 border border-red-500 text-red-200 font-mono text-xs px-4 py-2 rounded-lg shadow-lg max-w-md text-center">
          ❌ {error}
        </div>
      )}

      {!loading && !error && nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10">
          <div className="text-5xl mb-4">🌳</div>
          <div className="text-lg font-semibold">No network data found</div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        maxZoom={1.5}
        minZoom={0.05}
        style={{ width: "100%", height: "100%" }}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        {!isMobile && (
          <Controls className="!left-4 !bottom-4 bg-white rounded-lg shadow border border-slate-200" />
        )}
        {!isMobile && (
          <MiniMap
            className="!right-4 !bottom-4 !m-0 rounded-lg shadow border border-slate-200"
            style={{ width: 180, height: 120, backgroundColor: "#f8fafc" }}
            zoomable
            pannable
            nodeColor="#94a3b8"
            maskColor="rgba(148, 163, 184, 0.2)"
            nodeClassName={(n) => n.type || ""}
          />
        )}
      </ReactFlow>

      {detailNode && (
        <DetailModal
          node={detailNode}
          rootTotalEarned={rootTotalEarned.current}
          onClose={() => setDetailNodeId(null)}
        />
      )}
    </div>
  );
}

export default function DreamTreeView() {
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        <LoginTopbar pageTitle="Dream Tree View" />
        <ReactFlowProvider>
          <TreeCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
}