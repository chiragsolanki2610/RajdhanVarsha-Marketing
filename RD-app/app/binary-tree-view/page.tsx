'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar'; // Added LoginTopbar import
import { ChevronLeft, User, AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react';

const API_BASE = 'https://rd-api-j7zj.onrender.com';
const VISIBLE_LEVELS = 3; // how many levels deep to render under whichever node is currently focused
const LONG_PRESS_MS = 400; // how long a press/touch must be held to reveal details on mobile

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
      // Every "to" card has a LEFT/RIGHT badge floating above its top edge
      // (see TreeNodeCard's "-top-2.5" badge). Stop the line short of the
      // card top so it doesn't draw straight through that badge.
      const BADGE_CLEARANCE = 6;
      const y2 = toRect.top - containerRect.top - BADGE_CLEARANCE;

      const midY = y1 + (y2 - y1) * 0.4;

      setBox({ width: containerRect.width, height: containerRect.height });
      // Edgy / orthogonal path: drop straight down, cut sideways, drop straight down again.
      setPath(`M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`);
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
      <defs>
        <filter id="connectorGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="#60a5fa"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 6"
        filter="url(#connectorGlow)"
        style={{ animation: 'dashFlow 0.6s linear infinite' }}
      />
      <style>{`
        @keyframes dashFlow {
          to { stroke-dashoffset: -12; }
        }
      `}</style>
    </svg>
  );
}

// ── Single tree node card ──────────────────────────────────────────────────
// Expansion is now purely depth-driven (VISIBLE_LEVELS), not click-to-toggle.
// Clicking any non-root node re-focuses the whole tree on that node via onSelect.
//
// Mobile behavior: the card shows ONLY the avatar icon + userId. A tap still
// navigates (re-focuses the tree) exactly like before. Pressing and HOLDING
// the card reveals a floating box with the name, pairs count, and status —
// released touch hides it again and does NOT trigger navigation.
// Desktop (sm and up) is unchanged: full details always visible, plain click.
function TreeNodeCard({
  node,
  isRoot = false,
  depthRemaining,
  onSelect,
}: {
  node: BinaryTreeNode;
  isRoot?: boolean;
  depthRemaining: number;
  onSelect: (node: BinaryTreeNode) => void;
}) {
  const hasLeft  = !!node.leftChild;
  const hasRight = !!node.rightChild;
  const hasChildren = hasLeft || hasRight;
  const showChildren = hasChildren && depthRemaining > 1;

  const nodeRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  // Long-press-to-reveal state (mobile only — desktop just shows everything).
  const [showDetails, setShowDetails] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const startPress = (e: React.SyntheticEvent) => {
    if (isRoot) return;
    // Prevent the pan/zoom canvas underneath from starting a drag on the same gesture.
    e.stopPropagation();
    longPressTriggeredRef.current = false;
    clearPressTimer();
    pressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setShowDetails(true);
    }, LONG_PRESS_MS);
  };

  const endPress = (e: React.SyntheticEvent) => {
    if (isRoot) return;
    e.stopPropagation();
    clearPressTimer();
    if (longPressTriggeredRef.current) {
      // Was a hold — just hide the detail box, don't navigate.
      setShowDetails(false);
    } else {
      // Was a quick tap/click — navigate as before.
      onSelect(node);
    }
  };

  const cancelPress = (e: React.SyntheticEvent) => {
    if (isRoot) return;
    e.stopPropagation();
    clearPressTimer();
    setShowDetails(false);
  };

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center">
      {/* Node card */}
      <div
        ref={nodeRef}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onTouchCancel={cancelPress}
        className={`relative rounded-xl border-2 shadow-sm px-2 py-2 sm:px-3 sm:py-2.5 w-fit min-w-[72px] sm:min-w-[160px] max-w-[208px] transition-all duration-200
          ${!isRoot ? 'cursor-pointer sm:hover:scale-105 sm:hover:shadow-[0_0_18px_4px_rgba(96,165,250,0.55)] sm:hover:border-blue-400 sm:hover:-translate-y-0.5' : ''}
          ${node.isActive
            ? 'bg-white border-blue-400 shadow-[0_0_10px_2px_rgba(59,130,246,0.6)]'
            : 'bg-gray-50 border-red-400 shadow-[0_0_10px_2px_rgba(248,113,113,0.6)]'}`}
      >
        {/* Mobile compact view: avatar + userId only */}
        <div className="flex sm:hidden flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center
            ${node.isActive ? 'bg-emerald-100' : 'bg-gray-200'}`}>
            <User size={18} className={node.isActive ? 'text-emerald-600' : 'text-gray-400'} />
          </div>
          <p className="text-[9px] text-gray-500 font-semibold">{node.userId}</p>
        </div>

        {/* Desktop full view: avatar+ID on the left, name+pairs+status on the right */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center
              ${node.isActive ? 'bg-emerald-100' : 'bg-gray-200'}`}>
              <User size={18} className={node.isActive ? 'text-emerald-600' : 'text-gray-400'} />
            </div>
            <p className="text-[9px] text-gray-400 font-medium">{node.userId}</p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{node.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {node.pairsCount > 0 && (
                <span className="text-[11px] text-amber-500 font-semibold leading-tight">
                  {node.pairsCount} pair{node.pairsCount !== 1 ? 's' : ''}
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                ${node.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                {node.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile hold-to-reveal detail popup */}
        {showDetails && (
          <div
            className="sm:hidden absolute left-1/2 -translate-x-1/2 -translate-y-full -top-2 z-30 w-44 rounded-xl border-2 border-blue-300 bg-white shadow-lg px-3 py-2.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          >
            <p className="text-sm font-bold text-gray-800 truncate">{node.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {node.pairsCount > 0 && (
                <span className="text-[11px] text-amber-500 font-semibold leading-tight">
                  {node.pairsCount} pair{node.pairsCount !== 1 ? 's' : ''}
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                ${node.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                {node.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {/* pointer arrow */}
            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white border-r-2 border-b-2 border-blue-300 rotate-45" />
          </div>
        )}
      </div>

      {/* Children */}
      {showChildren && (
        <div className="flex flex-col items-center mt-16">
          <div className="flex items-start gap-8">
            {/* Left child */}
            <div ref={leftRef} className="flex flex-col items-center">
              {hasLeft ? (
                <TreeNodeCard
                  node={node.leftChild!}
                  depthRemaining={depthRemaining - 1}
                  onSelect={onSelect}
                />
              ) : (
                <EmptySlot label="LEFT" />
              )}
            </div>

            {/* Right child */}
            <div ref={rightRef} className="flex flex-col items-center">
              {hasRight ? (
                <TreeNodeCard
                  node={node.rightChild!}
                  depthRemaining={depthRemaining - 1}
                  onSelect={onSelect}
                />
              ) : (
                <EmptySlot label="RIGHT" />
              )}
            </div>
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
      <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1">
        <User size={16} className="text-gray-300" />
        <span className="text-[10px] text-gray-300 font-medium">{label}</span>
        <span className="text-[9px] text-gray-200">Empty</span>
      </div>
    </div>
  );
}

// ── Pan & zoom viewport ─────────────────────────────────────────────────────
// Replaces native scrollbars: drag anywhere to pan in any direction, scroll
// wheel / pinch / Ctrl+wheel to zoom in and out, all rendered with a CSS
// transform so nothing needs to "overflow scroll".
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;

function PanZoomCanvas({ children, resetKey }: { children: React.ReactNode; resetKey?: string | number }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-center whenever the focused node changes (e.g. drilling into a branch / going back).
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [resetKey]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale(s => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    setIsDragging(true);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };

  const stopDragging = () => { draggingRef.current = false; setIsDragging(false); };

  // Touch support (mobile drag-to-pan)
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    draggingRef.current = true;
    setIsDragging(true);
    lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastTouchRef.current.x;
    const dy = e.touches[0].clientY - lastTouchRef.current.y;
    lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-gray-50 select-none"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={stopDragging}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'top center',
          transition: isDragging ? 'none' : 'transform 0.05s linear',
          width: 'max-content',
          margin: '0 auto',
          padding: '60px 0 80px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Find the path (root → ... → matched node) for a search query ──────────
function findPathToNode(
  root: BinaryTreeNode,
  query: string
): BinaryTreeNode[] | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const walk = (node: BinaryTreeNode, path: BinaryTreeNode[]): BinaryTreeNode[] | null => {
    const nextPath = [...path, node];
    if (
      node.userId.toLowerCase().includes(q) ||
      node.name.toLowerCase().includes(q)
    ) {
      return nextPath;
    }
    if (node.leftChild) {
      const found = walk(node.leftChild, nextPath);
      if (found) return found;
    }
    if (node.rightChild) {
      const found = walk(node.rightChild, nextPath);
      if (found) return found;
    }
    return null;
  };

  return walk(root, []);
}

const FETCH_DEPTH = 8; // how deep we pull from the API in one go — search works against whatever is loaded

// ── Main page ────────────────────────────────────────────────────────────────
export default function BinaryTreeViewPage() {
  const [tree, setTree]       = useState<BinaryTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Navigation stack: focusStack[0] is the real root, last item is whatever
  // node is currently being viewed as the "root" of the visible 3 levels.
  const [focusStack, setFocusStack] = useState<BinaryTreeNode[]>([]);

  const [searchQuery, setSearchQuery]   = useState('');
  const [searchError, setSearchError]   = useState('');

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const res = await fetch(`${API_BASE}/api/binary/tree?depth=${FETCH_DEPTH}`, {
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
      setFocusStack([data]); // reset navigation back to the real root on every fresh fetch
    } catch {
      setError('Failed to load binary tree. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const currentFocus = focusStack[focusStack.length - 1] ?? null;

  const handleSelect = (node: BinaryTreeNode) => {
    setFocusStack(prev => [...prev, node]);
  };

  const handleBack = () => {
    setFocusStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tree) return;
    const path = findPathToNode(tree, searchQuery);
    if (!path) {
      setSearchError(`No one found under you matching "${searchQuery}"`);
      return;
    }
    setSearchError('');
    setFocusStack(path);
    setSearchQuery('');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main content viewport containing topbar and internal content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <LoginTopbar pageTitle="Binary Tree View" />

        <main className="flex-1 relative overflow-hidden">
          {/* Floating controls — overlay on top of the canvas, not in normal layout flow */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchError(''); }}
                  placeholder="Search name or ID…"
                  className="text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-2 bg-white shadow-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                type="submit"
                className="text-xs font-medium px-3 py-2 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                Go
              </button>
              <button
                type="button"
                onClick={fetchTree}
                className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700"
              >
                <RefreshCw size={14} />
              </button>
            </form>
            {searchError && (
              <span className="text-[11px] text-red-500 bg-white/90 px-2 py-0.5 rounded">{searchError}</span>
            )}
          </div>

          {focusStack.length > 1 && (
            <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-2">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-gray-900 hover:border-gray-300"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500 bg-white/90 px-2 py-1 rounded-lg shadow-sm max-w-xs">
                {focusStack.map((n, i) => (
                  <React.Fragment key={n.userId}>
                    {i > 0 && <span className="text-gray-300">/</span>}
                    <button
                      onClick={() => setFocusStack(prev => prev.slice(0, i + 1))}
                      className={`hover:underline ${i === focusStack.length - 1 ? 'text-gray-700 font-semibold' : ''}`}
                    >
                      {n.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

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

          {!loading && !error && currentFocus && (
            <PanZoomCanvas resetKey={currentFocus.userId}>
              <TreeNodeCard
                node={currentFocus}
                isRoot
                depthRemaining={VISIBLE_LEVELS}
                onSelect={handleSelect}
              />
            </PanZoomCanvas>
          )}
        </main>
      </div>
    </div>
  );
}