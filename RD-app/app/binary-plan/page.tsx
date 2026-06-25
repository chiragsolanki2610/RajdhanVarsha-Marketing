'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import {
  GitBranch, Wallet, CheckCircle2, AlertCircle, Loader2,
  ChevronDown, ChevronUp, ArrowRight, Lock, Unlock,
} from 'lucide-react';

const API_BASE = 'https://rd-api-j7zj.onrender.com';

interface BinaryStatus {
  isInBinaryPlan: boolean;
  isActive: boolean;
  position?: string;
  parentId?: string;
  leftChildId?: string;
  rightChildId?: string;
  treeLevel: number;
  leftLegCount: number;
  rightLegCount: number;
  totalDownlineCount: number;
  withdrawalUnlocked: boolean;
  pairsCompleted: number;
  walletBalance: number;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  pairsCount: number;
  withdrawalUnlocked: boolean;
  withdrawalUnlockMessage: string;
  recentTransactions: {
    id: number; type: string; amount: number; source: string; description?: string; createdAt: string;
  }[];
}

const pairCommissionInfo = [
  { pairs: 1,   earn: '₹150' },
  { pairs: 5,   earn: '₹750' },
  { pairs: 10,  earn: '₹1,500' },
  { pairs: 50,  earn: '₹7,500' },
  { pairs: 100, earn: '₹15,000' },
];

export default function BinaryPlanPage() {
  const router = useRouter();
  const [status,  setStatus]  = useState<BinaryStatus | null>(null);
  const [wallet,  setWallet]  = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showRules,  setShowRules]  = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  const [sponsorInput,  setSponsorInput]  = useState('');
  const [positionInput, setPositionInput] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [joining,  setJoining]  = useState(false);
  const [joinMsg,  setJoinMsg]  = useState('');
  const [joinError, setJoinError] = useState('');

  const [withdrawAmt,   setWithdrawAmt]   = useState('');
  const [withdrawing,   setWithdrawing]   = useState(false);
  const [withdrawMsg,   setWithdrawMsg]   = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  // ✅ FIX — guard localStorage for SSR (server doesn't have window)
  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/binary/status`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) setStatus(await res.json());
      else setError('Failed to load binary status.');
    } catch {
      setError('Network error loading status.');
    }
  }, [token]);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/binary/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) setWallet(await res.json());
      else setError('Failed to load wallet.');
    } catch {
      setError('Network error loading wallet.');
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    (async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchWallet()]);
      setLoading(false);
    })();
  }, [fetchStatus, fetchWallet, token, router]);

  const handleJoin = async () => {
    setJoinError(''); setJoinMsg('');
    if (!sponsorInput.trim()) { setJoinError('Please enter a Sponsor ID.'); return; }
    setJoining(true);
    try {
      const res = await fetch(`${API_BASE}/api/binary/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorId: sponsorInput.trim().toUpperCase(), preferredPosition: positionInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setJoinMsg(data.message || 'Successfully joined the binary tree!');
        await fetchStatus();
      } else {
        setJoinError(data.message || 'Failed to join. Please try again.');
      }
    } catch {
      setJoinError('Network error. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawError(''); setWithdrawMsg('');
    const amt = parseFloat(withdrawAmt);
    if (!withdrawAmt || isNaN(amt) || amt <= 0) {
      setWithdrawError('Enter a valid amount.');
      return;
    }
    if (amt < 250) {
      setWithdrawError('Minimum withdrawal amount is ₹250.');
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetch(`${API_BASE}/api/binary/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawMsg(data.message || 'Withdrawal requested.');
        setWithdrawAmt('');
        await fetchWallet();
        await fetchStatus();
      } else {
        setWithdrawError(data.message || 'Withdrawal failed.');
      }
    } catch {
      setWithdrawError('Network error.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </main>
      </div>
    );
  }

  const isEnrolled = status?.isInBinaryPlan ?? false;
  const isActive   = status?.isActive ?? false;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6 pb-24 max-w-2xl">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <GitBranch size={20} className="text-purple-600" />
            Binary Plan
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Earn ₹150 for every pair in your downline</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {isEnrolled && (
          <div className={`rounded-2xl p-4 mb-4 flex items-start gap-3
            ${isActive ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            {isActive
              ? <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              : <AlertCircle  size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />}
            <div>
              <p className={`font-semibold text-sm ${isActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isActive ? 'Binary ID Active' : 'Placed — Activation Pending'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isActive
                  ? `Level ${status?.treeLevel} · ${status?.position} side · ${status?.totalDownlineCount} downline member(s)`
                  : 'Purchase products worth ₹600 BV to activate your Binary ID.'}
              </p>
            </div>
          </div>
        )}

        {isEnrolled && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard label="Left Leg"   value={status?.leftLegCount ?? 0}   color="text-blue-600" />
            <StatCard label="Right Leg"  value={status?.rightLegCount ?? 0}  color="text-purple-600" />
            <StatCard label="Pairs Done" value={status?.pairsCompleted ?? 0} color="text-amber-600" />
          </div>
        )}

        {/* Plan Rules */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
          <button
            onClick={() => setShowRules(r => !r)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700"
          >
            <span>Binary Plan Rules & Commission</span>
            {showRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showRules && (
            <div className="px-4 pb-4 space-y-3 text-sm text-gray-600">
              <RuleItem icon="🌳" text="Each user can sponsor exactly 2 people — one on the LEFT and one on the RIGHT leg." />
              <RuleItem icon="💰" text="Every time a matched pair (1 LEFT + 1 RIGHT) forms below you, you earn ₹150 instantly." />
              <RuleItem icon="🛍️" text="To activate your Binary ID, purchase products worth at least 600 BV." />
              <RuleItem icon="🔒" text="First withdrawal requires a minimum of 3 downline members (at least 2 on one side and 1 on the other)." />
              <RuleItem icon="📊" text="Pairs cascade — as your downline grows, pairs keep forming and commissions keep flowing." />
              <RuleItem icon="💳" text="Minimum withdrawal amount is ₹250." />
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Pair Earnings Example</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2 font-medium text-gray-500">Pairs</th>
                        <th className="text-right p-2 font-medium text-gray-500">Total Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pairCommissionInfo.map(row => (
                        <tr key={row.pairs} className="border-t border-gray-100">
                          <td className="p-2">{row.pairs}</td>
                          <td className="p-2 text-right font-semibold text-emerald-600">{row.earn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Join Form */}
        {!isEnrolled && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <h2 className="font-semibold text-sm text-gray-700 mb-3">Join Binary Plan</h2>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sponsor ID</label>
            <input
              type="text"
              value={sponsorInput}
              onChange={e => setSponsorInput(e.target.value.trim().toUpperCase())}
              placeholder="e.g. RD0001"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <label className="block text-xs font-medium text-gray-500 mb-1">Your Position Under Sponsor</label>
            <div className="flex gap-3 mb-4">
              {(['LEFT', 'RIGHT'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setPositionInput(pos)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors
                    ${positionInput === pos
                      ? pos === 'LEFT'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                >
                  {pos}
                </button>
              ))}
            </div>
            {joinError && <p className="text-xs text-red-500 mb-2">{joinError}</p>}
            {joinMsg   && <p className="text-xs text-emerald-600 mb-2">{joinMsg}</p>}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {joining ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {joining ? 'Placing in tree…' : 'Join Binary Plan'}
            </button>
          </div>
        )}

        {/* Activate */}
        {isEnrolled && !isActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <h2 className="font-semibold text-sm text-amber-800 mb-1">Activate Your Binary ID</h2>
            <p className="text-xs text-amber-600 mb-3">
              Purchase products worth ≥600 BV from the shop to activate your ID and start earning pair commissions.
            </p>
            <button
              onClick={() => {
                localStorage.setItem('pendingActivationPlan', 'binary-plan');
                router.push('/shop/products');
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
            >
              <ArrowRight size={15} /> Go to Shop (600 BV required)
            </button>
          </div>
        )}

        {/* Wallet */}
        {isEnrolled && wallet && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
            <button
              onClick={() => setShowWallet(w => !w)}
              className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700"
            >
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-purple-600" />
                <span>Binary Wallet</span>
                <span className="text-purple-600 font-bold">₹{wallet.balance.toFixed(2)}</span>
              </div>
              {showWallet ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showWallet && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <MiniStat label="Balance" value={`₹${wallet.balance.toFixed(0)}`}      color="text-emerald-600" />
                  <MiniStat label="Earned"  value={`₹${wallet.totalEarned.toFixed(0)}`}  color="text-blue-600" />
                  <MiniStat label="Pairs"   value={wallet.pairsCount.toString()}          color="text-amber-600" />
                </div>
                <div className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-xs
                  ${wallet.withdrawalUnlocked ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                  {wallet.withdrawalUnlocked
                    ? <Unlock size={14} className="flex-shrink-0 mt-0.5" />
                    : <Lock   size={14} className="flex-shrink-0 mt-0.5" />}
                  <span>{wallet.withdrawalUnlockMessage}</span>
                </div>
                {wallet.withdrawalUnlocked && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Withdrawal Amount (min ₹250)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={withdrawAmt}
                        onChange={e => setWithdrawAmt(e.target.value)}
                        placeholder="Enter amount"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <button
                        onClick={handleWithdraw}
                        disabled={withdrawing}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1 transition-colors"
                      >
                        {withdrawing ? <Loader2 size={12} className="animate-spin" /> : null}
                        Withdraw
                      </button>
                    </div>
                    {withdrawError && <p className="text-xs text-red-500 mt-1">{withdrawError}</p>}
                    {withdrawMsg   && <p className="text-xs text-emerald-600 mt-1">{withdrawMsg}</p>}
                  </div>
                )}
                {(wallet.recentTransactions ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Transactions</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(wallet.recentTransactions ?? []).map(txn => (
                        <div key={txn.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-xl px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-700">{txn.source}</p>
                            <p className="text-gray-400">{new Date(txn.createdAt).toLocaleDateString('en-IN')}</p>
                          </div>
                          <span className={`font-bold ${txn.type === 'Credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {txn.type === 'Credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isEnrolled && (
          <button
            onClick={() => router.push('/network/binary-view')}
            className="w-full bg-white border border-purple-200 text-purple-700 text-sm font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
          >
            <GitBranch size={16} />
            View My Binary Tree
          </button>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function RuleItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex gap-2 text-xs text-gray-600">
      <span className="flex-shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
