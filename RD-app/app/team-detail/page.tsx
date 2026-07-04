"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import LoginTopbar from "@/components/loginTopbar";
import Sidebar from "@/components/Sidebar";

/**
 * team-detail/page.tsx
 * -----------------------------------------------------------------------
 * Two toggle buttons at the top: "Dream Team" (default) and "Binary Team".
 * A search bar filters the currently-loaded list by name / userId / phone.
 * Each row shows: Name, User ID, Phone Number, Active/Inactive.
 *
 * Data sources:
 *  - Dream Team  -> GET /api/Tree            (recursive sponsor tree, up to L12)
 *  - Binary Team -> GET /api/binary/tree      (left/right binary tree, up to depth 10)
 *
 * Neither endpoint returns a phone number, so each unique userId is
 * enriched with a call to GET /api/Auth/{userId} (returns mobileNo) run
 * in parallel and cached in-memory for the session.
 *
 * Adjust API_BASE_URL / token retrieval to match your project's setup.
 * -----------------------------------------------------------------------
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com";

type TeamType = "dream" | "binary";

interface TeamMember {
  userId: string;
  name: string;
  phone: string;
  isActive: boolean;
  level: number;
}

// ---- Raw API shapes ----------------------------------------------------

interface DreamTreeNode {
  id: string;
  name: string;
  idStatus: string;
  level: number;
  hasChildren: boolean;
  children: DreamTreeNode[];
}

interface BinaryTreeNode {
  userId: string;
  name: string;
  idStatus: string;
  treeLevel: number;
  leftChild: BinaryTreeNode | null;
  rightChild: BinaryTreeNode | null;
}

// ---- Helpers -------------------------------------------------------------

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function authFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }
  return res.json();
}

function flattenDreamTree(node: DreamTreeNode, out: TeamMember[], skipRoot = true) {
  if (!skipRoot) {
    out.push({
      userId: node.id,
      name: node.name,
      phone: "",
      isActive: (node.idStatus || "").toLowerCase() === "active",
      level: node.level,
    });
  }
  for (const child of node.children || []) {
    flattenDreamTree(child, out, false);
  }
}

function flattenBinaryTree(node: BinaryTreeNode | null, out: TeamMember[], skipRoot = true) {
  if (!node) return;
  if (!skipRoot) {
    out.push({
      userId: node.userId,
      name: node.name,
      phone: "",
      isActive: !!node.idStatus && node.idStatus.toLowerCase() === "active",
      level: node.treeLevel,
    });
  }
  flattenBinaryTree(node.leftChild, out, false);
  flattenBinaryTree(node.rightChild, out, false);
}

// ---- Component -------------------------------------------------------

export default function TeamDetailPage() {
  const [activeTeam, setActiveTeam] = useState<TeamType>("dream");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [dreamMembers, setDreamMembers] = useState<TeamMember[] | null>(null);
  const [binaryMembers, setBinaryMembers] = useState<TeamMember[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple in-memory cache so we don't re-fetch phone numbers repeatedly.
  const [phoneCache, setPhoneCache] = useState<Record<string, string>>({});

  const enrichWithPhones = useCallback(
    async (members: TeamMember[]): Promise<TeamMember[]> => {
      const idsToFetch = Array.from(
        new Set(members.map((m) => m.userId).filter((id) => !(id in phoneCache)))
      );

      const newlyFetched: Record<string, string> = {};

      if (idsToFetch.length > 0) {
        await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const data = await authFetch(`/api/Auth/${encodeURIComponent(id)}`);
              newlyFetched[id] = data?.mobileNo || "—";
            } catch {
              newlyFetched[id] = "—";
            }
          })
        );
      }

      const mergedCache = { ...phoneCache, ...newlyFetched };
      setPhoneCache(mergedCache);

      return members.map((m) => ({ ...m, phone: mergedCache[m.userId] || "—" }));
    },
    [phoneCache]
  );

  const loadDreamTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tree: DreamTreeNode = await authFetch("/api/Tree");
      const flat: TeamMember[] = [];
      flattenDreamTree(tree, flat);
      const enriched = await enrichWithPhones(flat);
      setDreamMembers(enriched);
    } catch (err: any) {
      setError(err?.message || "Failed to load Dream Team.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBinaryTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tree: BinaryTreeNode = await authFetch("/api/binary/tree?depth=10");
      const flat: TeamMember[] = [];
      flattenBinaryTree(tree, flat);
      const enriched = await enrichWithPhones(flat);
      setBinaryMembers(enriched);
    } catch (err: any) {
      setError(err?.message || "Failed to load Binary Team.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTeam === "dream" && dreamMembers === null) {
      loadDreamTeam();
    } else if (activeTeam === "binary" && binaryMembers === null) {
      loadBinaryTeam();
    }
  }, [activeTeam, dreamMembers, binaryMembers, loadDreamTeam, loadBinaryTeam]);

  const currentMembers = activeTeam === "dream" ? dreamMembers : binaryMembers;

  const filteredMembers = useMemo(() => {
    if (!currentMembers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return currentMembers;
    return currentMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.userId.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q)
    );
  }, [currentMembers, search]);

  // Reset to page 1 whenever the active team or search query changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTeam, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, currentPage]);

  function goToNextPage() {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  }

  function goToPrevPage() {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }

  function handleRefresh() {
    if (activeTeam === "dream") {
      setDreamMembers(null);
    } else {
      setBinaryMembers(null);
    }
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top bar */}
        <LoginTopbar pageTitle="Team Details"/>

        <div className="min-w-0 px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-4xl">
            {/* <h1 className="mb-6 text-2xl font-bold text-gray-900">Team Details</h1> */}

            {/* Toggle buttons */}
            <div className="mb-6 flex w-full max-w-full rounded-xl bg-gray-100 p-1.5 shadow-[0_0_12px_rgba(37,99,235,0.2)]">
              <button
                onClick={() => setActiveTeam("dream")}
                className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTeam === "dream"
                    ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Dream Team
              </button>
              <button
                onClick={() => setActiveTeam("binary")}
                className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTeam === "binary"
                    ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Binary Team
              </button>
            </div>

            {/* Search bar */}
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, user ID or phone..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleRefresh}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Refresh
              </button>
            </div>

            {/* Content */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {loading && (
                <div className="flex items-center justify-center py-16 text-sm text-gray-500">
                  Loading {activeTeam === "dream" ? "Dream" : "Binary"} Team...
                </div>
              )}

              {!loading && error && (
                <div className="flex flex-col items-center gap-3 py-16 text-sm text-red-500">
                  <span>{error}</span>
                  <button
                    onClick={activeTeam === "dream" ? loadDreamTeam : loadBinaryTeam}
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-700"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && filteredMembers.length === 0 && (
                <div className="py-16 text-center text-sm text-gray-400">
                  No team members found.
                </div>
              )}

              {!loading && !error && filteredMembers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">User ID</th>
                        <th className="px-4 py-3 font-semibold">Phone Number</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedMembers.map((m) => (
                        <tr key={`${activeTeam}-${m.userId}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                          <td className="px-4 py-3 text-gray-600">{m.userId}</td>
                          <td className="px-4 py-3 text-gray-600">{m.phone}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                m.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {m.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination controls */}
              {!loading && !error && filteredMembers.length > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-gray-100"
                  >
                    ← Back
                  </button>

                  <span className="text-xs text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-gray-100"
                  >
                    + Next
                  </button>
                </div>
              )}
            </div>

            {!loading && !error && currentMembers && (
              <p className="mt-3 text-xs text-gray-400">
                Showing {paginatedMembers.length} of {filteredMembers.length} members
                {filteredMembers.length !== currentMembers.length
                  ? ` (filtered from ${currentMembers.length})`
                  : ""}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}