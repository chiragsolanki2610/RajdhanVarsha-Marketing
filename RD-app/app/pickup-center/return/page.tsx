"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Undo2, History, Wallet as WalletIcon, Search, Package, Check, X } from "lucide-react";
import PickupCenterTopbar from "@/components/pickup_centertopbar";
import PickupCenterSidebar from "@/components/pickup_centersidebar";

/* ── CONFIG — adjust to your project ── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://rd-api-j7zj.onrender.com";
// localStorage key where your pickup-center login stores its JWT
const TOKEN_KEY = "pucToken";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const res = await fetch(`${API_BASE}/api/PickupCenter${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data as T;
}

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

// Display only — the server (ReturnRules.DeductionPercent) is the source of truth.
const DEDUCTION_PERCENT = 6;

type StockItem = {
  productId: number;
  productNo: string;
  productName: string;
  category: string;
  imageUrl: string;
  dp: number;
  quantity: number; // returnable units (pending requests already excluded)
};

type ReturnItem = { productId: number; productName: string; quantity: number; lineTotal: number };

type ReturnRequest = {
  id: number;
  requestNo: string;
  items: ReturnItem[];
  subTotalDp: number;
  deductionPercent: number;
  deductionAmount: number;
  creditAmount: number;
  status: "Pending" | "Approved" | "Rejected";
  requestedAt: string;
  rejectionReason?: string | null;
};

type Wallet = { balance: number; totalEarned: number; totalWithdrawn: number };

const STATUS_STYLES: Record<ReturnRequest["status"], string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

function Thumb({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed)
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} onError={() => setFailed(true)} className="h-11 w-11 shrink-0 rounded-lg object-cover" />;
}

export default function ReturnPage() {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [operatorName, setOperatorName] = useState("");

  useEffect(() => {
    api<{ fullName: string }>("/profile")
      .then((p) => setOperatorName(p.fullName))
      .catch(() => {});
  }, []);

  const loadStock = useCallback(async () => setStock(await api<StockItem[]>("/returns/eligible-stock")), []);
  const loadReturns = useCallback(async () => setReturns(await api<ReturnRequest[]>("/returns")), []);
  const loadWallet = useCallback(async () => setWallet(await api<Wallet>("/wallet")), []);

  useEffect(() => {
    Promise.all([loadStock(), loadReturns(), loadWallet()])
      .catch((e) => setNotice({ type: "error", text: (e as Error).message }))
      .finally(() => setLoading(false));
  }, [loadStock, loadReturns, loadWallet]);

  // Poll while something is pending so approve/reject shows up without a refresh.
  const hasPending = returns.some((r) => r.status === "Pending");
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(() => {
      loadReturns().catch(() => {});
      loadWallet().catch(() => {});
      loadStock().catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [hasPending, loadReturns, loadWallet, loadStock]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? stock.filter((s) => s.productName.toLowerCase().includes(q) || s.productNo.toLowerCase().includes(q)) : stock;
  }, [stock, search]);

  const toggle = (item: StockItem) =>
    setSelected((p) => {
      const n = { ...p };
      if (n[item.productId]) delete n[item.productId];
      else n[item.productId] = 1;
      return n;
    });

  const setQty = (item: StockItem, qty: number) =>
    setSelected((p) => ({ ...p, [item.productId]: Math.min(Math.max(1, Math.floor(qty) || 1), item.quantity) }));

  const lines = useMemo(
    () => stock.filter((s) => selected[s.productId]).map((s) => ({ ...s, qty: selected[s.productId], line: s.dp * selected[s.productId] })),
    [stock, selected]
  );
  const subTotal = lines.reduce((a, l) => a + l.line, 0);
  const deduction = Math.round(subTotal * DEDUCTION_PERCENT) / 100;
  const credit = subTotal - deduction;
  const units = lines.reduce((a, l) => a + l.qty, 0);

  const submit = async () => {
    if (!lines.length || submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await api("/returns", {
        method: "POST",
        body: JSON.stringify({ items: lines.map((l) => ({ productId: l.productId, quantity: l.qty })), reason: reason.trim() || null }),
      });
      setSelected({});
      setReason("");
      await Promise.all([loadStock(), loadReturns()]);
      setNotice({ type: "ok", text: "Return request sent to the company. Waiting for approval." });
      setTab("history");
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
      loadStock().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const tabBtn = (key: "new" | "history", label: string, Icon: typeof Undo2) => (
    <button
      onClick={() => setTab(key)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
        tab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={16} /> {label}
      {key === "history" && hasPending && <span className="h-2 w-2 rounded-full bg-amber-400" />}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PickupCenterSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PickupCenterTopbar title="Return" operatorName={operatorName} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
      {/* Tabs (same pattern as Manage Inventory) */}
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tabBtn("new", "Return to Company", Undo2)}
        {tabBtn("history", "My Returns", History)}
      </div>

      {notice && (
        <div
          className={`flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${
            notice.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="ml-4 opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Loading…</div>
      ) : tab === "new" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Step 1 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Package size={18} className="text-blue-600" /> Step 1: Select Products to Return
            </h2>

            <div className="relative mt-4">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your stock..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  {stock.length === 0 ? "You have no stock available to return." : "No products match your search."}
                </div>
              ) : (
                filtered.map((item) => {
                  const qty = selected[item.productId];
                  const checked = !!qty;
                  return (
                    <div key={item.productId} className={`flex items-center gap-3 px-4 py-3 transition ${checked ? "bg-blue-50/60" : "bg-white"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(item)} className="h-4 w-4 accent-blue-600" />
                      <Thumb src={item.imageUrl} name={item.productName} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{item.productName}</div>
                        <div className="text-xs text-slate-500">
                          {item.productNo} · DP {inr(item.dp)}
                        </div>
                      </div>
                      {checked ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQty(item, qty - 1)} className="h-8 w-8 rounded-lg border border-slate-300 text-base hover:bg-slate-50">−</button>
                          <input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={qty}
                            onChange={(e) => setQty(item, Number(e.target.value))}
                            className="h-8 w-14 rounded-lg border border-slate-300 text-center text-sm outline-none focus:border-blue-500"
                          />
                          <button onClick={() => setQty(item, qty + 1)} className="h-8 w-8 rounded-lg border border-slate-300 text-base hover:bg-slate-50">+</button>
                        </div>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{item.quantity} units</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Step 2 / summary */}
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Undo2 size={18} className="text-blue-600" /> Step 2: Review ({lines.length})
            </h2>

            {lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No items selected yet.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {lines.map((l) => (
                  <li key={l.productId} className="flex justify-between gap-3">
                    <span className="text-slate-700">
                      {l.productName} <span className="text-slate-400">× {l.qty}</span>
                    </span>
                    <span className="font-medium text-slate-900">{inr(l.line)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Total ({units} units)</span><span>{inr(subTotal)}</span></div>
              <div className="flex justify-between text-red-600"><span>Deduction ({DEDUCTION_PERCENT}%)</span><span>− {inr(deduction)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                <span>Credited to wallet</span><span className="text-emerald-600">{inr(credit)}</span>
              </div>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for return (optional)"
              rows={3}
              className="mt-4 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={submit}
              disabled={!lines.length || submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <Check size={16} /> {submitting ? "Sending…" : "Send Return Request"}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">Stock and wallet change only after the company approves.</p>
          </aside>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <History size={18} className="text-blue-600" /> Return Requests
            </h2>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <WalletIcon size={13} /> {inr(wallet?.balance ?? 0)}
              </span>
              <button
                onClick={() => { loadReturns().catch(() => {}); loadWallet().catch(() => {}); loadStock().catch(() => {}); }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {returns.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">You haven&apos;t made any return requests yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {returns.map((r) => (
                <article key={r.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">{r.requestNo}</div>
                      <div className="text-xs text-slate-500">{fmtDate(r.requestedAt)}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>
                      {r.status === "Rejected" ? "Request rejected" : r.status}
                    </span>
                  </div>

                  <ul className="mt-3 divide-y divide-slate-100 text-sm">
                    {r.items.map((i) => (
                      <li key={i.productId} className="flex justify-between py-1.5">
                        <span className="text-slate-700">{i.productName} <span className="text-slate-400">× {i.quantity}</span></span>
                        <span className="text-slate-600">{inr(i.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                    <span className="text-slate-500">Total {inr(r.subTotalDp)} − {r.deductionPercent}% ({inr(r.deductionAmount)})</span>
                    {r.status === "Approved" ? (
                      <span className="font-bold text-emerald-600">{inr(r.creditAmount)} credited to wallet</span>
                    ) : r.status === "Pending" ? (
                      <span className="font-medium text-amber-700">Waiting for company review</span>
                    ) : (
                      <span className="font-medium text-red-600">No changes made</span>
                    )}
                  </div>

                  {r.status === "Rejected" && r.rejectionReason && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Company note: {r.rejectionReason}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
          </div>
        </main>
      </div>
    </div>
  );
}