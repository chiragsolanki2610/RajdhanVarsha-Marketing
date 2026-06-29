'use client';

import React, { useState } from 'react';
import {
  Search, User, Phone, MapPin, Lock, ShieldCheck, ShieldX,
  CreditCard, Landmark, TreePine, TrendingUp, Wallet,
  ArrowDownCircle, ArrowUpCircle, ClipboardList, RefreshCw,
  AlertCircle, ChevronDown, ChevronUp, BadgeCheck, X, Eye
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/loginTopbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:56188';

// ── Types ────────────────────────────────────────────────────────────────────

interface KycSummary {
  id: number; fullName: string; mobileNo: string; age: number; dob: string;
  address: string; aadharNo: string; panNo: string; status: string;
  submittedAt: string; reviewedAt?: string; rejectionReason?: string;
  aadharFrontImageUrl: string; aadharBackImageUrl: string;
  panCardImageUrl: string; bankProofImageUrl: string;
}
interface BankingInfo {
  bankName?: string; accountNo?: string; ifscCode?: string; accountType?: string;
}
interface WalletSummary {
  planType: string; balance: number; totalEarned: number;
  totalWithdrawn: number; updatedAt: string;
}
interface PlanSummary {
  id: number; planType: string; totalBv: number;
  totalAmount: number; status: string; createdAt: string;
}
interface WithdrawalSummary {
  id: number; planType: string; amount: number; status: string;
  requestedAt: string; processedAt?: string; adminRemarks?: string;
}
interface TransactionSummary {
  id: number; planType: string; type: string; amount: number;
  balanceAfter: number; source: string; description?: string; createdAt: string;
}
interface UserFullInfo {
  userId: string; name: string; mobileNo: string; aadharNo: string;
  address: string; password: string; role: string; createdAt: string;
  isActive: boolean; idStatus: string; isKycCompleted: boolean; selectedPlan: string;
  sponsorId?: string; sponsorName: string; parentId?: string;
  position?: string; treeLevel: number; totalBV: number;
  kyc?: KycSummary; banking?: BankingInfo;
  wallets: WalletSummary[]; plans: PlanSummary[];
  withdrawals: WithdrawalSummary[]; recentTransactions: TransactionSummary[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StatusPill({ value }: { value: string }) {
  const v = value?.toLowerCase();
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    credit: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    rejected: 'bg-rose-50 text-rose-700 border-rose-100',
    failed: 'bg-rose-50 text-rose-700 border-rose-100',
    debit: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  const cls = map[v] ?? 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {value}
    </span>
  );
}

function SectionCard({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/60 hover:bg-slate-50 transition border-b border-slate-100"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
          {icon}{title}
        </span>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function Row({ label, value, mono = false, highlight = false }: {
  label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-36">{label}</span>
      <span className={`text-xs text-right break-all ${mono ? 'font-mono' : 'font-medium'} ${highlight ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SearchUserInfoPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserFullInfo | null>(null);
  const [previewImg, setPreviewImg] = useState<{ url: string; title: string } | null>(null);

  const handleSearch = async () => {
    const uid = query.trim().toUpperCase();
    if (!uid) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/Admin/search-user/${uid}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (res.status === 404) throw new Error(`No user found with ID "${uid}".`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar pageTitle="User Search" />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Search className="text-indigo-600" size={22} />
                User Information Lookup
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Enter a User ID (e.g. RD0001) to retrieve full account details
              </p>
            </div>
            {data && (
              <button
                onClick={() => { setData(null); setQuery(''); setError(null); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
              >
                <RefreshCw size={13} /> Clear
              </button>
            )}
          </div>

          {/* ── Search Box ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter User ID — e.g. RD0001"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition font-medium"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-md shadow-indigo-600/10 disabled:shadow-none"
              >
                {loading
                  ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Searching</>
                  : <><Search size={13} /> Search</>}
              </button>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-xs text-rose-800 font-semibold">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              {error}
            </div>
          )}

          {/* ── Empty State ── */}
          {!loading && !data && !error && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
              <User size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-medium">Enter a User ID above to load their complete profile</p>
            </div>
          )}

          {/* ── Results ── */}
          {data && (
            <div className="space-y-5">

              {/* Hero identity card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg shadow-indigo-600/20">
                    {data.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Core info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-lg font-black text-slate-800">{data.name}</h2>
                      <StatusPill value={data.idStatus} />
                      {data.isKycCompleted
                        ? <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><BadgeCheck size={11} /> KYC Done</span>
                        : <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100"><ShieldX size={11} /> KYC Pending</span>}
                    </div>
                    <p className="text-[11px] font-mono font-bold text-indigo-500 tracking-widest uppercase">{data.userId}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">Joined {fmtDate(data.createdAt)} · {data.role} · Plan: {data.selectedPlan || 'None'}</p>
                  </div>
                  {/* BV badge */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 text-center shrink-0">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Total BV</p>
                    <p className="text-2xl font-black text-indigo-700">{data.totalBV.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* ── Grid of sections ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Identity */}
                <SectionCard title="Identity & Contact" icon={<User size={13} />}>
                  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-0.5">
                    <Row label="User ID" value={data.userId} mono highlight />
                    <Row label="Full Name" value={data.name} />
                    <Row label="Mobile" value={data.mobileNo} mono />
                    <Row label="Aadhaar" value={data.aadharNo} mono />
                    <Row label="Address" value={data.address} />
                  </div>
                </SectionCard>

                {/* Credentials */}
                <SectionCard title="Credentials & Security" icon={<Lock size={13} />}>
                  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-0.5">
                    <Row label="Password" value={
                      <span className="font-mono tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                        {data.password}
                      </span>
                    } />
                    <Row label="Role" value={data.role} />
                    <Row label="ID Status" value={<StatusPill value={data.idStatus} />} />
                    <Row label="Account Active" value={<StatusPill value={data.isActive ? 'Active' : 'Inactive'} />} />
                    <Row label="KYC Status" value={<StatusPill value={data.isKycCompleted ? 'Completed' : 'Pending'} />} />
                    <Row label="Selected Plan" value={data.selectedPlan || '—'} />
                    <Row label="Member Since" value={fmtDate(data.createdAt)} />
                  </div>
                </SectionCard>

                {/* Network / Tree */}
                <SectionCard title="Network & Tree Position" icon={<TreePine size={13} />}>
                  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-0.5">
                    <Row label="Sponsor ID" value={data.sponsorId || '—'} mono />
                    <Row label="Sponsor Name" value={data.sponsorName || '—'} />
                    <Row label="Parent Node" value={data.parentId || '—'} mono />
                    <Row label="Position" value={data.position || '—'} />
                    <Row label="Tree Level" value={data.treeLevel} />
                  </div>
                </SectionCard>

                {/* Wallet Summary */}
                <SectionCard title="Wallet Summary" icon={<Wallet size={13} />}>
                  {data.wallets.length === 0
                    ? <p className="text-xs text-slate-400 font-medium text-center py-4">No wallets found</p>
                    : <div className="space-y-3">
                        {data.wallets.map(w => (
                          <div key={w.planType} className="bg-slate-50/70 rounded-xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">{w.planType}</span>
                              <span className="text-[10px] text-slate-400">Updated {fmtDate(w.updatedAt)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              {[
                                { label: 'Balance', val: fmt(w.balance), color: 'text-indigo-700' },
                                { label: 'Earned', val: fmt(w.totalEarned), color: 'text-emerald-700' },
                                { label: 'Withdrawn', val: fmt(w.totalWithdrawn), color: 'text-rose-700' },
                              ].map(item => (
                                <div key={item.label} className="bg-white rounded-lg p-2.5 border border-slate-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                                  <p className={`text-xs font-black ${item.color}`}>{item.val}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </SectionCard>
              </div>

              {/* Banking */}
              {data.banking && (
                <SectionCard title="Banking Details" icon={<Landmark size={13} />}>
                  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                    <Row label="Bank Name" value={data.banking.bankName} />
                    <Row label="Account No" value={data.banking.accountNo} mono />
                    <Row label="IFSC Code" value={data.banking.ifscCode} mono />
                    <Row label="Account Type" value={data.banking.accountType} />
                  </div>
                </SectionCard>
              )}

              {/* KYC Details */}
              {data.kyc && (
                <SectionCard title="KYC Submission Details" icon={<ShieldCheck size={13} />} defaultOpen={false}>
                  <div className="space-y-4">
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                      <Row label="Full Name" value={data.kyc.fullName} />
                      <Row label="Mobile" value={data.kyc.mobileNo} mono />
                      <Row label="Age / DOB" value={`${data.kyc.age} yrs (${data.kyc.dob})`} />
                      <Row label="Aadhaar" value={data.kyc.aadharNo} mono />
                      <Row label="PAN" value={data.kyc.panNo} mono />
                      <Row label="KYC Status" value={<StatusPill value={data.kyc.status} />} />
                      <Row label="Submitted" value={fmtDate(data.kyc.submittedAt)} />
                      {data.kyc.reviewedAt && <Row label="Reviewed" value={fmtDate(data.kyc.reviewedAt)} />}
                      {data.kyc.rejectionReason && <Row label="Rejection Reason" value={data.kyc.rejectionReason} />}
                    </div>
                    <Row label="Address" value={data.kyc.address} />
                    {/* Document images */}
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">KYC Documents</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: 'Aadhaar Front', url: data.kyc.aadharFrontImageUrl },
                          { label: 'Aadhaar Back', url: data.kyc.aadharBackImageUrl },
                          { label: 'PAN Card', url: data.kyc.panCardImageUrl },
                          { label: 'Bank Proof', url: data.kyc.bankProofImageUrl },
                        ].map(doc => (
                          <button
                            key={doc.label}
                            onClick={() => doc.url && setPreviewImg({ url: doc.url, title: doc.label })}
                            disabled={!doc.url}
                            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-[10px] font-bold text-slate-600 transition uppercase tracking-wider"
                          >
                            <Eye size={11} />{doc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Plans */}
              {data.plans.length > 0 && (
                <SectionCard title="Plans Purchased" icon={<TrendingUp size={13} />} defaultOpen={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-3 pl-4">Plan</th>
                          <th className="p-3">Total BV</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.plans.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 pl-4 font-bold text-slate-700">{p.planType}</td>
                            <td className="p-3 font-mono text-indigo-600 font-semibold">{p.totalBv.toLocaleString('en-IN')}</td>
                            <td className="p-3 font-mono text-slate-700 font-semibold">{fmt(p.totalAmount)}</td>
                            <td className="p-3"><StatusPill value={p.status} /></td>
                            <td className="p-3 text-right text-slate-400">{fmtDate(p.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}

              {/* Withdrawals */}
              {data.withdrawals.length > 0 && (
                <SectionCard title="Withdrawal History" icon={<ArrowUpCircle size={13} />} defaultOpen={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-3 pl-4">Plan</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Requested</th>
                          <th className="p-3 text-right">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.withdrawals.map(w => (
                          <tr key={w.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 pl-4 font-semibold text-slate-700">{w.planType}</td>
                            <td className="p-3 font-mono font-bold text-slate-800">{fmt(w.amount)}</td>
                            <td className="p-3"><StatusPill value={w.status} /></td>
                            <td className="p-3 text-slate-400">{fmtDate(w.requestedAt)}</td>
                            <td className="p-3 text-right text-slate-400">{w.adminRemarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}

              {/* Recent Transactions */}
              {data.recentTransactions.length > 0 && (
                <SectionCard title="Recent Transactions (Last 20)" icon={<ClipboardList size={13} />} defaultOpen={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-3 pl-4">Type</th>
                          <th className="p-3">Plan</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Balance After</th>
                          <th className="p-3">Source</th>
                          <th className="p-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.recentTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 pl-4">
                              <span className="flex items-center gap-1.5">
                                {t.type === 'Credit'
                                  ? <ArrowDownCircle size={13} className="text-emerald-500" />
                                  : <ArrowUpCircle size={13} className="text-rose-500" />}
                                <StatusPill value={t.type} />
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 font-medium">{t.planType}</td>
                            <td className={`p-3 font-mono font-bold ${t.type === 'Credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {t.type === 'Credit' ? '+' : '-'}{fmt(t.amount)}
                            </td>
                            <td className="p-3 font-mono text-slate-600">{fmt(t.balanceAfter)}</td>
                            <td className="p-3 text-slate-500">{t.source}{t.description ? ` — ${t.description}` : ''}</td>
                            <td className="p-3 text-right text-slate-400">{fmtDate(t.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}

            </div>
          )}
        </main>
      </div>

      {/* ── Image Preview Lightbox ── */}
      {previewImg && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{previewImg.title}</h4>
              <button onClick={() => setPreviewImg(null)} className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition">
                <X size={16} />
              </button>
            </div>
            <div className="bg-slate-950 p-6 flex justify-center items-center max-h-[65vh] overflow-auto">
              <img
                src={previewImg.url}
                alt={previewImg.title}
                className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-md"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                  const p = e.currentTarget.parentElement;
                  if (p) p.innerHTML = '<p class="text-slate-400 text-xs text-center py-10">Image failed to load or URL is invalid.</p>';
                }}
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setPreviewImg(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}