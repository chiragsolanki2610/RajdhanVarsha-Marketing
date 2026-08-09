"use client";

/**
 * Admin → Inventory Management
 * Path: app/inventory-management/page.tsx  (or wherever your admin routes live)
 *
 * Talks to:
 *   GET  /api/Products/admin/inventory        -> full stock list (Admin only)
 *   PUT  /api/Products/{id}/add-stock          -> body: { quantity: number }  (Admin only)
 *
 * ── Before you wire this in ──────────────────────────────────────────────
 * 1. Set API_BASE_URL below (or swap getAuthToken/API_BASE_URL for your
 *    existing api client / axios instance if you already have one).
 * 2. getAuthToken() assumes the admin JWT is in localStorage under "token".
 *    Change this to match however your app stores the logged-in admin's JWT.
 * 3. This page assumes:
 *      components/Sidebar.tsx      -> default export, no required props
 *      components/LoginTopbar.tsx  -> default export, no required props
 *    Update the two import paths below if your files live elsewhere or
 *    use different export names.
 * 4. This version requires Tailwind CSS to be configured in the project
 *    (used for the responsive mobile-card / desktop-table layout).
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://rd-api-j7zj.onrender.com";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

type InventoryProduct = {
  id: number;
  productNo: string;
  productName: string;
  category: string;
  mrp: number;
  dp: number;
  bv: number;
  quantity: number;
  imageUrl: string;
  isActive: boolean;
  updatedAt: string;
};

const LOW_STOCK_DEFAULT = 10;

function stockTier(qty: number, threshold: number): "out" | "low" | "ok" {
  if (qty <= 0) return "out";
  if (qty <= threshold) return "low";
  return "ok";
}

const TIER_STYLES: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  out: { label: "Out of stock", dot: "#C2402B", text: "#8A2A1B", bg: "#FBE9E5" },
  low: { label: "Low stock", dot: "#C97A2B", text: "#8A5419", bg: "#FBF0E1" },
  ok: { label: "In stock", dot: "#2F7D5B", text: "#1F5A40", bg: "#E7F3ED" },
};

export default function InventoryManagementPage() {
  const [products, setProducts] = useState<InventoryProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [threshold, setThreshold] = useState(LOW_STOCK_DEFAULT);
  const [onlyLow, setOnlyLow] = useState(false);

  const [stockDrafts, setStockDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowMessage, setRowMessage] = useState<Record<number, { text: string; ok: boolean }>>({});

  async function loadInventory() {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/Products/admin/inventory`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          res.status === 401 || res.status === 403
            ? "You need an admin login to view inventory."
            : `Failed to load inventory (${res.status}). ${body}`.trim()
        );
      }
      const data: InventoryProduct[] = await res.json();
      setProducts(data);
    } catch (err) {
      // A bare "Failed to fetch" here (no status code) means the browser never
      // got a response at all — almost always: backend not running, wrong
      // API_BASE_URL, an untrusted HTTPS dev certificate, or CORS blocking it.
      if (err instanceof TypeError) {
        setError(
          `Could not reach the API at ${API_BASE_URL}. Check that the backend is running, ` +
          `that this URL is correct, and — if it's https on localhost — that you've opened ` +
          `${API_BASE_URL} directly in the browser once and accepted the certificate warning.`
        );
      } else {
        setError(err instanceof Error ? err.message : "Failed to load inventory.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const categories = useMemo(() => {
    if (!products) return ["All"];
    return ["All", ...Array.from(new Set(products.map((p) => p.category))).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!p.productName.toLowerCase().includes(q) && !p.productNo.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (onlyLow && stockTier(p.quantity, threshold) === "ok") return false;
      return true;
    });
  }, [products, category, search, onlyLow, threshold]);

  const summary = useMemo(() => {
    if (!products) return { total: 0, low: 0, out: 0 };
    let low = 0;
    let out = 0;
    for (const p of products) {
      const tier = stockTier(p.quantity, threshold);
      if (tier === "low") low += 1;
      if (tier === "out") out += 1;
    }
    return { total: products.length, low, out };
  }, [products, threshold]);

  async function submitAddStock(product: InventoryProduct) {
    const raw = stockDrafts[product.id];
    const delta = Number(raw);
    if (!raw || Number.isNaN(delta) || delta === 0) {
      setRowMessage((m) => ({ ...m, [product.id]: { text: "Enter a non-zero number.", ok: false } }));
      return;
    }

    setSavingId(product.id);
    setRowMessage((m) => ({ ...m, [product.id]: undefined as any }));
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/Products/${product.id}/add-stock`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ quantity: delta }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message ?? `Failed to update stock (${res.status}).`);
      }

      setProducts((prev) =>
        prev
          ? prev.map((p) => (p.id === product.id ? { ...p, quantity: body.quantity ?? p.quantity + delta } : p))
          : prev
      );
      setStockDrafts((d) => ({ ...d, [product.id]: "" }));
      setRowMessage((m) => ({
        ...m,
        [product.id]: { text: delta > 0 ? `+${delta} added` : `${delta} adjusted`, ok: true },
      }));
    } catch (err) {
      setRowMessage((m) => ({
        ...m,
        [product.id]: { text: err instanceof Error ? err.message : "Failed to update stock.", ok: false },
      }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <LoginTopbar />

        <div className="flex-1 text-[#181B20] pb-24 md:pb-10">
          <div className="max-w-[1180px] mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-16">
            {/* ── Header / ledger stamp ── */}
            <div className="flex justify-between items-end flex-wrap gap-5 mb-6">
              <div>
                <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#8A8375] mb-2">
                  Warehouse / Stock Ledger
                </div>
                <h1 className="text-2xl md:text-[30px] font-semibold m-0 tracking-tight">
                  Inventory management
                </h1>
                <p className="mt-1.5 text-[#6B6558] text-sm max-w-[520px]">
                  Stock reduces automatically when an order is approved, and only then — pending or
                  rejected orders never touch these numbers.
                </p>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <SummaryPill label="Products" value={summary.total} tone="neutral" />
                <SummaryPill label="Low stock" value={summary.low} tone="low" />
                <SummaryPill label="Out of stock" value={summary.out} tone="out" />
              </div>
            </div>

            {/* ── Controls ── */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-5 p-3.5 bg-white border border-[#E7E3D9] rounded-[10px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or product no."
                className="flex-1 min-w-0 rounded-[7px] border border-[#DDD8CB] bg-white text-[13.5px] text-[#181B20] outline-none px-3 py-2"
              />

              <div className="flex gap-3 flex-wrap items-center">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-[7px] border border-[#DDD8CB] bg-white text-[13.5px] text-[#181B20] outline-none px-3 py-2 w-full sm:w-[170px]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-[13.5px] text-[#4B4638] whitespace-nowrap">
                  Low-stock ≤
                  <input
                    type="number"
                    min={0}
                    value={threshold}
                    onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
                    className="w-16 text-center rounded-[7px] border border-[#DDD8CB] bg-white text-[13.5px] outline-none px-2 py-1.5"
                  />
                  units
                </label>

                <label className="flex items-center gap-1.5 text-[13.5px] text-[#4B4638] whitespace-nowrap">
                  <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
                  Needs attention only
                </label>

                <button
                  onClick={loadInventory}
                  className="ml-auto md:ml-0 rounded-[7px] border border-[#DDD8CB] bg-white text-[#4B4638] text-[13px] px-3.5 py-2 cursor-pointer"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* ── States ── */}
            {loading && <EmptyState text="Loading stock ledger…" />}
            {!loading && error && <EmptyState text={error} isError />}
            {!loading && !error && filtered.length === 0 && (
              <EmptyState text="Nothing matches these filters." />
            )}

            {/* ── MOBILE: card list ── */}
            {!loading && !error && filtered.length > 0 && (
              <div className="md:hidden space-y-3">
                {filtered.map((p) => {
                  const tier = stockTier(p.quantity, threshold);
                  const tone = TIER_STYLES[tier];
                  const msg = rowMessage[p.id];

                  return (
                    <div key={p.id} className="bg-white border border-[#E7E3D9] rounded-[12px] p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[8px] bg-[#F1EEE5] border border-[#E7E3D9] shrink-0 overflow-hidden">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[14.5px] truncate">{p.productName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11.5px] text-[#9A9484]">{p.productNo}</span>
                            <span className="text-[11.5px] text-[#8A8375]">· {p.category}</span>
                          </div>
                        </div>
                        <div
                          className="font-mono font-bold text-lg shrink-0 tabular-nums"
                          style={{ color: p.quantity < 0 ? "#C2402B" : "#181B20" }}
                        >
                          {p.quantity}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold w-fit"
                          style={{ color: tone.text, background: tone.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
                          {tone.label}
                          {!p.isActive && <span className="text-[#B0AA9A] font-normal">· inactive</span>}
                        </span>
                        <span className="font-mono text-[13px] tabular-nums text-[#5C5749]">
                          DP ₹{p.dp.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <input
                          type="number"
                          placeholder="±qty"
                          value={stockDrafts[p.id] ?? ""}
                          onChange={(e) => setStockDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && submitAddStock(p)}
                          className="flex-1 min-w-0 rounded-[7px] border border-[#DDD8CB] bg-white text-[13.5px] outline-none px-3 py-2"
                        />
                        <button
                          onClick={() => submitAddStock(p)}
                          disabled={savingId === p.id}
                          className="rounded-[7px] border border-[#181B20] bg-[#181B20] text-white text-[13px] font-semibold px-4 py-2 shrink-0"
                          style={{ opacity: savingId === p.id ? 0.6 : 1 }}
                        >
                          {savingId === p.id ? "Saving…" : "Apply"}
                        </button>
                      </div>
                      {msg && (
                        <div className="mt-2 text-xs" style={{ color: msg.ok ? "#2F7D5B" : "#C2402B" }}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── DESKTOP: table ── */}
            {!loading && !error && filtered.length > 0 && (
              <div className="hidden md:block bg-white border border-[#E7E3D9] rounded-[10px] overflow-hidden">
                <div
                  className="grid px-[18px] py-3 text-[11.5px] tracking-[0.08em] uppercase text-[#8A8375] border-b border-[#EFEBE1]"
                  style={{ gridTemplateColumns: "2.4fr 1fr 0.9fr 1fr 1.3fr 1.6fr" }}
                >
                  <span>Product</span>
                  <span>Category</span>
                  <span>DP</span>
                  <span>Status</span>
                  <span>Stock</span>
                  <span>Add / adjust stock</span>
                </div>

                {filtered.map((p) => {
                  const tier = stockTier(p.quantity, threshold);
                  const tone = TIER_STYLES[tier];
                  const msg = rowMessage[p.id];

                  return (
                    <div
                      key={p.id}
                      className="grid items-center px-[18px] py-3.5 border-b border-[#F1EEE5] text-sm"
                      style={{ gridTemplateColumns: "2.4fr 1fr 0.9fr 1fr 1.3fr 1.6fr" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-[38px] h-[38px] rounded-[8px] bg-[#F1EEE5] shrink-0 overflow-hidden border border-[#E7E3D9]">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.productName}</div>
                          <div className="font-mono text-xs text-[#9A9484]">{p.productNo}</div>
                        </div>
                      </div>

                      <span className="text-[#5C5749]">{p.category}</span>

                      <span className="font-mono tabular-nums">₹{p.dp.toFixed(2)}</span>

                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit"
                        style={{ color: tone.text, background: tone.bg }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
                        {tone.label}
                      </span>

                      <span
                        className="font-mono tabular-nums font-bold text-base"
                        style={{ color: p.quantity < 0 ? "#C2402B" : "#181B20" }}
                      >
                        {p.quantity}
                        {!p.isActive && (
                          <span className="ml-2 text-[11px] font-normal text-[#B0AA9A]">(inactive)</span>
                        )}
                      </span>

                      <div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="±qty"
                            value={stockDrafts[p.id] ?? ""}
                            onChange={(e) => setStockDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && submitAddStock(p)}
                            className="w-[88px] rounded-[7px] border border-[#DDD8CB] bg-white text-[13.5px] outline-none px-2.5 py-1.5"
                          />
                          <button
                            onClick={() => submitAddStock(p)}
                            disabled={savingId === p.id}
                            className="rounded-[7px] border border-[#181B20] bg-[#181B20] text-white text-[13px] font-semibold px-3.5 py-1.5"
                            style={{ opacity: savingId === p.id ? 0.6 : 1 }}
                          >
                            {savingId === p.id ? "Saving…" : "Apply"}
                          </button>
                        </div>
                        {msg && (
                          <div className="mt-1.5 text-xs" style={{ color: msg.ok ? "#2F7D5B" : "#C2402B" }}>
                            {msg.text}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "neutral" | "low" | "out" }) {
  const colors =
    tone === "out"
      ? { bg: "#FBE9E5", text: "#8A2A1B" }
      : tone === "low"
      ? { bg: "#FBF0E1", text: "#8A5419" }
      : { bg: "#FFFFFF", text: "#181B20" };
  return (
    <div
      className="flex-1 md:flex-none border border-[#E7E3D9] rounded-[10px] px-3 py-2 md:px-4 md:min-w-[108px]"
      style={{ background: colors.bg }}
    >
      <div className="text-[10px] md:text-[11px] uppercase tracking-[0.08em] text-[#8A8375] whitespace-nowrap">
        {label}
      </div>
      <div className="font-mono text-lg md:text-[22px] font-bold" style={{ color: colors.text }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <div
      className="px-5 py-12 text-center text-sm bg-white border rounded-[10px]"
      style={{
        color: isError ? "#C2402B" : "#8A8375",
        borderColor: isError ? "#F0CFC7" : "#E7E3D9",
      }}
    >
      {text}
    </div>
  );
}