"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Undo2,
  History,
  Wallet as WalletIcon,
  Search,
  Package,
  Check,
  X,
  Info,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";
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
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-500">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} onError={() => setFailed(true)} className="h-12 w-12 shrink-0 rounded-xl object-cover" />;
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

  // Used by the mobile bottom bar to scroll down to the review panel
  const summaryRef = useRef<HTMLElement | null>(null);

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
      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition sm:text-sm ${
        tab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={16} className="shrink-0" /> {label}
      {key === "history" && hasPending && <span className="h-2 w-2 rounded-full bg-amber-400" />}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PickupCenterSidebar />
      {/* min-w-0 + overflow-x-hidden keeps wide content from pushing the page sideways;
          pb-24 keeps the last items clear of the fixed bottom nav on mobile */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden pb-24 md:pb-0">
        <PickupCenterTopbar title="Return" operatorName={operatorName} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {tabBtn("new", "New Return", Undo2)}
              {tabBtn("history", "My Returns", History)}
            </div>

            {notice && (
              <div
                className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                  notice.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <span className="min-w-0 break-words">{notice.text}</span>
                <button onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
                  <X size={16} />
                </button>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
            ) : tab === "new" ? (
              <>
                <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:gap-6">
                  {/* Step 1 */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                      <Package size={18} className="text-blue-600" /> Select products to return
                    </h2>

                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-800">
                      <Info size={14} className="mt-0.5 shrink-0" />
                      <span>
                        A {DEDUCTION_PERCENT}% deduction applies. The rest is credited to your wallet once the company approves.
                      </span>
                    </div>

                    <div className="relative mt-3">
                      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your stock..."
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:text-sm"
                      />
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {filtered.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                          {stock.length === 0 ? "You have no stock available to return." : "No products match your search."}
                        </div>
                      ) : (
                        filtered.map((item) => {
                          const qty = selected[item.productId];
                          const checked = !!qty;
                          return (
                            <div
                              key={item.productId}
                              className={`overflow-hidden rounded-2xl border transition ${
                                checked ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20" : "border-slate-200 bg-white"
                              }`}
                            >
                              {/* Whole row is tappable */}
                              <button
                                type="button"
                                onClick={() => toggle(item)}
                                aria-pressed={checked}
                                className="flex w-full items-center gap-3 p-3 text-left"
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                    checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {checked && <Check size={14} strokeWidth={3} />}
                                </span>
                                <Thumb src={item.imageUrl} name={item.productName} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold leading-snug text-slate-900">{item.productName}</p>
                                  <p className="mt-0.5 text-[11px] uppercase text-slate-400">{item.productNo}</p>
                                  <p className="mt-0.5 text-xs font-semibold text-slate-700">
                                    DP {inr(item.dp)}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  {item.quantity} {item.quantity === 1 ? "unit" : "units"}
                                </span>
                              </button>

                              {/* Quantity row appears once selected */}
                              {checked && (
                                <div className="flex items-center justify-between gap-3 border-t border-blue-100 bg-white/60 px-3 py-2.5">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                      Return qty <span className="font-normal normal-case">(max {item.quantity})</span>
                                    </p>
                                    <p className="text-sm font-bold text-slate-900">{inr(item.dp * qty)}</p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 p-1">
                                    <button
                                      type="button"
                                      onClick={() => setQty(item, qty - 1)}
                                      disabled={qty <= 1}
                                      aria-label="Decrease quantity"
                                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-40"
                                    >
                                      <Minus size={16} />
                                    </button>
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      max={item.quantity}
                                      value={qty}
                                      onChange={(e) => setQty(item, Number(e.target.value))}
                                      className="h-9 w-12 rounded-lg bg-transparent text-center text-base font-bold text-slate-900 outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setQty(item, qty + 1)}
                                      disabled={qty >= item.quantity}
                                      aria-label="Increase quantity"
                                      className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition active:scale-95 disabled:bg-slate-300"
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  {/* Step 2 / summary */}
                  <aside
                    ref={summaryRef as React.RefObject<HTMLElement>}
                    className="h-fit scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 lg:sticky lg:top-6"
                  >
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                      <Undo2 size={18} className="text-blue-600" /> Review ({lines.length})
                    </h2>

                    {lines.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">No items selected yet.</p>
                    ) : (
                      <ul className="mt-4 space-y-2.5 text-sm">
                        {lines.map((l) => (
                          <li key={l.productId} className="flex justify-between gap-3">
                            <span className="min-w-0 text-slate-700">
                              {l.productName} <span className="text-slate-400">× {l.qty}</span>
                            </span>
                            <span className="shrink-0 font-semibold text-slate-900">{inr(l.line)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                      <div className="flex justify-between text-slate-600"><span>Total ({units} units)</span><span>{inr(subTotal)}</span></div>
                      <div className="flex justify-between text-red-600"><span>Deduction ({DEDUCTION_PERCENT}%)</span><span>− {inr(deduction)}</span></div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                        <span>Credited to wallet</span><span className="text-emerald-600">{inr(credit)}</span>
                      </div>
                    </div>

                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for return (optional)"
                      rows={3}
                      className="mt-4 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:text-sm"
                    />

                    <button
                      onClick={submit}
                      disabled={!lines.length || submitting}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      <Check size={16} /> {submitting ? "Sending…" : "Send Return Request"}
                    </button>
                    <p className="mt-2 text-center text-xs text-slate-400">Stock and wallet change only after the company approves.</p>
                  </aside>
                </div>

                {/* Mobile sticky bar (sits just above the bottom nav) */}
                {lines.length > 0 && (
                  <div className="sticky bottom-[4.5rem] z-30 lg:hidden">
                    <button
                      onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-left text-white shadow-lg active:scale-[0.99]"
                    >
                      <span>
                        <span className="block text-[11px] font-medium uppercase tracking-wide text-blue-100">
                          {lines.length} product{lines.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}
                        </span>
                        <span className="block text-base font-extrabold">{inr(credit)} credit</span>
                      </span>
                      <span className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700">
                        Review
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <History size={18} className="text-blue-600" /> Return Requests
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      <WalletIcon size={13} /> {inr(wallet?.balance ?? 0)}
                    </span>
                    <button
                      onClick={() => { loadReturns().catch(() => {}); loadWallet().catch(() => {}); loadStock().catch(() => {}); }}
                      className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <RefreshCw size={13} /> Refresh
                    </button>
                  </div>
                </div>

                {returns.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">You haven&apos;t made any return requests yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {returns.map((r) => (
                      <article key={r.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-bold text-slate-900">{r.requestNo}</div>
                            <div className="text-xs text-slate-500">{fmtDate(r.requestedAt)}</div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[r.status]}`}>
                            {r.status === "Rejected" ? "Rejected" : r.status}
                          </span>
                        </div>

                        <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-slate-50 px-3 text-sm">
                          {r.items.map((i) => (
                            <li key={i.productId} className="flex justify-between gap-3 py-2">
                              <span className="min-w-0 text-slate-700">{i.productName} <span className="text-slate-400">× {i.quantity}</span></span>
                              <span className="shrink-0 font-medium text-slate-700">{inr(i.lineTotal)}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 space-y-1.5 text-sm">
                          <div className="flex justify-between gap-3 text-slate-500">
                            <span>Total</span>
                            <span>{inr(r.subTotalDp)}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-slate-500">
                            <span>Deduction ({r.deductionPercent}%)</span>
                            <span>− {inr(r.deductionAmount)}</span>
                          </div>
                        </div>

                        <div
                          className={`mt-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                            r.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : r.status === "Pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {r.status === "Approved"
                            ? `${inr(r.creditAmount)} credited to wallet`
                            : r.status === "Pending"
                            ? "Waiting for company review"
                            : "Request rejected — no changes made"}
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
