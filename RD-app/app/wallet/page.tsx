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
  CheckCircle2,
  Circle,
  Lock,
  Receipt,
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar';

// ==========================================
// INTEGRATED WALLET API CONFIG & UTILITIES
// ==========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rd-api-j7zj.onrender.com';

// Tax rates used for the client-side live estimate shown while typing.
// The authoritative numbers always come back from the API response after
// submit (ServiceTaxAmount / TdsAmount / NetPayableAmount) — these constants
// are only for the instant on-screen preview so the user isn't surprised.
const SERVICE_TAX_RATE = 0.05; // 5%
const TDS_RATE = 0.05; // 5%

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

// Matches the tax breakdown fields on WithdrawalRequest / BinaryWithdrawalRequest
export type WithdrawalRequestDto = {
  id: number;
  userId: string;
  userName: string;
  planType: string;
  amount: number;
  serviceTaxAmount: number;
  tdsAmount: number;
  netPayableAmount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  processedAt: string | null;
  adminRemarks: string | null;
};

// matches BinaryNodeStatusDto from GET /api/binary/status
export type BinaryStatusDto = {
  isInBinaryPlan: boolean;
  isActive: boolean;
  position: string;
  parentId: string | null;
  leftChildId: string | null;
  rightChildId: string | null;
  treeLevel: number;
  leftLegCount: number;
  rightLegCount: number;
  totalDownlineCount: number;
  withdrawalUnlocked: boolean;
  pairsCompleted: number;
  walletBalance: number;
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

// ── UPDATED: routed per plan ────────────────────────────────────────────
// Dream Plan transactions live in `WalletTransactions` and are served by
// GET /api/wallet/transactions?planType=...
// Binary Plan transactions live in a SEPARATE table (`BinaryWalletTransactions`)
// and must be served by its own endpoint — GET /api/binary/transactions.
// Previously both plans hit the Dream endpoint, which is why Binary history
// was always empty/wrong. If your backend route names differ, update the
// two paths below to match.
function getTransactionHistory(planKey: PlanKey): Promise<WalletTransactionDto[]> {
  if (planKey === 'BINARY') {
    return apiFetch<WalletTransactionDto[]>('/api/binary/transactions');
  }
  return apiFetch<WalletTransactionDto[]>(
    `/api/wallet/transactions?planType=${encodeURIComponent(PLAN_TYPES.DREAM)}`
  );
}

// Swagger lists this as POST /api/wallet/withdraw (used for Dream Plan only — see requestBinaryWithdrawal below)
function requestWithdrawal(planType: string, amount: number): Promise<WithdrawalRequestDto> {
  return apiFetch<WithdrawalRequestDto>('/api/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify({ planType, amount }),
  });
}

// binary-tree eligibility status (left child + right child + grandchild rule)
function getBinaryStatus(): Promise<BinaryStatusDto> {
  return apiFetch<BinaryStatusDto>('/api/binary/status');
}

// Binary Plan withdrawals go through the binary controller, which enforces
// the 3-node unlock rule server-side (the generic /api/wallet/withdraw has no
// idea this rule exists, so Binary Plan must use this endpoint instead).
function requestBinaryWithdrawal(amount: number): Promise<WithdrawalRequestDto> {
  return apiFetch<WithdrawalRequestDto>('/api/binary/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

// ==========================================
// COMPONENT METADATA & HELPER FUNCTIONS
// ==========================================

const WALLET_META: Record
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

// computes the live client-side tax preview shown under the amount
// input. Purely informational — the server recalculates and returns the
// authoritative figures in the API response.
function estimateTaxBreakdown(amount: number) {
  const serviceTax = Math.round(amount * SERVICE_TAX_RATE * 100) / 100;
  const tds = Math.round(amount * TDS_RATE * 100) / 100;
  const net = Math.round((amount - serviceTax - tds) * 100) / 100;
  return { serviceTax, tds, net };
}

// ── NEW: withdrawal-only filter ─────────────────────────────────────────
// History tab should show ONLY withdrawal activity (Requested / Approved /
// Rejected), not commission/BV credit entries. We filter on `source` since
// that's what your backend writes ("Withdrawal Requested", "Withdrawal
// Rejected", etc.). Adjust the match string if your backend uses different
// wording, or better: filter server-side once you add a dedicated endpoint.
function isWithdrawalTransaction(tx: WalletTransactionDto) {
  return tx.source?.toLowerCase().includes('withdraw');
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

  // holds the authoritative tax breakdown returned by the API after a
  // successful withdrawal submission, so we can show it in the success card.
  const [lastWithdrawal, setLastWithdrawal] = useState<WithdrawalRequestDto | null>(null);

  // Binary Plan team-eligibility state (left child + right child + grandchild)
  const [binaryStatus, setBinaryStatus] = useState<BinaryStatusDto | null>(null);
  const [binaryStatusLoading, setBinaryStatusLoading] = useState(false);
  const [binaryStatusError, setBinaryStatusError] = useState<string | null>(null);

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

  // only relevant for the Binary Plan wallet — fetches left/right child +
  // grandchild eligibility so we can lock/unlock the withdrawal form correctly.
  const loadBinaryStatus = useCallback(async () => {
    setBinaryStatusLoading(true);
    setBinaryStatusError(null);
    try {
      const data = await getBinaryStatus();
      setBinaryStatus(data);
    } catch (err) {
      setBinaryStatus(null);
      setBinaryStatusError(err instanceof Error ? err.message : 'Could not load team status.');
    } finally {
      setBinaryStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWallet === 'BINARY') {
      loadBinaryStatus();
    }
  }, [selectedWallet, loadBinaryStatus]);

  // ── UPDATED: loads history from the correct table per plan, then filters
  // down to withdrawal-only entries so commission/BV credits don't show up
  // in what's meant to be a withdrawal statement log.
  const loadHistory = useCallback(async (key: PlanKey) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getTransactionHistory(key);
      setHistory(data.filter(isWithdrawalTransaction));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Could not load withdrawal history.');
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

  // For Binary Plan, withdrawal is additionally gated by the 3-node tree rule.
  const isBinary = selectedWallet === 'BINARY';
  const binaryUnlocked = !isBinary || !!binaryStatus?.withdrawalUnlocked;

  // live tax preview recalculated on every keystroke, shown under the
  // amount field so the user knows roughly what they'll net before submitting.
  const parsedAmount = parseFloat(withdrawAmount);
  const showTaxPreview = withdrawAmount !== '' && !isNaN(parsedAmount) && parsedAmount > 0;
  const taxPreview = showTaxPreview ? estimateTaxBreakdown(parsedAmount) : null;

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !currentWallet) return;

    const amount = parseFloat(withdrawAmount);
    setWithdrawError(null);
    setWithdrawSuccess(null);
    setLastWithdrawal(null);

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
    if (isBinary && !binaryUnlocked) {
      setWithdrawError(
        'Withdrawal is locked. You need an active LEFT child, an active RIGHT child, and at least 1 active grandchild first.'
      );
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const result = isBinary
        ? await requestBinaryWithdrawal(amount)
        : await requestWithdrawal(currentWallet.planType, amount);

      setLastWithdrawal(result);
      setWithdrawSuccess(
        `Withdrawal request of ${formatINR(result.amount)} sent for admin approval. You'll receive ${formatINR(
          result.netPayableAmount
        )} after tax deductions.`
      );
      setWithdrawAmount('');
      await loadWallets();
      if (isBinary) await loadBinaryStatus();
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
        <LoginTopbar pageTitle='My Wallets'/>

        <div className="p-3 sm:p-6 text-[#1e293b] font-sans max-w-7xl w-full mx-auto pb-24 sm:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            {selectedWallet && (
              <button
                onClick={() => {
                  setSelectedWallet(null);
                  setWithdrawError(null);
                  setWithdrawSuccess(null);
                  setLastWithdrawal(null);
                  setBinaryStatus(null);
                }}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-[#3b82f6] bg-white border border-gray-200 px-3 py-2 sm:px-4 sm:py-2 rounded-xl shadow-sm hover:bg-gray-50 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Switch Wallet
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {(Object.keys(PLAN_TYPES) as PlanKey[]).map((key) => {
                const meta = WALLET_META[key];
                const wallet = wallets[key];
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedWallet(key);
                      setActivePanel('accounts');
                      setBinaryStatus(null);
                    }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden flex flex-col active:scale-[0.99]"
                  >
                    <div className={`h-1.5 ${meta.accent}`} />
                    <div className="p-4 sm:p-6 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${meta.iconBg} flex items-center justify-center ${meta.iconColor}`}>
                            <WalletIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mt-3 sm:mt-4">{meta.title}</h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">{meta.description}</p>
                      </div>
                      <div className="mt-6 sm:mt-8 pt-4 border-t border-gray-50 flex justify-between items-baseline">
                        <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold">
                          Available Balance
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-gray-900">
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
            <div className="space-y-4 sm:space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
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
                <div className="grid grid-cols-3 sm:flex border-b border-gray-100 bg-gray-50/50 p-1.5 sm:p-2 gap-1.5 sm:gap-2">
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
                    label="Withdrawal"
                    locked={kycStatus !== 'LOADING' && kycStatus !== 'VERIFIED'}
                  />
                  <TabButton
                    active={activePanel === 'history'}
                    onClick={() => setActivePanel('history')}
                    icon={<History className="w-4 h-4" />}
                    label="History"
                  />
                </div>

                <div className="p-4 sm:p-6">
                  {/* Wallet Info */}
                  {activePanel === 'accounts' && (
                    <div className="space-y-4 max-w-2xl">
                      <h4 className="text-sm sm:text-base font-bold text-gray-800">{currentMeta.title} Details</h4>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <InfoBox label="Plan Type" value={currentWallet.planType} />
                        <InfoBox label="Minimum Withdrawal" value={formatINR(currentWallet.minWithdrawalAmount)} />
                        <InfoBox label="Lifetime Earned" value={formatINR(currentWallet.totalEarned)} />
                        <InfoBox label="Lifetime Withdrawn" value={formatINR(currentWallet.totalWithdrawn)} />
                      </div>

                      {/* Tax rate disclosure so users understand deductions up front */}
                      <div className="flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-xl px-3 sm:px-4 py-3">
                        <Receipt className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] sm:text-xs text-blue-700 leading-relaxed">
                          A 5% Service Tax and 5% TDS are deducted from every withdrawal request. The net amount
                          paid out will be shown before you confirm.
                        </p>
                      </div>

                      {/* Binary tree eligibility snapshot, visible even outside the withdrawal tab */}
                      {isBinary && (
                        <div className="pt-2">
                          <h5 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">Team Eligibility</h5>
                          {binaryStatusLoading && (
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Checking your binary team…
                            </p>
                          )}
                          {!binaryStatusLoading && binaryStatus && (
                            <div className="space-y-2">
                              <EligibilityRow done={!!binaryStatus.leftChildId} label="Left child joined" />
                              <EligibilityRow done={!!binaryStatus.rightChildId} label="Right child joined" />
                              <EligibilityRow
                                done={binaryStatus.withdrawalUnlocked}
                                label="At least 1 active grandchild (under left or right)"
                              />
                            </div>
                          )}
                          {!binaryStatusLoading && binaryStatusError && (
                            <p className="text-sm text-red-500">{binaryStatusError}</p>
                          )}
                        </div>
                      )}
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
                        <div className="flex flex-col items-center text-center gap-4 sm:gap-5 py-4 sm:py-6">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-50 flex items-center justify-center">
                            <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-gray-800">KYC Verification Required</h4>
                            <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
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
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm text-sm"
                            >
                              {kycStatus === 'REJECTED' ? 'Resubmit KYC Documents' : 'Complete KYC Now'}
                            </button>
                          )}
                          <p className="text-[11px] sm:text-xs text-gray-400">
                            {kycStatus === 'PENDING'
                              ? "We'll notify you once your KYC is approved."
                              : "KYC is a one-time process to verify your identity and bank account."}
                          </p>
                        </div>
                      )}

                      {/* ── KYC VERIFIED ── */}
                      {kycStatus === 'VERIFIED' && (
                        <>
                          <div className="flex items-center gap-2 mb-4 bg-green-50 border border-green-100 rounded-xl px-3 sm:px-4 py-2">
                            <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                            <span className="text-[11px] sm:text-xs font-semibold text-green-700">KYC Verified — Withdrawals Unlocked</span>
                          </div>

                          {/* Binary Plan team check — still loading */}
                          {isBinary && binaryStatusLoading && (
                            <div className="flex items-center gap-2 text-gray-400 py-6">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Checking your binary team eligibility…</span>
                            </div>
                          )}

                          {/* Binary Plan locked — team requirement not met */}
                          {isBinary && !binaryStatusLoading && !binaryUnlocked && (
                            <div className="flex flex-col items-center text-center gap-4 sm:gap-5 py-4 sm:py-6">
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-50 flex items-center justify-center">
                                <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
                              </div>
                              <div>
                                <h4 className="text-sm sm:text-base font-bold text-gray-800">Build Your Team to Unlock Withdrawals</h4>
                                <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                                  You need an active LEFT child, an active RIGHT child, and at least one active
                                  grandchild under either of them before your first Binary Wallet withdrawal.
                                </p>
                              </div>
                              <div className="w-full space-y-2 text-left">
                                <EligibilityRow done={!!binaryStatus?.leftChildId} label="Left child joined" />
                                <EligibilityRow done={!!binaryStatus?.rightChildId} label="Right child joined" />
                                <EligibilityRow
                                  done={!!binaryStatus?.withdrawalUnlocked}
                                  label="1 active grandchild under left/right"
                                />
                              </div>
                              {binaryStatusError && (
                                <p className="text-xs text-red-500">{binaryStatusError}</p>
                              )}
                            </div>
                          )}

                          {/* ── Withdrawal form (Dream Plan always; Binary Plan only once unlocked) ── */}
                          {!isBinary || (!binaryStatusLoading && binaryUnlocked) ? (
                            <>
                              <h4 className="text-sm sm:text-base font-bold text-gray-800 mb-1">Request Fund Settlement</h4>
                              <p className="text-[11px] sm:text-xs text-gray-400 mb-4">
                                Minimum withdrawal: {formatINR(currentWallet.minWithdrawalAmount)}. A 5% Service Tax
                                and 5% TDS are deducted before payout. Requests are reviewed by an admin.
                              </p>
                              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                                <div>
                                  <label className="block text-[11px] sm:text-xs font-bold text-gray-500 uppercase mb-2">
                                    Enter Amount (₹)
                                  </label>
                                  <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="₹0.00"
                                    min={currentWallet.minWithdrawalAmount}
                                    step="0.01"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium text-base focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    required
                                  />
                                </div>

                                {/* live tax breakdown preview, updates as the user types */}
                                {taxPreview && (
                                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-1.5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Receipt className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        Estimated Deduction
                                      </span>
                                    </div>
                                    <TaxRow label="Requested Amount" value={formatINR(parsedAmount)} />
                                    <TaxRow label="Service Tax (5%)" value={`- ${formatINR(taxPreview.serviceTax)}`} negative />
                                    <TaxRow label="TDS (5%)" value={`- ${formatINR(taxPreview.tds)}`} negative />
                                    <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                                      <TaxRow label="You will receive" value={formatINR(taxPreview.net)} bold />
                                    </div>
                                  </div>
                                )}

                                {withdrawError && (
                                  <p className="text-xs sm:text-sm text-red-600 flex items-start gap-1">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {withdrawError}
                                  </p>
                                )}
                                {withdrawSuccess && (
                                  <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 space-y-1.5">
                                    <p className="text-xs sm:text-sm text-green-700 font-medium">{withdrawSuccess}</p>
                                    {lastWithdrawal && (
                                      <div className="pt-1.5 border-t border-green-100 space-y-1">
                                        <TaxRow label="Requested Amount" value={formatINR(lastWithdrawal.amount)} />
                                        <TaxRow
                                          label="Service Tax (5%)"
                                          value={`- ${formatINR(lastWithdrawal.serviceTaxAmount)}`}
                                          negative
                                        />
                                        <TaxRow label="TDS (5%)" value={`- ${formatINR(lastWithdrawal.tdsAmount)}`} negative />
                                        <TaxRow
                                          label="Net Payable"
                                          value={formatINR(lastWithdrawal.netPayableAmount)}
                                          bold
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}

                                <button
                                  type="submit"
                                  disabled={withdrawSubmitting}
                                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm sm:text-base"
                                >
                                  {withdrawSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                  {withdrawSubmitting ? 'Submitting…' : 'Submit Payout Request'}
                                </button>
                              </form>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}

                  {/* History — now WITHDRAWAL-ONLY, sourced from the correct table per plan */}
                  {activePanel === 'history' && (
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-gray-800 mb-4">Withdrawal Statement Log</h4>

                      {historyLoading && (
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading withdrawal history…
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
                        <p className="text-sm text-gray-400">No withdrawal history yet for this wallet.</p>
                      )}

                      {!historyLoading && !historyError && history.length > 0 && (
                        <div className="space-y-2.5 sm:space-y-3">
                          {history.map((tx) => {
                            const { date, time } = formatDateTime(tx.createdAt);
                            const isCredit = tx.type === 'Credit';
                            return (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
                              >
                                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                  <div
                                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 ${
                                      isCredit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                    }`}
                                  >
                                    {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{tx.description || tx.source}</p>
                                    <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                                      {date} • {time}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-xs sm:text-sm font-bold whitespace-nowrap ${isCredit ? 'text-[#22c55e]' : 'text-gray-700'}`}>
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
      <div className="p-4 sm:p-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] sm:text-xs font-bold text-gray-400 tracking-wider uppercase">{label}</p>
          <h3 className="text-lg sm:text-2xl font-black text-gray-900 mt-1.5 sm:mt-2">{value}</h3>
        </div>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// tabs sit in a fixed 3-column grid on mobile (icon on top, label below) so
// they always fit on screen. From `sm:` up it goes back to the horizontal
// pill layout.
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
      title={locked ? 'Complete KYC to unlock withdrawals' : undefined}
      className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1.5 py-2.5 sm:px-5 sm:py-3 rounded-xl text-[11px] sm:text-sm font-semibold text-center leading-tight transition-all ${
        active
          ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
          : locked
          ? 'text-amber-400 hover:text-amber-500'
          : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      {icon}
      <span className="truncate max-w-full">{label}</span>
      {locked && (
        <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 absolute top-1.5 right-1.5 sm:static sm:top-auto sm:right-auto" />
      )}
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-[10px] sm:text-xs text-gray-400 font-medium block mb-1">{label}</span>
      <span className="text-xs sm:text-sm font-bold text-gray-700 break-words">{value}</span>
    </div>
  );
}

// small checklist row used for the binary-tree eligibility rule
function EligibilityRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2 text-xs sm:text-sm">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
      )}
      <span className={done ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </div>
  );
}

// single line item used in the tax breakdown preview and success card
function TaxRow({
  label,
  value,
  negative = false,
  bold = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[11px] sm:text-xs ${bold ? 'font-bold text-gray-700' : 'text-gray-500'}`}>{label}</span>
      <span
        className={`text-[11px] sm:text-xs ${
          bold ? 'font-bold text-gray-900' : negative ? 'text-red-500 font-medium' : 'text-gray-700 font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
