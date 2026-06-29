'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { ChevronRight, ChevronDown, User, AlertCircle, Loader2, RefreshCw, GitBranch } from 'lucide-react';

const API_BASE = 'https://rd-api-j7zj.onrender.com';

interface BinaryTreeNode {
  userId: string;
  name: string;
  parentId?: string;
  position: 'LEFT' | 'RIGHT' | 'ROOT';
  treeLevel: number;
  isActive: boolean;
  idStatus: string;
  totalBv: number;
  pairsCount: number;
  leftChild?: BinaryTreeNode;
  rightChild?: BinaryTreeNode;
}

// ── Curved dashed connector (parent -> child), React-Flow style ────────────
function CurvedConnector({
  fromRef,
  toRef,
  containerRef,
}: {
  fromRef: React.RefObject<HTMLDivElement>;
  toRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const compute = () => {
      const from = fromRef.current;
      const to = toRef.current;
      const container = containerRef.current;
      if (!from || !to || !container) return;

      const containerRect = container.getBoundingClientRect();
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();

      const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
      const y1 = fromRect.bottom - containerRect.top;
      const x2 = toRect.left + toRect.width / 2 - containerRect.left;
      const y2 = toRect.top - containerRect.top;

      const midY = (y1 + y2) / 2;

      setBox({ width: containerRect.width, height: containerRect.height });
      setPath(`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
    };

    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [fromRef, toRef, containerRef]);

  if (!path) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={box.width}
      height={box.height}
      style={{ overflow: 'visible' }}
    >
      <path
        d={path}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeDasharray="5 5"
        style={{ animation: 'dashFlow 0.6s linear infinite' }}
      />
      <style>{`
        @keyframes dashFlow {
          to { stroke-dashoffset: -10; }
        }
      `}</style>
    </svg>
  );
}

// ── Single tree node card ──────────────────────────────────────────────────
function TreeNodeCard({
  node,
  isRoot = false,
}: {
  node: BinaryTreeNode;
  isRoot?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  const hasLeft  = !!node.leftChild;
  const hasRight = !!node.rightChild;
  const hasChildren = hasLeft || hasRight;

  const posColor =
    node.position === 'LEFT'  ? 'bg-blue-100 text-blue-700' :
    node.position === 'RIGHT' ? 'bg-purple-100 text-purple-700' :
                                'bg-amber-100 text-amber-700';

  const nodeRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center">
      {/* Node card */}
      <div
        ref={nodeRef}
        className={`relative rounded-2xl border-2 shadow-sm p-3 w-36 text-center transition-all duration-200
          ${node.isActive
            ? 'bg-white border-blue-400 shadow-[0_0_10px_2px_rgba(59,130,246,0.6)]'
            : 'bg-gray-50 border-red-400 shadow-[0_0_10px_2px_rgba(248,113,113,0.6)]'}`}
      >
        {/* Position badge */}
        {!isRoot && (
          <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full ${posColor}`}>
            {node.position}
          </span>
        )}

        <div className={`w-9 h-9 rounded-full mx-auto mb-1 flex items-center justify-center
          ${node.isActive ? 'bg-emerald-100' : 'bg-gray-200'}`}>
          <User size={18} className={node.isActive ? 'text-emerald-600' : 'text-gray-400'} />
        </div>

        <p className="text-[11px] font-semibold text-gray-800 truncate">{node.name}</p>
        <p className="text-[10px] text-gray-400">{node.userId}</p>

        <div className="mt-1 flex justify-center gap-1">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full
            ${node.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            {node.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {node.pairsCount > 0 && (
          <p className="text-[9px] text-amber-600 font-medium mt-0.5">
            {node.pairsCount} pair{node.pairsCount !== 1 ? 's' : ''}
          </p>
        )}

        {hasChildren && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="flex flex-col items-center mt-8">
          <div className="flex items-start gap-8">
            {/* Left child */}
            <div ref={leftRef} className="flex flex-col items-center">
              {hasLeft ? (
                <TreeNodeCard node={node.leftChild!} />
              ) : (
                <EmptySlot label="LEFT" />
              )}
            </div>

            {/* Right child */}
            <div ref={rightRef} className="flex flex-col items-center">
              {hasRight ? (
                <TreeNodeCard node={node.rightChild!} />
              ) : (
                <EmptySlot label="RIGHT" />
              )}
            </div>
          </div>

          <CurvedConnector fromRef={nodeRef} toRef={leftRef} containerRef={wrapRef} />
          <CurvedConnector fromRef={nodeRef} toRef={rightRef} containerRef={wrapRef} />
        </div>
      )}

      {/* Empty slots when node has NO children at all */}
      {!hasChildren && (
        <div className="flex flex-col items-center mt-8">
          <div className="flex items-start gap-8">
            <div ref={leftRef}><EmptySlot label="LEFT" /></div>
            <div ref={rightRef}><EmptySlot label="RIGHT" /></div>
          </div>
          <CurvedConnector fromRef={nodeRef} toRef={leftRef} containerRef={wrapRef} />
          <CurvedConnector fromRef={nodeRef} toRef={rightRef} containerRef={wrapRef} />
        </div>
      )}
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-28 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1">
        <User size={16} className="text-gray-300" />
        <span className="text-[10px] text-gray-300 font-medium">{label}</span>
        <span className="text-[9px] text-gray-200">Empty</span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function BinaryTreeViewPage() {
  const [tree, setTree]       = useState<BinaryTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [depth, setDepth]     = useState(4);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const res = await fetch(`${API_BASE}/api/binary/tree?depth=${depth}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (res.status === 404) {
        setError('not-enrolled');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch binary tree.');

      const data = await res.json();
      setTree(data);
    } catch {
      setError('Failed to load binary tree. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [depth]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6 overflow-x-auto">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <GitBranch size={20} className="text-purple-600" />
              Binary Tree View
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Your binary plan downline structure
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={depth}
              onChange={e => setDepth(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
            >
              {[2,3,4,5,6].map(d => (
                <option key={d} value={d}>Depth {d}</option>
              ))}
            </select>
            <button
              onClick={fetchTree}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-5 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Inactive
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> LEFT leg
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-400 inline-block" /> RIGHT leg
          </span>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading binary tree…</span>
          </div>
        )}

        {!loading && error === 'not-enrolled' && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <AlertCircle size={40} className="text-amber-400" />
            <p className="font-semibold text-gray-700">You are not enrolled in the Binary Plan</p>
            <p className="text-sm text-gray-400">
              Go to <strong>My Plan → Binary Plan</strong> to join and activate your ID.
            </p>
          </div>
        )}

        {!loading && error && error !== 'not-enrolled' && (
          <div className="flex items-center gap-2 text-red-500 py-8">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!loading && !error && tree && (
          <div className="overflow-x-auto pb-10">
            <div className="inline-block min-w-full">
              <TreeNodeCard node={tree} isRoot />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}