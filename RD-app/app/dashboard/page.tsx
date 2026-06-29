'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar';
import {
  Calendar,
  TrendingUp,
  Zap,
  Wallet,
  ArrowDownToLine,
  Coins,
  ShieldAlert,
  AlertTriangle,
  Clock,
  XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_SUBMITTED';

interface PlanInfo {
  isActive: boolean;
  purchaseDate: string | null;
  bv: number;
}

interface WalletData {
  planType: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  minWithdrawalAmount: number;
}

interface TreeLevel {
  level: number;
  memberCount: number;
  totalBv: number;
}

interface ProfileData {
  userName: string;
  userId: string;
  kycStatus: KycStatus;
  plan: PlanInfo;
  totalSells: number;
  totalEarned: number;
  withdrawal: number;
  balance: number;
  bvPoints: number; // ← added: comes directly from profile API
}

interface MyPlanResponse {
  isActive: boolean;
  purchaseDate: string | null;
  bv: number;
  IsActive?: boolean;
  PurchaseDate?: string | null;
  Bv?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://rd-api-j7zj.onrender.com';

function money(value: number | null | undefined) {
  return (value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── KYC Status Banner ────────────────────────────────────────────────────────

function KycBanner({
  status,
  onComplete,
}: {
  status: KycStatus;
  onComplete: () => void;
}) {
  const router = useRouter();

  const configs = {
    NOT_SUBMITTED: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-800',
      descColor: 'text-amber-600',
      btnBg: 'bg-amber-600 hover:bg-amber-700',
      title: 'Complete your KYC',
      desc: 'Verify your identity to unlock withdrawals and commissions.',
      btnLabel: 'Start KYC',
      showBtn: true,
    },
    PENDING: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      titleColor: 'text-sky-800',
      descColor: 'text-sky-600',
      btnBg: '',
      title: 'KYC Under Review',
      desc: "Your documents are being verified. We'll notify you once done.",
      btnLabel: '',
      showBtn: false,
    },
    REJECTED: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      descColor: 'text-red-600',
      btnBg: 'bg-red-600 hover:bg-red-700',
      title: 'KYC Rejected',
      desc: 'Your KYC submission was rejected. Please resubmit your documents.',
      btnLabel: 'Resubmit KYC',
      showBtn: true,
    },
    VERIFIED: null,
  };

  const cfg = configs[status];
  if (!cfg) return null;

  const StatusIcon =
    status === 'PENDING'
      ? Clock
      : status === 'REJECTED'
        ? XCircle
        : ShieldAlert;

  return (
    <div
      className={`flex items-center justify-between gap-4 ${cfg.bg} border ${cfg.border} rounded-2xl px-5 py-4 transition-all duration-300`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-xl ${cfg.iconBg} shrink-0`}>
          <StatusIcon className={cfg.iconColor} size={20} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${cfg.titleColor}`}>{cfg.title}</p>
          <p className={`text-xs ${cfg.descColor} mt-0.5 leading-relaxed`}>
            {cfg.desc}
          </p>
        </div>
      </div>
      {cfg.showBtn && (
        <button
          onClick={() => {
            router.push('/dashboard/kyc');
            onComplete();
          }}
          className={`shrink-0 ${cfg.btnBg} text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap`}
        >
          {cfg.btnLabel}
        </button>
      )}
    </div>
  );
}

// ─── Plan Inactive Banner ─────────────────────────────────────────────────────

function PlanBanner({ onActivate }: { onActivate: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-red-100 shrink-0">
          <AlertTriangle className="text-red-600" size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-800">No active plan</p>
          <p className="text-xs text-red-600 mt-0.5">
            Activate a plan to start earning commissions and access all features.
          </p>
        </div>
      </div>
      <button
        onClick={onActivate}
        className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
      >
        Activate Plan
      </button>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  subtextPositive?: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  highlight?: boolean;
  blurred?: boolean;
}

function StatCard({ card }: { card: StatCardProps }) {
  return (
    <div
      className={`bg-white rounded-2xl md:rounded-xl p-4 md:p-5 shadow-sm border border-gray-100 border-t-4 ${card.borderColor} flex flex-col justify-between min-h-[110px] relative overflow-hidden`}
    >
      {card.blurred && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-2xl z-10 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-gray-400 tracking-wide uppercase">
            Activate plan
          </span>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="min-w-0 pr-2">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            {card.title}
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span
              className={`font-extrabold text-gray-900 leading-tight ${
                card.highlight
                  ? 'text-2xl md:text-3xl text-blue-600'
                  : 'text-lg md:text-xl'
              }`}
            >
              {card.value}
            </span>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${card.iconBg} shrink-0`}>
          <card.icon size={18} className={card.iconColor} />
        </div>
      </div>

      {card.subtext && (
        <div className="mt-2 flex">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              card.subtextPositive
                ? 'text-green-600 bg-green-50 border-green-200'
                : 'text-red-500 bg-red-50 border-red-200'
            }`}
          >
            {card.subtext}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Level BV Breakdown ───────────────────────────────────────────────────────

function LevelBvBreakdownSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-6 w-24 bg-indigo-100 rounded animate-pulse" />
      </div>
      <div className="divide-y divide-gray-50">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-2.5 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-1.5 bg-gray-100 rounded-full w-full animate-pulse" />
            </div>
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LevelBvBreakdown({ levels }: { levels: TreeLevel[] }) {
  const maxBv = Math.max(...levels.map((l) => l.totalBv), 1);
  const totalBv = levels.reduce((sum, l) => sum + l.totalBv, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm md:text-base font-bold text-gray-900">
            Level BV Breakdown
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Business Volume across {levels.length} levels
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            Total BV
          </p>
          <p className="text-lg md:text-xl font-extrabold text-indigo-600 mt-0.5">
            {totalBv.toLocaleString('en-IN')} BV
          </p>
        </div>
      </div>

      {/* Level Rows */}
      <div className="divide-y divide-gray-50">
        {levels.map((lvl) => {
          const pct = maxBv > 0 ? (lvl.totalBv / maxBv) * 100 : 0;
          return (
            <div
              key={lvl.level}
              className="flex items-center gap-3 md:gap-4 py-3"
            >
              {/* Level Badge */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <span className="text-[10px] font-bold text-indigo-500">
                  L{lvl.level}
                </span>
              </div>

              {/* Bar + member count */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400 mb-1">
                  {lvl.memberCount}{' '}
                  {lvl.memberCount === 1 ? 'member' : 'members'}
                </p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* BV Value */}
              <div className="shrink-0 text-right min-w-[70px]">
                <span className="text-xs font-semibold text-gray-500">
                  {lvl.totalBv.toLocaleString('en-IN')} BV
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Parse Tree API response (recursive nested tree walker) ──────────────────

function walkTree(
  node: any,
  map: Map<number, { memberCount: number; totalBv: number }>
) {
  const lvl: number = node.level ?? 0;
  const bv: number = node.calculatedBv ?? node.calculatedBV ?? node.bv ?? node.Bv ?? 0;

  if (lvl > 0) {
    const existing = map.get(lvl) ?? { memberCount: 0, totalBv: 0 };
    map.set(lvl, {
      memberCount: existing.memberCount + 1,
      totalBv: existing.totalBv + bv,
    });
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walkTree(child, map);
    }
  }
}

function parseTreeLevels(treeRaw: unknown): TreeLevel[] {
  const map = new Map<number, { memberCount: number; totalBv: number }>();

  if (treeRaw && typeof treeRaw === 'object') {
    if (Array.isArray(treeRaw)) {
      for (const node of treeRaw) walkTree(node, map);
    } else {
      walkTree(treeRaw, map);
    }
  }

  return Array.from({ length: 12 }, (_, i) => {
    const lvl = i + 1;
    return map.get(lvl)
      ? { level: lvl, ...map.get(lvl)! }
      : { level: lvl, memberCount: 0, totalBv: 0 };
  });
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [treeLevels, setTreeLevels] = useState<TreeLevel[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);

  // ── Fetch core dashboard data ─────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      setProfileLoading(true);
      setProfileError(null);

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const [profileResult, planResult, walletResult] = await Promise.allSettled([
        fetch(`${API_BASE}/api/Auth/profile`, { headers, cache: 'no-store' }),
        fetch(`${API_BASE}/api/Plans/my-plan`, { headers, cache: 'no-store' }),
        fetch(`${API_BASE}/api/wallet`, { headers, cache: 'no-store' }),
      ]);

      if (profileResult.status === 'rejected') throw new Error('Failed to load profile');
      const profileRes = profileResult.value;
      if (!profileRes.ok) throw new Error(`Profile error: ${profileRes.status}`);

      const profileData: ProfileData = await profileRes.json();

      // ── Capture bvPoints from profile API ──────────────────────────────
      const rawProfile = profileData as any;
      profileData.bvPoints =
        rawProfile.bvPoints ??
        rawProfile.BvPoints ??
        rawProfile.bv_points ??
        0;

      // ── Seed plan.isActive from profile's isActive field ───────────────
      // This ensures the dashboard shows ACTIVE even if /api/Plans/my-plan
      // fails or returns stale data, since the backend sets user.IsActive
      // on checkout and the profile API now returns it.
      const profileIsActive: boolean =
        rawProfile.isActive ?? rawProfile.IsActive ?? false;
      profileData.plan = {
        isActive: profileIsActive,
        purchaseDate: null,
        bv: 0,
      };

      // ── Normalise kycStatus ────────────────────────────────────────────
      const rawKycString = (
        rawProfile.kycStatus ?? rawProfile.KycStatus ?? rawProfile.kyc_status ?? ''
      ) as string;
      const kycUpper = rawKycString.toString().toUpperCase().trim();
      if (kycUpper === 'PENDING') profileData.kycStatus = 'PENDING';
      else if (kycUpper === 'VERIFIED') profileData.kycStatus = 'VERIFIED';
      else if (kycUpper === 'REJECTED') profileData.kycStatus = 'REJECTED';
      else if (rawProfile.isKycCompleted === true) profileData.kycStatus = 'VERIFIED';
      else profileData.kycStatus = 'NOT_SUBMITTED';

      // ── Merge plan ─────────────────────────────────────────────────────
      if (planResult.status === 'fulfilled' && planResult.value.ok) {
        try {
          const planRaw: MyPlanResponse = await planResult.value.json();
          profileData.plan = {
            isActive: planRaw.isActive ?? planRaw.IsActive ?? false,
            purchaseDate: planRaw.purchaseDate ?? planRaw.PurchaseDate ?? null,
            bv: planRaw.bv ?? planRaw.Bv ?? 0,
          };
        } catch { /* keep profile defaults */ }
      }

      // ── Merge wallet ───────────────────────────────────────────────────
      if (walletResult.status === 'fulfilled' && walletResult.value.ok) {
        try {
          const walletRaw: WalletData | WalletData[] = await walletResult.value.json();
          const wallet = Array.isArray(walletRaw) ? walletRaw[0] : walletRaw as any;
          if (wallet) {
            profileData.totalEarned = wallet.totalEarned ?? 0;
            profileData.withdrawal = wallet.totalWithdrawn ?? 0;
            profileData.balance = wallet.balance ?? 0;
          }
        } catch {
          profileData.totalEarned = 0;
          profileData.withdrawal = 0;
          profileData.balance = 0;
        }
      } else {
        profileData.totalEarned = 0;
        profileData.withdrawal = profileData.withdrawal ?? 0;
        profileData.balance = profileData.balance ?? 0;
      }

      setProfile(profileData);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Fetch tree separately ─────────────────────────────────────────────────
  const fetchTree = useCallback(async () => {
    try {
      setTreeLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_BASE}/api/tree`, { headers, cache: 'no-store' });
      if (!res.ok) throw new Error('tree fetch failed');
      const raw = await res.json();
      setTreeLevels(parseTreeLevels(raw));
    } catch {
      setTreeLevels(
        Array.from({ length: 12 }, (_, i) => ({ level: i + 1, memberCount: 0, totalBv: 0 }))
      );
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard().then(() => fetchTree());
  }, [fetchDashboard, fetchTree]);

  useEffect(() => {
    const handleFocus = () => {
      fetchDashboard().then(() => fetchTree());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchDashboard, fetchTree]);

  // ── Full-page loading skeleton ────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="flex bg-[#F4F6FA] min-h-screen text-gray-800 font-sans antialiased">
        <div className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 p-4 gap-4 shrink-0">
          <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse mb-4" />
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-2.5 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-full bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
            <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
          <main className="flex-1 p-4 md:p-8 space-y-5">
            <div className="h-16 w-full bg-amber-50 border border-amber-100 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 border-t-4 border-t-gray-200 min-h-[110px] flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2 flex-1 pr-3">
                      <div className="h-2.5 w-20 bg-gray-200 rounded animate-pulse" />
                      <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                  </div>
                  <div className="h-4 w-14 bg-gray-100 rounded-full animate-pulse mt-2" />
                </div>
              ))}
            </div>
            <LevelBvBreakdownSkeleton />
          </main>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex bg-[#F4F6FA] min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <XCircle className="mx-auto text-red-400" size={36} />
          <p className="text-sm text-gray-600 font-medium">
            {profileError || 'Unable to load dashboard'}
          </p>
          <button
            onClick={() => fetchDashboard().then(() => fetchTree())}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const kycVerified = profile.kycStatus === 'VERIFIED';
  const planActive = !!profile.plan?.isActive;

  const stats: StatCardProps[] = [
    {
      title: 'Purchase Date',
      value: profile.plan?.purchaseDate
        ? formatDate(profile.plan.purchaseDate)
        : planActive ? '--' : 'No Plan',
      subtext: planActive ? 'ACTIVE' : 'INACTIVE',
      subtextPositive: planActive,
      icon: Calendar,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      borderColor: 'border-t-blue-500',
    },
    {
      title: 'Purchase BV',
      // ✅ Now uses bvPoints from profile API instead of plan.bv
      value: `${profile.bvPoints ?? 0} BV`,
      icon: TrendingUp,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      borderColor: 'border-t-indigo-500',
      blurred: !planActive,
    },
    {
      title: 'Total Sells',
      value: `${profile.totalSells ?? 0} Sell${(profile.totalSells ?? 0) === 1 ? '' : 's'}`,
      icon: Zap,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      borderColor: 'border-t-orange-400',
      blurred: !planActive,
    },
    {
      title: 'Total Earning',
      value: `₹${money(profile.totalEarned)}`,
      icon: Wallet,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
      borderColor: 'border-t-green-500',
      blurred: !planActive,
    },
    {
      title: 'Withdrawal',
      value: `₹${money(profile.withdrawal)}`,
      icon: ArrowDownToLine,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      borderColor: 'border-t-red-400',
      blurred: !planActive,
    },
    {
      title: 'Balance',
      value: `₹${money(profile.balance)}`,
      icon: Coins,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-t-blue-600',
      highlight: true,
      blurred: !planActive,
    },
  ];

  return (
    <div className="flex bg-[#F4F6FA] min-h-screen text-gray-800 font-sans antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <LoginTopbar logoSrc="/logo.png" pageTitle="Dashboard" />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-4 md:p-8 space-y-5">

            {/* ── KYC Alert ── */}
            {!kycVerified && (
              <KycBanner
                status={profile.kycStatus}
                onComplete={() => fetchDashboard().then(() => fetchTree())}
              />
            )}

            {/* ── Plan Alert ── */}
            {kycVerified && !planActive && (
              <PlanBanner onActivate={() => router.push('/plan')} />
            )}

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {stats.map((card, idx) => (
                <StatCard key={idx} card={card} />
              ))}
            </div>

            {/* ── Level BV Breakdown ── */}
            {planActive && (
              treeLoading || treeLevels === null
                ? <LevelBvBreakdownSkeleton />
                : <LevelBvBreakdown levels={treeLevels} />
            )}

            {/* ── Empty state when no plan yet ── */}
            {!planActive && kycVerified && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="text-blue-400" size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">No activity yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Your earnings and team activity will appear here once you activate a plan.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/plan')}
                  className="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-colors"
                >
                  View Plans
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}