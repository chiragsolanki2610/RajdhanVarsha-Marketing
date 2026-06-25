'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  History,
  Info,
  ArrowLeft,
  ChevronRight,
  ArrowDownLeft,
  TrendingUp,
  Loader2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar';

// ==========================================
// INTEGRATED WALLET API CONFIG & UTILITIES
// ==========================================

// UPDATED: Corrected port to 56187 as shown in your Swagger UI
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rd-api-j7zj.onrender.com';

export const PLAN_TYPES = {
  DREAM: 'Dream Plan',
  BINARY: 'Binary Plan',
} as const;

export type PlanKey = keyof typeof PLAN_TYPES;

// Types matching the backend DTOs
export type WalletDto = {
  planType: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  minWithdrawalAmount: number;
};

export type WalletTransactionDto = {
  id: number;
  planType: string;
  type: 'Credit' | 'Debit';
  amount: number;
  balanceAfter: number;
  source: string;
  description: string | null;
  createdAt: string;
};

export type WithdrawalRequestDto = {
  id: number;
  userId: string;
  userName: string;
  planType: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  processedAt: string | null;
  adminRemarks: string | null;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken') || localStorage.getItem('token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Integrated API Functions matching your Swagger Endpoints
function getWallets(): Promise<WalletDto[]> {
  return apiFetch<WalletDto[]>('/api/wallet');
}

function getTransactionHistory(planType?: string): Promise<WalletTransactionDto[]> {
  const query = planType ? `?planType=${encodeURIComponent(planType)}` : '';
  return apiFetch<WalletTransactionDto[]>(`/api/wallet/transactions${query}`);
}

// Swagger lists this as POST /api/wallet/withdraw
function requestWithdrawal(planType: string, amount: number): Promise<WithdrawalRequestDto> {
  return apiFetch<WithdrawalRequestDto>('/api/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify({ planType, amount }),
  });
}

// ==========================================
// COMPONENT METADATA & HELPER FUNCTIONS
// ==========================================

const WALLET_META: Record<
  PlanKey,
  { title: string; description: string; accent: string; iconBg: string; iconColor: string }
> = {
  DREAM: {
    title: 'Dream Wallet',
    description: 'Primary wallet for direct product commissions and referral sales points.',
    accent: 'bg-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  BINARY: {
    title: 'Binary Wallet',
    description: 'Secondary node wallet tracking left/right team matching business volumes.',
    accent: 'bg-indigo-500',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
};

function emptyWallet(planType: string): WalletDto {
  return { planType, balance: 0, totalEarned: 0, totalWithdrawn: 0, minWithdrawalAmount: 250 };
}

// Simple Indian Rupee formatter (using text standard format)
function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================

export default function WalletPage() {
  const [selectedWallet, setSelectedWallet] = useState<PlanKey | null>(null);
  const [activePanel, setActivePanel] = useState<'accounts' | 'withdrawal' | 'history'>('accounts');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [wallets, setWallets] = useState<Record<PlanKey, WalletDto>>({
    DREAM: emptyWallet(PLAN_TYPES.DREAM),
    BINARY: emptyWallet(PLAN_TYPES.BINARY),
  });
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [walletsError, setWalletsError] = useState<string | null>(null);

  const [history, setHistory] = useState<WalletTransactionDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // ── KYC Guard ────────────────────────────────────────────────────────────
  const router = useRouter();
  const [kycStatus, setKycStatus]     = useState<'LOADING' | 'VERIFIED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED'>('LOADING');

  useEffect(() => {
    const checkKyc = async () => {
      try {
        const token = getToken();
        if (!token) { setKycStatus('NOT_SUBMITTED'); return; }
        const res = await fetch(`${API_BASE_URL}/api/Auth/profile`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) { setKycStatus('NOT_SUBMITTED'); return; }
        const data = await res.json();
        const raw: string = (data?.kycStatus ?? data?.KycStatus ?? '').toString().toUpperCase().trim();
        if (raw === 'VERIFIED' || data?.isKycCompleted === true) setKycStatus('VERIFIED');
        else if (raw === 'PENDING') setKycStatus('PENDING');
        else if (raw === 'REJECTED') setKycStatus('REJECTED');
        else setKycStatus('NOT_SUBMITTED');
      } catch {
        setKycStatus('NOT_SUBMITTED');
      }
    };
    checkKyc();
  }, []);

  const loadWallets = useCallback(async () => {
    setLoadingWallets(true);
    setWalletsError(null);
    try {
      const data = await getWallets();
      setWallets((prev) => {
        const next = { ...prev };
        (Object.keys(PLAN_TYPES) as PlanKey[]).forEach((key) => {
          const match = data.find((w) => w.planType === PLAN_TYPES[key]);
          next[key] = match ?? emptyWallet(PLAN_TYPES[key]);
        });
        return next;
      });
    } catch (err) {
      setWalletsError(err instanceof Error ? err.message : 'Could not load wallet balances.');
    } finally {
      setLoadingWallets(false);
    }
  }, []);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const loadHistory = useCallback(async (key: PlanKey) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getTransactionHistory(PLAN_TYPES[key]);
      setHistory(data);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Could not load transaction history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWallet && activePanel === 'history') {
      loadHistory(selectedWallet);
    }
  }, [selectedWallet, activePanel, loadHistory]);

  const currentWallet = selectedWallet ? wallets[selectedWallet] : null;
  const currentMeta = selectedWallet ? WALLET_META[selectedWallet] : null;

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !currentWallet) return;

    const amount = parseFloat(withdrawAmount);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    if (!withdrawAmount || isNaN(amount) || amount <= 0) {
      setWithdrawError('Enter a valid amount.');
      return;
    }
    if (amount < currentWallet.minWithdrawalAmount) {
      setWithdrawError(`Minimum withdrawal is ${formatINR(currentWallet.minWithdrawalAmount)}.`);
      return;
    }
    if (amount > currentWallet.balance) {
      setWithdrawError('Amount is more than your available balance.');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      await requestWithdrawal(currentWallet.planType, amount);
      setWithdrawSuccess(`Withdrawal request of ${formatINR(amount)} sent for admin approval.`);
      setWithdrawAmount('');
      await loadWallets();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Could not submit withdrawal request.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <LoginTopbar />

        <div className="p-6 text-[#1e293b] font-sans max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#0f172a]">My Wallets</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your dream funds and binary matching commissions.</p>
            </div>

            {selectedWallet && (
              <button
                onClick={() => {
                  setSelectedWallet(null);
                  setWithdrawError(null);
                  setWithdrawSuccess(null);
                }}
                className="flex items-center gap-2 text-sm font-medium text-[#3b82f6] bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Switch Wallet
              </button>
            )}
          </div>

          {walletsError && (
            <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {walletsError}
              <button onClick={loadWallets} className="ml-auto underline font-semibold">
                Retry
              </button>
            </div>
          )}

          {/* STEP 1: Wallet selection */}
          {!selectedWallet && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(Object.keys(PLAN_TYPES) as PlanKey[]).map((key) => {
                const meta = WALLET_META[key];
                const wallet = wallets[key];
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedWallet(key);
                      setActivePanel('accounts');
                    }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden flex flex-col"
                  >
                    <div className={`h-1.5 ${meta.accent}`} />
                    <div className="p-6 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <div className={`w-12 h-12 rounded-xl ${meta.iconBg} flex items-center justify-center ${meta.iconColor}`}>
                            <WalletIcon className="w-6 h-6" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mt-4">{meta.title}</h2>
                        <p className="text-sm text-gray-400 mt-1">{meta.description}</p>
                      </div>
                      <div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-baseline">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                          Available Balance
                        </span>
                        <span className="text-2xl font-bold text-gray-900">
                          {loadingWallets ? '…' : formatINR(wallet.balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 2: Wallet dashboard */}
          {selectedWallet && currentWallet && currentMeta && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard
                  label="Total Balance"
                  value={formatINR(currentWallet.balance)}
                  accent="bg-blue-500"
                  iconBg="bg-blue-50"
                  iconColor="text-blue-500"
                  icon={<WalletIcon className="w-5 h-5" />}
                />
                <StatCard
                  label="Total Earning"
                  value={formatINR(currentWallet.totalEarned)}
                  accent="bg-orange-500"
                  iconBg="bg-orange-50"
                  iconColor="text-orange-500"
                  icon={<TrendingUp className="w-5 h-5" />}
                />
                <StatCard
                  label="Total Withdrawal"
                  value={formatINR(currentWallet.totalWithdrawn)}
                  accent="bg-red-500"
                  iconBg="bg-red-50"
                  iconColor="text-red-500"
                  icon={<ArrowUpRight className="w-5 h-5" />}
                />
              </div>

              {/* Panel */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
                  <TabButton
                    active={activePanel === 'accounts'}
                    onClick={() => setActivePanel('accounts')}
                    icon={<Info className="w-4 h-4" />}
                    label="Wallet Info"
                  />
                  <TabButton
                    active={activePanel === 'withdrawal'}
                    onClick={() => setActivePanel('withdrawal')}
                    icon={<ArrowUpRight className="w-4 h-4" />}
                    label="Withdrawal System"
                    locked={kycStatus !== 'LOADING' && kycStatus !== 'VERIFIED'}
                  />
                  <TabButton
                    active={activePanel === 'history'}
                    onClick={() => setActivePanel('history')}
                    icon={<History className="w-4 h-4" />}
                    label="Transaction History"
                  />
                </div>

                <div className="p-6">
                  {/* Wallet Info */}
                  {activePanel === 'accounts' && (
                    <div className="space-y-4 max-w-2xl">
                      <h4 className="text-base font-bold text-gray-800">{currentMeta.title} Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoBox label="Plan Type" value={currentWallet.planType} />
                        <InfoBox label="Minimum Withdrawal" value={formatINR(currentWallet.minWithdrawalAmount)} />
                        <InfoBox label="Lifetime Earned" value={formatINR(currentWallet.totalEarned)} />
                        <InfoBox label="Lifetime Withdrawn" value={formatINR(currentWallet.totalWithdrawn)} />
                      </div>
                    </div>
                  )}

                  {/* Withdrawal */}
                  {activePanel === 'withdrawal' && (
                    <div className="max-w-md">
                      {/* ── KYC Loading ── */}
                      {kycStatus === 'LOADING' && (
                        <div className="flex items-center gap-2 text-gray-400 py-6">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Checking KYC status…</span>
                        </div>
                      )}

                      {/* ── KYC NOT verified — block withdrawal ── */}
                      {kycStatus !== 'LOADING' && kycStatus !== 'VERIFIED' && (
                        <div className="flex flex-col items-center text-center gap-5 py-6">
                          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-amber-500" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-800">KYC Verification Required</h4>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                              {kycStatus === 'PENDING'
                                ? 'Your KYC is under review. Withdrawals will be unlocked once an admin verifies your documents.'
                                : kycStatus === 'REJECTED'
                                ? 'Your KYC was rejected. Please resubmit your documents to unlock withdrawals.'
                                : 'You must complete KYC verification before you can request a withdrawal.'}
                            </p>
                          </div>
                          {kycStatus !== 'PENDING' && (
                            <button
                              onClick={() => router.push('/dashboard/kyc')}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm"
                            >
                              {kycStatus === 'REJECTED' ? 'Resubmit KYC Documents' : 'Complete KYC Now'}
                            </button>
                          )}
                          <p className="text-xs text-gray-400">
                            {kycStatus === 'PENDING'
                              ? "We'll notify you once your KYC is approved."
                              : "KYC is a one-time process to verify your identity and bank account."}
                          </p>
                        </div>
                      )}

                      {/* ── KYC VERIFIED — show withdrawal form ── */}
                      {kycStatus === 'VERIFIED' && (
                        <>
                          <div className="flex items-center gap-2 mb-4 bg-green-50 border border-green-100 rounded-xl px-4 py-2">
                            <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                            <span className="text-xs font-semibold text-green-700">KYC Verified — Withdrawals Unlocked</span>
                          </div>
                          <h4 className="text-base font-bold text-gray-800 mb-1">Request Fund Settlement</h4>
                          <p className="text-xs text-gray-400 mb-4">
                            Minimum withdrawal: {formatINR(currentWallet.minWithdrawalAmount)}. Requests are reviewed by
                            an admin before payout.
                          </p>
                          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                Enter Amount (₹)
                              </label>
                              <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="₹0.00"
                                min={currentWallet.minWithdrawalAmount}
                                step="0.01"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                required
                              />
                            </div>

                            {withdrawError && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> {withdrawError}
                              </p>
                            )}
                            {withdrawSuccess && <p className="text-sm text-green-600">{withdrawSuccess}</p>}

                            <button
                              type="submit"
                              disabled={withdrawSubmitting}
                              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                              {withdrawSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                              {withdrawSubmitting ? 'Submitting…' : 'Submit Payout Request'}
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  )}

                  {/* History */}
                  {activePanel === 'history' && (
                    <div>
                      <h4 className="text-base font-bold text-gray-800 mb-4">Statement Log</h4>

                      {historyLoading && (
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading transactions…
                        </p>
                      )}

                      {historyError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {historyError}
                          <button
                            onClick={() => selectedWallet && loadHistory(selectedWallet)}
                            className="ml-auto underline font-semibold"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {!historyLoading && !historyError && history.length === 0 && (
                        <p className="text-sm text-gray-400">No transactions yet for this wallet.</p>
                      )}

                      {!historyLoading && !historyError && history.length > 0 && (
                        <div className="space-y-3">
                          {history.map((tx) => {
                            const { date, time } = formatDateTime(tx.createdAt);
                            const isCredit = tx.type === 'Credit';
                            return (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                      isCredit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                    }`}
                                  >
                                    {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">{tx.description || tx.source}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {date} • {time}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-sm font-bold ${isCredit ? 'text-[#22c55e]' : 'text-gray-700'}`}>
                                  {isCredit ? '+' : '-'} {formatINR(tx.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponents at the bottom
function StatCard({
  label,
  value,
  accent,
  iconBg,
  iconColor,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`h-1.5 ${accent}`} />
      <div className="p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">{label}</p>
          <h3 className="text-2xl font-black text-gray-900 mt-2">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  locked = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
          : locked
          ? 'text-amber-400 hover:text-amber-500'
          : 'text-gray-500 hover:text-gray-900'
      }`}
      title={locked ? 'Complete KYC to unlock withdrawals' : undefined}
    >
      {icon}
      {label}
      {locked && <span className="text-[10px] ml-0.5">🔒</span>}
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-xs text-gray-400 font-medium block mb-1">{label}</span>
      <span className="text-sm font-bold text-gray-700">{value}</span>
    </div>
  );
}
