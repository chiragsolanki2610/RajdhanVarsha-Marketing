// app/pickup-center/wallet/page.tsx  (REPLACES your existing file — Add Money is a pop-up on this page)
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wallet as WalletIcon, PlusCircle, Clock,
  ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle,
  Copy, Check, UploadCloud, ImageIcon, X, Smartphone,
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

  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/20";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl [&::-webkit-scrollbar]:hidden sm:rounded-3xl"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <PlusCircle size={18} className="text-[#3B5998]" /> Add money to wallet
          </h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
            <h3 className="mt-4 text-xl font-bold text-slate-900">Payment submitted</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
              The company will verify your payment. Once approved, ₹{amt.toLocaleString("en-IN")} is added to your wallet.
              Track it under <b>Top-up requests</b>.
            </p>
            <button onClick={onClose} className="mt-6 rounded-xl bg-[#3B5998] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2f4779]">
              Done
            </button>
          </div>
        ) : (
          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-5">
            {/* Step 1 — pay */}
            <section className="md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900">1. Pay the company</h3>
              <p className="mt-1 text-xs text-slate-500">Scan the QR with any UPI app, or pay to the UPI ID.</p>

              <div className="mt-4 flex justify-center rounded-2xl border border-slate-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/photos/QR.jpg" alt="Company UPI QR code" className="h-48 w-48 object-contain" />
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
                <a href={upiLink} className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#3B5998]/30 bg-[#3B5998]/5 px-4 py-2.5 text-sm font-semibold text-[#3B5998] sm:hidden">
                  <Smartphone size={16} /> Open UPI app to pay ₹{amt.toLocaleString("en-IN")}
                </a>
              )}
            </section>

            {/* Step 2 — proof */}
            <form onSubmit={submit} className="md:col-span-3">
              <h3 className="text-sm font-semibold text-slate-900">2. Submit payment proof</h3>
              <p className="mt-1 text-xs text-slate-500">Enter exactly what you paid. The company checks it against their bank statement.</p>

              {error && (
                <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span>{error}</span>
                  <button type="button" onClick={() => setError(null)}><X size={16} /></button>
                </div>
              )}

              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700">Amount paid (₹)</label>
                <input type="number" inputMode="decimal" min={info?.minAmount} max={info?.maxAmount} step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" className={`${input} mt-1.5`} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((q) => (
                    <button key={q} type="button" onClick={() => setAmount(String(q))}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${Number(amount) === q ? "border-[#3B5998] bg-[#3B5998] text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
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
                    <span className="text-sm font-medium text-slate-700">Click to upload or drag &amp; drop</span>
                    <span className="flex items-center gap-1 text-xs"><ImageIcon size={12} /> JPG, PNG or WebP · max 5 MB</span>
                  </button>
                )}
              </div>

              <button type="submit" disabled={submitting || !info}
                className="mt-5 w-full rounded-xl bg-[#3B5998] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2f4779] disabled:cursor-not-allowed disabled:opacity-60">
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
      <div className="flex min-w-0 flex-1 flex-col">
        <PickupCenterTopbar title="Wallet" operatorName={operatorName} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {/* Balance hero */}
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#3B5998] to-[#2b4373] p-6 text-white shadow-lg sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <WalletIcon size={16} /> Available balance
                  </div>
                  <div className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                    {loading ? "…" : inr(wallet?.balance ?? 0)}
                  </div>
                  {pending.length > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                      <Clock size={13} />
                      {inr(pendingTotal)} awaiting approval ({pending.length})
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#3B5998] shadow-sm transition hover:bg-slate-100"
                  >
                    <PlusCircle size={18} /> Add money
                  </button>
                </div>
              </div>
            </section>

            {/* History */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex gap-1 border-b border-slate-200 px-4 pt-3 sm:px-6">
                {([
                  ["transactions", `Transactions (${txs.length})`],
                  ["requests", `Top-up requests (${topups.length})`],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                      tab === key ? "border-[#3B5998] text-[#3B5998]" : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-6">
                {loading ? (
                  <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
                ) : tab === "transactions" ? (
                  txs.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">
                      No transactions yet. Add money or return stock to get started.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                                    <div>
                                      <div className="font-medium text-slate-900">{t.source}</div>
                                      {t.description && <div className="text-xs text-slate-500">{t.description}</div>}
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
                  )
                ) : topups.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    You haven&apos;t added money yet.
                    <div className="mt-3">
                      <button onClick={() => setShowAdd(true)} className="font-semibold text-[#3B5998] hover:underline">
                        Add money
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {topups.map((t) => {
                      const { cls, Icon } = STATUS_STYLE[t.status];
                      return (
                        <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                          <div>
                            <div className="font-semibold text-slate-900">{inr(t.amount)}</div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {t.requestNo} · UTR {t.utrNumber} · {fmtDate(t.requestedAt)}
                            </div>
                            {t.status === "Rejected" && (
                              <div className="mt-1.5 text-xs text-red-600">
                                {t.rejectionReason ? `Reason: ${t.rejectionReason}` : "Rejected by the company. No amount was credited."}
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}>
                            <Icon size={13} /> {t.status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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