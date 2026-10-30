// app/pickup-center/wallet/page.tsx  (REPLACES your existing file — Add Money is a pop-up on this page)
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wallet as WalletIcon, PlusCircle, Clock,
  ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle,
  Copy, Check, UploadCloud, ImageIcon, X, Smartphone,
  TrendingUp, TrendingDown, Receipt,
} from "lucide-react";
import PickupCenterTopbar from "@/components/pickup_centertopbar";
import PickupCenterSidebar from "@/components/pickup_centersidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://rd-api-j7zj.onrender.com";
const TOKEN_KEY = "pucToken";
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];
const MAX_FILE = 5 * 1024 * 1024;

function authHeader(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/PickupCenter${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeader(), ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data as T;
}

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

type Wallet = { balance: number; totalEarned: number; totalWithdrawn: number };
type Tx = {
  id: number; type: "Credit" | "Debit"; amount: number; balanceAfter: number;
  source: string; description?: string | null; referenceId?: string | null; createdAt: string;
};
type TopUp = {
  id: number; requestNo: string; amount: number; utrNumber: string;
  status: "Pending" | "Approved" | "Rejected"; requestedAt: string;
  processedAt?: string | null; rejectionReason?: string | null;
};
type PaymentInfo = { upiId: string; payeeName: string; minAmount: number; maxAmount: number };

const STATUS_STYLE: Record<TopUp["status"], { cls: string; Icon: typeof Clock }> = {
  Pending: { cls: "bg-amber-50 text-amber-700 ring-amber-200", Icon: Clock },
  Approved: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircle2 },
  Rejected: { cls: "bg-red-50 text-red-700 ring-red-200", Icon: XCircle },
};

/* ───────────────────────── Add Money pop-up ───────────────────────── */

function AddMoneyModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<PaymentInfo>("/topups/payment-info").then(setInfo).catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const copyUpi = async () => {
    if (!info) return;
    await navigator.clipboard.writeText(info.upiId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const pickFile = (f?: File | null) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return setError("Screenshot must be a JPG, PNG or WebP image.");
    if (f.size > MAX_FILE) return setError("Screenshot must be 5 MB or smaller.");
    if (f.size < 2 * 1024) return setError("This image looks empty or corrupted. Please upload the actual payment screenshot.");
    setError(null);
    setFile(f);
  };

  const amt = Number(amount);
  const upiLink = info && amt > 0
    ? `upi://pay?pa=${encodeURIComponent(info.upiId)}&pn=${encodeURIComponent(info.payeeName)}&am=${amt.toFixed(2)}&cu=INR`
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!info) return;
    if (!amt || amt < info.minAmount || amt > info.maxAmount)
      return setError(`Enter an amount between ₹${info.minAmount.toLocaleString("en-IN")} and ₹${info.maxAmount.toLocaleString("en-IN")}.`);
    if (!/^[A-Za-z0-9]{12,22}$/.test(utr.trim()))
      return setError("Enter a valid UTR / transaction reference number (12–22 letters or digits).");
    if (!file) return setError("Please upload your payment screenshot.");

    const fd = new FormData();
    fd.append("amount", String(amt));
    fd.append("utrNumber", utr.trim());
    fd.append("screenshot", file);

    setSubmitting(true);
    try {
      // No Content-Type header: the browser sets the multipart boundary itself.
      const res = await fetch(`${API_BASE}/api/PickupCenter/topups`, { method: "POST", headers: authHeader(), body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
      setDone(true);
      onSubmitted(); // refresh the lists behind the pop-up
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // text-base on mobile stops iOS from zooming into the field
  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/20 sm:text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl [&::-webkit-scrollbar]:hidden sm:rounded-3xl"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 pb-3 pt-2 sm:px-6 sm:py-4">
          {/* little grab handle, mobile only */}
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <PlusCircle size={18} className="text-[#3B5998]" /> Add money to wallet
            </h2>
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200">
              <X size={16} className="text-slate-600" />
            </button>
          </div>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
            <h3 className="mt-4 text-xl font-bold text-slate-900">Payment submitted</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
              The company will verify your payment. Once approved, ₹{amt.toLocaleString("en-IN")} is added to your wallet.
              Track it under <b>Top-up requests</b>.
            </p>
            <button onClick={onClose} className="mt-6 w-full rounded-xl bg-[#3B5998] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#2f4779] sm:w-auto">
              Done
            </button>
          </div>
        ) : (
          <div className="grid gap-6 p-5 pb-8 sm:p-6 md:grid-cols-5">
            {/* Step 1 — pay */}
            <section className="md:col-span-2">
              <h3 className="text-sm font-bold text-slate-900">1. Pay the company</h3>
              <p className="mt-1 text-xs text-slate-500">Scan the QR with any UPI app, or pay to the UPI ID.</p>

              <div className="mt-4 flex justify-center rounded-2xl border border-slate-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/photos/QR.jpg" alt="Company UPI QR code" className="h-44 w-44 object-contain sm:h-48 sm:w-48" />
              </div>

              <div className="mt-4">
                <div className="text-xs font-medium text-slate-500">UPI ID</div>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <span className="min-w-0 flex-1 break-all font-mono text-xs text-slate-900">{info?.upiId ?? "…"}</span>
                  <button type="button" onClick={copyUpi} className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3B5998] ring-1 ring-slate-200 hover:bg-slate-50">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                {info?.payeeName && <div className="mt-2 text-xs text-slate-500">Payee: {info.payeeName}</div>}
              </div>

              {upiLink && (
                <a href={upiLink} className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#3B5998]/30 bg-[#3B5998]/5 px-4 py-3 text-sm font-semibold text-[#3B5998] sm:hidden">
                  <Smartphone size={16} /> Open UPI app to pay ₹{amt.toLocaleString("en-IN")}
                </a>
              )}
            </section>

            {/* Step 2 — proof */}
            <form onSubmit={submit} className="md:col-span-3">
              <h3 className="text-sm font-bold text-slate-900">2. Submit payment proof</h3>
              <p className="mt-1 text-xs text-slate-500">Enter exactly what you paid. The company checks it against their bank statement.</p>

              {error && (
                <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span className="min-w-0 break-words">{error}</span>
                  <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0"><X size={16} /></button>
                </div>
              )}

              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700">Amount paid (₹)</label>
                <input type="number" inputMode="decimal" min={info?.minAmount} max={info?.maxAmount} step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" className={`${input} mt-1.5`} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((q) => (
                    <button key={q} type="button" onClick={() => setAmount(String(q))}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${Number(amount) === q ? "border-[#3B5998] bg-[#3B5998] text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                      ₹{q.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
                {info && <div className="mt-1.5 text-xs text-slate-500">Min ₹{info.minAmount.toLocaleString("en-IN")} · Max ₹{info.maxAmount.toLocaleString("en-IN")}</div>}
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700">UTR / Transaction ID</label>
                <input value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase())} maxLength={22}
                  placeholder="12-digit UTR from your UPI app" className={`${input} mt-1.5 font-mono`} />
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700">Payment screenshot</label>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                {preview ? (
                  <div className="mt-1.5 flex items-center gap-4 rounded-xl border border-slate-200 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Screenshot preview" className="h-20 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="truncate font-medium text-slate-900">{file?.name}</div>
                      <div className="text-xs text-slate-500">{file ? (file.size / 1024).toFixed(0) : 0} KB</div>
                      <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="mt-1 text-xs font-semibold text-red-600 hover:underline">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
                    className="mt-1.5 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-slate-500 transition hover:border-[#3B5998] hover:bg-[#3B5998]/5">
                    <UploadCloud size={26} />
                    <span className="text-sm font-medium text-slate-700">Tap to upload screenshot</span>
                    <span className="flex items-center gap-1 text-xs"><ImageIcon size={12} /> JPG, PNG or WebP · max 5 MB</span>
                  </button>
                )}
              </div>

              <button type="submit" disabled={submitting || !info}
                className="mt-5 w-full rounded-xl bg-[#3B5998] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#2f4779] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Submitting…" : "Submit for approval"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Wallet page ───────────────────────── */

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [topups, setTopups] = useState<TopUp[]>([]);
  const [tab, setTab] = useState<"transactions" | "requests">("transactions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api<{ fullName: string }>("/profile").then((p) => setOperatorName(p.fullName)).catch(() => {});
  }, []);

  const load = () =>
    Promise.all([
      api<Wallet>("/wallet"),
      api<Tx[]>("/wallet/transactions"),
      // A failing top-up request must not blank the balance/transactions.
      api<TopUp[]>("/topups").catch(() => [] as TopUp[]),
    ])
      .then(([w, t, u]) => { setWallet(w); setTxs(t); setTopups(u); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const pending = useMemo(() => topups.filter((t) => t.status === "Pending"), [topups]);
  const pendingTotal = pending.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PickupCenterSidebar />
      {/* min-w-0 + overflow-x-hidden keeps wide content from pushing the page sideways;
          pb-24 keeps the last items clear of the fixed bottom nav on mobile */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden pb-24 md:pb-0">
        <PickupCenterTopbar title="Wallet" operatorName={operatorName} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {/* Balance hero */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3B5998] via-[#33508a] to-[#1E3A6E] p-5 text-white shadow-lg sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-16 right-12 h-36 w-36 rounded-full bg-white/5" />

              <div className="relative">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <WalletIcon size={16} /> Available balance
                </div>
                <div className="mt-1.5 text-4xl font-extrabold tracking-tight sm:text-5xl">
                  {loading ? "…" : inr(wallet?.balance ?? 0)}
                </div>
                {pending.length > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                    <Clock size={13} />
                    {inr(pendingTotal)} awaiting approval ({pending.length})
                  </div>
                )}

                {/* Earned / withdrawn */}
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-white/10 px-3.5 py-3 ring-1 ring-white/15">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                      <TrendingUp size={13} className="text-emerald-300" /> Total earned
                    </div>
                    <div className="mt-0.5 truncate text-sm font-bold sm:text-base">
                      {loading ? "…" : inr(wallet?.totalEarned ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3.5 py-3 ring-1 ring-white/15">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                      <TrendingDown size={13} className="text-rose-300" /> Total withdrawn
                    </div>
                    <div className="mt-0.5 truncate text-sm font-bold sm:text-base">
                      {loading ? "…" : inr(wallet?.totalWithdrawn ?? 0)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#3B5998] shadow-sm transition active:scale-[0.99] hover:bg-slate-100 sm:w-auto"
                >
                  <PlusCircle size={18} /> Add money
                </button>
              </div>
            </section>

            {/* History */}
            <section className="space-y-4">
              {/* Segmented tabs */}
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                {([
                  ["transactions", "Transactions", txs.length],
                  ["requests", "Top-ups", topups.length],
                ] as const).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition sm:text-sm ${
                      tab === key ? "bg-[#3B5998] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        tab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                    {key === "requests" && pending.length > 0 && (
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                  ))}
                </div>
              ) : tab === "transactions" ? (
                txs.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                    <Receipt size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">
                      No transactions yet. Add money or return stock to get started.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: card list */}
                    <ul className="space-y-2.5 md:hidden">
                      {txs.map((t) => {
                        const credit = t.type === "Credit";
                        return (
                          <li key={t.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                            <div className="flex items-start gap-3">
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                  credit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                }`}
                              >
                                {credit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-bold leading-snug text-slate-900">{t.source}</p>
                                  <p className={`shrink-0 text-sm font-extrabold ${credit ? "text-emerald-600" : "text-red-600"}`}>
                                    {credit ? "+" : "−"} {inr(t.amount)}
                                  </p>
                                </div>
                                {t.description && (
                                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500 [overflow-wrap:anywhere]">
                                    {t.description}
                                  </p>
                                )}
                                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                                  <span>{fmtDate(t.createdAt)}</span>
                                  <span className="shrink-0 font-medium text-slate-500">Bal {inr(t.balanceAfter)}</span>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Desktop: table */}
                    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {txs.map((t) => {
                            const credit = t.type === "Credit";
                            return (
                              <tr key={t.id}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${credit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                                      {credit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="font-medium text-slate-900">{t.source}</div>
                                      {t.description && (
                                        <div className="max-w-md text-xs text-slate-500 [overflow-wrap:anywhere]">{t.description}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(t.createdAt)}</td>
                                <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${credit ? "text-emerald-600" : "text-red-600"}`}>
                                  {credit ? "+" : "−"} {inr(t.amount)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">{inr(t.balanceAfter)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              ) : topups.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                  <PlusCircle size={32} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">You haven&apos;t added money yet.</p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="mt-4 rounded-xl bg-[#3B5998] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f4779]"
                  >
                    Add money
                  </button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {topups.map((t) => {
                    const { cls, Icon } = STATUS_STYLE[t.status];
                    return (
                      <li key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-lg font-extrabold text-slate-900">{inr(t.amount)}</div>
                            <div className="mt-0.5 text-xs font-semibold text-slate-500">{t.requestNo}</div>
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${cls}`}>
                            <Icon size={13} /> {t.status}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">UTR</span>
                            <span className="font-mono font-medium text-slate-800 [overflow-wrap:anywhere]">{t.utrNumber}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Requested</span>
                            <span className="text-slate-700">{fmtDate(t.requestedAt)}</span>
                          </div>
                        </div>

                        {t.status === "Rejected" && (
                          <div className="mt-2.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                            {t.rejectionReason ? `Reason: ${t.rejectionReason}` : "Rejected by the company. No amount was credited."}
                          </div>
                        )}
                        {t.status === "Pending" && (
                          <div className="mt-2.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            Waiting for the company to verify your payment.
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </main>
      </div>

      {showAdd && (
        <AddMoneyModal
          onClose={() => setShowAdd(false)}
          onSubmitted={() => { setTab("requests"); load(); }}
        />
      )}
    </div>
  );
}
