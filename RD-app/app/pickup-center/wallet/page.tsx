"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet as WalletIcon, TrendingUp, ArrowDownToLine, ArrowDownLeft, ArrowUpRight, Undo2 } from "lucide-react";
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

type Wallet = { balance: number; totalEarned: number; totalWithdrawn: number };
type Tx = {
  id: number;
  type: "Credit" | "Debit";
  amount: number;
  balanceAfter: number;
  source: string;
  description?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState("");

  useEffect(() => {
    api<{ fullName: string }>("/profile")
      .then((p) => setOperatorName(p.fullName))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([api<Wallet>("/wallet"), api<Tx[]>("/wallet/transactions")])
      .then(([w, t]) => {
        setWallet(w);
        setTxs(t);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Available Balance", value: wallet?.balance ?? 0, Icon: WalletIcon, color: "text-blue-700" },
    { label: "Total Earned", value: wallet?.totalEarned ?? 0, Icon: TrendingUp, color: "text-emerald-600" },
    { label: "Total Withdrawn", value: wallet?.totalWithdrawn ?? 0, Icon: ArrowDownToLine, color: "text-slate-700" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PickupCenterSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PickupCenterTopbar title="Wallet" operatorName={operatorName} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Icon size={15} /> {label}
            </div>
            <div className={`mt-3 text-2xl font-bold ${color}`}>{loading ? "…" : inr(value)}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <WalletIcon size={18} className="text-blue-600" /> Transaction History
          </h2>
          <Link
            href="/pickup-center/return"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Undo2 size={14} /> Return stock
          </Link>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
        ) : txs.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No transactions yet. Money is added here when the company approves a stock return.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
        )}
      </section>
          </div>
        </main>
      </div>
    </div>
  );
}