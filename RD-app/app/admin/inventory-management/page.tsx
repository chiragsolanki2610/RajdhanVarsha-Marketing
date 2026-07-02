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
    <div style={{ display: "flex", minHeight: "100vh", background: "#FFFFFF" }}>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main column: topbar + page content ──────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <LoginTopbar />

        <div style={{ flex: 1, color: "#181B20" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 80px" }}>
            {/* ── Header / ledger stamp ─────────────────────────────────── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                flexWrap: "wrap",
                gap: 20,
                marginBottom: 28,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#8A8375",
                    marginBottom: 8,
                  }}
                >
                  Warehouse / Stock Ledger
                </div>
                <h1 style={{ fontSize: 30, fontWeight: 650, margin: 0, letterSpacing: "-0.01em" }}>
                  Inventory management
                </h1>
                <p style={{ margin: "6px 0 0", color: "#6B6558", fontSize: 14.5, maxWidth: 520 }}>
                  Stock reduces automatically when an order is approved, and only then — pending or
                  rejected orders never touch these numbers.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <SummaryPill label="Products" value={summary.total} tone="neutral" />
                <SummaryPill label="Low stock" value={summary.low} tone="low" />
                <SummaryPill label="Out of stock" value={summary.out} tone="out" />
              </div>
            </div>

            {/* ── Controls ───────────────────────────────────────────────── */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 18,
                padding: "14px 16px",
                background: "#FFFFFF",
                border: "1px solid #E7E3D9",
                borderRadius: 10,
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or product no."
                style={inputStyle({ minWidth: 220, flex: "1 1 220px" })}
              />

              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle({ width: 170 })}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#4B4638" }}>
                Low-stock at ≤
                <input
                  type="number"
                  min={0}
                  value={threshold}
                  onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
                  style={inputStyle({ width: 64, textAlign: "center", padding: "6px 8px" })}
                />
                units
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#4B4638" }}>
                <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
                Needs attention only
              </label>

              <button onClick={loadInventory} style={ghostButtonStyle({ marginLeft: "auto" })}>
                Refresh
              </button>
            </div>

            {/* ── States ─────────────────────────────────────────────────── */}
            {loading && <EmptyState text="Loading stock ledger…" />}
            {!loading && error && <EmptyState text={error} isError />}
            {!loading && !error && filtered.length === 0 && (
              <EmptyState text="Nothing matches these filters." />
            )}

            {/* ── Table ──────────────────────────────────────────────────── */}
            {!loading && !error && filtered.length > 0 && (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E7E3D9",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.4fr 1fr 0.9fr 1fr 1.3fr 1.6fr",
                    padding: "12px 18px",
                    fontSize: 11.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#8A8375",
                    borderBottom: "1px solid #EFEBE1",
                  }}
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
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2.4fr 1fr 0.9fr 1fr 1.3fr 1.6fr",
                        alignItems: "center",
                        padding: "14px 18px",
                        borderBottom: "1px solid #F1EEE5",
                        fontSize: 14,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: "#F1EEE5",
                            flexShrink: 0,
                            overflow: "hidden",
                            border: "1px solid #E7E3D9",
                          }}
                        >
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : null}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 560, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.productName}
                          </div>
                          <div
                            style={{
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                              fontSize: 12,
                              color: "#9A9484",
                            }}
                          >
                            {p.productNo}
                          </div>
                        </div>
                      </div>

                      <span style={{ color: "#5C5749" }}>{p.category}</span>

                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" }}>
                        ₹{p.dp.toFixed(2)}
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 560,
                          color: tone.text,
                          background: tone.bg,
                          width: "fit-content",
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone.dot }} />
                        {tone.label}
                      </span>

                      <span
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 650,
                          fontSize: 16,
                          color: p.quantity < 0 ? "#C2402B" : "#181B20",
                        }}
                      >
                        {p.quantity}
                        {!p.isActive && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: "#B0AA9A" }}>(inactive)</span>
                        )}
                      </span>

                      <div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="number"
                            placeholder="±qty"
                            value={stockDrafts[p.id] ?? ""}
                            onChange={(e) => setStockDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && submitAddStock(p)}
                            style={inputStyle({ width: 88, padding: "6px 10px" })}
                          />
                          <button
                            onClick={() => submitAddStock(p)}
                            disabled={savingId === p.id}
                            style={primaryButtonStyle({ opacity: savingId === p.id ? 0.6 : 1 })}
                          >
                            {savingId === p.id ? "Saving…" : "Apply"}
                          </button>
                        </div>
                        {msg && (
                          <div style={{ marginTop: 6, fontSize: 12, color: msg.ok ? "#2F7D5B" : "#C2402B" }}>
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
      style={{
        background: colors.bg,
        border: "1px solid #E7E3D9",
        borderRadius: 10,
        padding: "10px 16px",
        minWidth: 108,
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8A8375" }}>{label}</div>
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 22,
          fontWeight: 650,
          color: colors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <div
      style={{
        padding: "48px 20px",
        textAlign: "center",
        color: isError ? "#C2402B" : "#8A8375",
        background: "#FFFFFF",
        border: `1px solid ${isError ? "#F0CFC7" : "#E7E3D9"}`,
        borderRadius: 10,
        fontSize: 14.5,
      }}
    >
      {text}
    </div>
  );
}

function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 7,
    border: "1px solid #DDD8CB",
    background: "#FFFFFF",
    fontSize: 13.5,
    color: "#181B20",
    outline: "none",
    ...extra,
  };
}

function primaryButtonStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: "7px 14px",
    borderRadius: 7,
    border: "1px solid #181B20",
    background: "#181B20",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 560,
    cursor: "pointer",
    ...extra,
  };
}

function ghostButtonStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 7,
    border: "1px solid #DDD8CB",
    background: "#FFFFFF",
    color: "#4B4638",
    fontSize: 13,
    cursor: "pointer",
    ...extra,
  };
}
