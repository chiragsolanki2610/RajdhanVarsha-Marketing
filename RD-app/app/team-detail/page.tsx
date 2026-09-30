"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import LoginTopbar from "@/components/loginTopbar";
import Sidebar from "@/components/Sidebar";

/**
 * team-detail/page.tsx
 * -----------------------------------------------------------------------
 * Two toggle buttons at the top: "Dream Team" (default) and "Binary Team".
 * Each row shows: Name, User ID, Sponsor ID, Phone Number, Active/Inactive.
 *
 * Data sources:
 *  - Dream Team  -> GET /api/Tree                (recursive sponsor tree,
 *                    fetched whole and paginated/filtered client-side)
 *  - Binary Team -> GET /api/binary/team          (FLAT, server-paginated
 *                    listing — page/pageSize/search are query params, and
 *                    the backend returns only that page's rows, never a
 *                    nested tree). This is what lets Binary Team scale to
 *                    any number of members or any tree depth: the response
 *                    size only depends on pageSize, never on total team size.
 *
 * Dream Team's /api/Tree endpoint still returns the whole nested tree in one
 * response, so if your sponsor tree ever grows very large the same
 * flat/paginated approach used here for Binary Team should be applied to it
 * too — ask if you'd like that endpoint added.
 * -----------------------------------------------------------------------
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com";

type TeamType = "dream" | "binary";
const PAGE_SIZE = 10;

interface TeamMember {
  userId: string;
  sponsorId: string;
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
  sponsorId?: string;
  parentId?: string;
  children: DreamTreeNode[];
}

interface BinaryMemberRow {
  userId: string;
  name: string;
  phone: string | null;
  position: string;
  treeLevel: number;
  isActive: boolean;
  sponsorId?: string;
}

interface BinaryMemberListResponse {
  items: BinaryMemberRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

function flattenDreamTree(
  node: DreamTreeNode,
  out: TeamMember[],
  skipRoot = true,
  parentId = ""
) {
  if (!skipRoot) {
    out.push({
      userId: node.id,
      // Prefer an explicit sponsorId from the API if present, otherwise
      // fall back to the immediate parent in the tree (the node's sponsor
      // IS its parent in a sponsor tree).
      sponsorId: node.sponsorId || parentId || "—",
      name: node.name,
      phone: "",
      isActive: (node.idStatus || "").toLowerCase() === "active",
      level: node.level,
    });
  }
  for (const child of node.children || []) {
    flattenDreamTree(child, out, false, node.id);
  }
}

// ---- Component -------------------------------------------------------

export default function TeamDetailPage() {
  const [activeTeam, setActiveTeam] = useState<TeamType>("dream");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Dream Team: fetched whole, paginated/filtered client-side ----
  const [dreamMembers, setDreamMembers] = useState<TeamMember[] | null>(null);
  const [dreamPage, setDreamPage] = useState(1);

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
      flattenDreamTree(tree, flat, true, tree.id);
      const enriched = await enrichWithPhones(flat);
      setDreamMembers(enriched);
    } catch (err: any) {
      setError(err?.message || "Failed to load Dream Team.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dreamFiltered = useMemo(() => {
    if (!dreamMembers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return dreamMembers;
    return dreamMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.userId.toLowerCase().includes(q) ||
        m.sponsorId.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q)
    );
  }, [dreamMembers, search]);

  const dreamTotalPages = Math.max(1, Math.ceil(dreamFiltered.length / PAGE_SIZE));
  const dreamPaginated = useMemo(() => {
    const start = (dreamPage - 1) * PAGE_SIZE;
    return dreamFiltered.slice(start, start + PAGE_SIZE);
  }, [dreamFiltered, dreamPage]);

  // ---- Binary Team: server-side paginated + searched, one page fetched at a time ----
  // This is the part that scales to any team size / any tree depth: we never
  // ask the backend for "everything", only for the current page, so the
  // response is always small no matter how large the actual binary tree is.
  const [binaryPage, setBinaryPage] = useState(1);
  const [binaryData, setBinaryData] = useState<BinaryMemberListResponse | null>(null);
  const [binaryLoaded, setBinaryLoaded] = useState(false);

  const loadBinaryTeam = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const data: BinaryMemberListResponse = await authFetch(`/api/binary/team?${params.toString()}`);

      // Phone numbers already come from the backend for Binary Team, no
      // extra per-user enrichment calls needed here.
      setBinaryData(data);
      setBinaryLoaded(true);
    } catch (err: any) {
      setError(err?.message || "Failed to load Binary Team.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search so we don't fire a request on every keystroke.
  useEffect(() => {
    if (activeTeam !== "binary") return;
    const handle = setTimeout(() => {
      setBinaryPage(1);
      loadBinaryTeam(1, search);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTeam]);

  useEffect(() => {
    if (activeTeam === "dream" && dreamMembers === null) {
      loadDreamTeam();
    } else if (activeTeam === "binary" && !binaryLoaded) {
      loadBinaryTeam(binaryPage, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam, dreamMembers, binaryLoaded]);

  function goToNextPage() {
    if (activeTeam === "dream") {
      setDreamPage((p) => Math.min(p + 1, dreamTotalPages));
    } else {
      const next = Math.min(binaryPage + 1, binaryData?.totalPages || 1);
      setBinaryPage(next);
      loadBinaryTeam(next, search);
    }
  }

  function goToPrevPage() {
    if (activeTeam === "dream") {
      setDreamPage((p) => Math.max(p - 1, 1));
    } else {
      const prev = Math.max(binaryPage - 1, 1);
      setBinaryPage(prev);
      loadBinaryTeam(prev, search);
    }
  }

  function handleRefresh() {
    if (activeTeam === "dream") {
      setDreamMembers(null);
      setDreamPage(1);
    } else {
      setBinaryPage(1);
      loadBinaryTeam(1, search);
    }
  }

  function handleTeamSwitch(team: TeamType) {
    setActiveTeam(team);
    setSearch("");
  }

  // ---- Unified view for rendering ----
  const rows: TeamMember[] =
    activeTeam === "dream"
      ? dreamPaginated
      : (binaryData?.items || []).map((m) => ({
          userId: m.userId,
          sponsorId: m.sponsorId || "—",
          name: m.name,
          phone: m.phone || "—",
          isActive: m.isActive,
          level: m.treeLevel,
        }));

  const currentPage = activeTeam === "dream" ? dreamPage : binaryPage;
  const totalPages = activeTeam === "dream" ? dreamTotalPages : binaryData?.totalPages || 1;
  const totalCount = activeTeam === "dream" ? dreamFiltered.length : binaryData?.totalCount || 0;
  const hasData = activeTeam === "dream" ? dreamMembers !== null : binaryData !== null;

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
            {/* Toggle buttons */}
            <div className="mb-6 flex w-full max-w-full rounded-xl bg-gray-100 p-1.5 shadow-[0_0_12px_rgba(37,99,235,0.2)]">
              <button
                onClick={() => handleTeamSwitch("dream")}
                className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTeam === "dream"
                    ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Dream Team
              </button>
              <button
                onClick={() => handleTeamSwitch("binary")}
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
                  placeholder="Search by name, user ID, sponsor ID or phone..."
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
                    onClick={
                      activeTeam === "dream"
                        ? loadDreamTeam
                        : () => loadBinaryTeam(binaryPage, search)
                    }
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-700"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && rows.length === 0 && (
                <div className="py-16 text-center text-sm text-gray-400">
                  No team members found.
                </div>
              )}

              {!loading && !error && rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">User ID</th>
                        <th className="px-4 py-3 font-semibold">Sponsor ID</th>
                        <th className="px-4 py-3 font-semibold">Phone Number</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((m) => (
                        <tr key={`${activeTeam}-${m.userId}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                          <td className="px-4 py-3 text-gray-600">{m.userId}</td>
                          <td className="px-4 py-3 text-gray-600">{m.sponsorId}</td>
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
              {!loading && !error && totalPages > 1 && (
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

            {!loading && !error && hasData && (
              <p className="mt-3 text-xs text-gray-400">
                Showing {rows.length} of {totalCount} members
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}