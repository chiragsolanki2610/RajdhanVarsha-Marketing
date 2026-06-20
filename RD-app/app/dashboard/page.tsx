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
  ChevronRight,
  UserPlus,
  ShieldAlert,
  AlertTriangle,
  Loader2,
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

interface ActivityItem {
  id: number | string;
  type: 'commission' | 'member' | 'activation' | 'withdrawal' | 'generic';
  title: string;
  description: string;
  value: string | null;
  valuePositive: boolean;
  timestamp: string;
}

interface ProfileData {
  userName: string;
  userId: string;
  kycStatus: KycStatus;
  plan: PlanInfo;
  totalSells: number;
  totalPayout: number;
  withdrawal: number;
  balance: number;
  recentActivity?: ActivityItem[];
}

// Shape returned by /api/Plans/my-plan
interface MyPlanResponse {
  isActive: boolean;
  purchaseDate: string | null;
  bv: number;
  // backend may return camelCase or PascalCase — handle both
  IsActive?: boolean;
  PurchaseDate?: string | null;
  Bv?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Never use https for localhost — the backend has no TLS cert on dev
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'https://localhost:56187'
    : 'https://localhost:56187');

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

const ACTIVITY_ICONS: Record<ActivityItem['type'], React.ElementType> = {
  commission: Zap,
  member: UserPlus,
  activation: TrendingUp,
  withdrawal: ArrowDownToLine,
  generic: Coins,
};

const ACTIVITY_ICON_STYLES: Record<
  ActivityItem['type'],
  { bg: string; color: string }
> = {
  commission: { bg: 'bg-green-50', color: 'text-green-600' },
  member: { bg: 'bg-blue-50', color: 'text-blue-500' },
  activation: { bg: 'bg-indigo-50', color: 'text-indigo-500' },
  withdrawal: { bg: 'bg-red-50', color: 'text-red-500' },
  generic: { bg: 'bg-gray-50', color: 'text-gray-500' },
};

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
              className={`font-extrabold text-gray-900 leading-tight ${card.highlight
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
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${card.subtextPositive
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

// ─── Recent Activity ──────────────────────────────────────────────────────────

function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm md:text-base font-bold text-gray-900">
          Recent Activity
        </h3>
        <button className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 transition-colors">
          View All <ChevronRight size={16} />
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const IconComp = ACTIVITY_ICONS[item.type] ?? Coins;
          const iconStyle =
            ACTIVITY_ICON_STYLES[item.type] ?? ACTIVITY_ICON_STYLES.generic;

          return (
            <div
              key={item.id}
              className="py-3 md:py-4 flex items-center justify-between group hover:bg-slate-50/70 px-2 rounded-xl transition-colors duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div
                  className={`p-2 md:p-2.5 rounded-xl ${iconStyle.bg} shrink-0`}
                >
                  <IconComp size={16} className={iconStyle.color} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs md:text-sm font-bold text-gray-900 truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] md:text-xs text-gray-400 mt-0.5 truncate">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-5 text-right shrink-0 ml-3">
                {item.value && (
                  <p
                    className={`text-xs md:text-sm font-bold whitespace-nowrap ${item.valuePositive ? 'text-green-600' : 'text-gray-700'
                      }`}
                  >
                    {item.value}
                  </p>
                )}
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] md:text-xs font-medium text-gray-400 whitespace-nowrap">
                    {item.timestamp}
                  </p>
                  <ChevronRight
                    size={15}
                    className="text-gray-300 group-hover:text-gray-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Fetch profile and plan in parallel — plan failure must NOT crash the page
      const [profileResult, planResult] = await Promise.allSettled([
        fetch(`${API_BASE}/api/Auth/profile`, { headers, cache: 'no-store' }),
        fetch(`${API_BASE}/api/Plans/my-plan`, { headers, cache: 'no-store' }),
      ]);

      // Profile is mandatory
      if (profileResult.status === 'rejected') {
        throw new Error('Failed to load profile');
      }
      const profileRes = profileResult.value;
      if (!profileRes.ok) throw new Error(`Profile error: ${profileRes.status}`);

      const profileData: ProfileData = await profileRes.json();

      // ── Normalise kycStatus ──────────────────────────────────────────────
      // The backend returns `isKycCompleted` (boolean), not `kycStatus` (string).
      // We also check for a KycStatus string field as fallback.
      const raw = profileData as any;

      const rawKycString = (raw.kycStatus ?? raw.KycStatus ?? raw.kyc_status ?? '') as string;
      const kycUpper = rawKycString?.toString().toUpperCase().trim();

      if (kycUpper === 'PENDING') profileData.kycStatus = 'PENDING';
      else if (kycUpper === 'VERIFIED') profileData.kycStatus = 'VERIFIED';
      else if (kycUpper === 'REJECTED') profileData.kycStatus = 'REJECTED';
      else if (raw.isKycCompleted === true) profileData.kycStatus = 'VERIFIED';
      else profileData.kycStatus = 'NOT_SUBMITTED';

      // Merge plan data only if the plan fetch succeeded
      if (planResult.status === 'fulfilled' && planResult.value.ok) {
        try {
          const planRaw: MyPlanResponse = await planResult.value.json();
          const isActive = planRaw.isActive ?? planRaw.IsActive ?? false;
          const purchaseDate = planRaw.purchaseDate ?? planRaw.PurchaseDate ?? null;
          const bv = planRaw.bv ?? planRaw.Bv ?? 0;
          profileData.plan = { isActive, purchaseDate, bv };
        } catch {
          // plan JSON parse failed — keep whatever profile returned
        }
      }

      setProfile(profileData);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Re-fetch when user returns from KYC or Plan pages
  useEffect(() => {
    const handleFocus = () => fetchProfile();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex bg-[#F4F6FA] min-h-screen text-gray-800 font-sans antialiased">
        {/* Sidebar skeleton */}
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
          {/* Topbar skeleton */}
          <div className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
            <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>

          <main className="flex-1 p-4 md:p-8 space-y-5">
            {/* Banner skeleton */}
            <div className="h-16 w-full bg-amber-50 border border-amber-100 rounded-2xl animate-pulse" />

            {/* Stat cards skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 border-t-4 border-t-gray-200 min-h-[110px] flex flex-col justify-between"
                >
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

            {/* Recent activity skeleton */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="flex justify-between items-center mb-5">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="divide-y divide-gray-100">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                      <div className="flex flex-col gap-2">
                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                      <div className="h-2.5 w-12 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex bg-[#F4F6FA] min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <XCircle className="mx-auto text-red-400" size={36} />
          <p className="text-sm text-gray-600 font-medium">
            {error || 'Unable to load dashboard'}
          </p>
          <button
            onClick={fetchProfile}
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
        : planActive
          ? '--'
          : 'No Plan',
      subtext: planActive ? 'ACTIVE' : 'INACTIVE',
      subtextPositive: planActive,
      icon: Calendar,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      borderColor: 'border-t-blue-500',
    },
    {
      title: 'Purchase BV',
      value: `${profile.plan?.bv ?? 0} BV`,
      icon: TrendingUp,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      borderColor: 'border-t-indigo-500',
      blurred: !planActive,
    },
    {
      title: 'Total Sells',
      value: `${profile.totalSells ?? 0} Sell${(profile.totalSells ?? 0) === 1 ? '' : 's'
        }`,
      icon: Zap,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      borderColor: 'border-t-orange-400',
      blurred: !planActive,
    },
    {
      title: 'Total Payout',
      value: `₹${money(profile.totalPayout)}`,
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

  const activityItems: ActivityItem[] = profile.recentActivity ?? [
    {
      id: 1,
      type: 'commission',
      title: 'Commission Credited',
      description: 'From Level 1 direct sell',
      value: '+ ₹220.00',
      valuePositive: true,
      timestamp: '10:45 AM',
    },
    {
      id: 2,
      type: 'member',
      title: 'New Team Member',
      description: 'Rahul joined your downline',
      value: null,
      valuePositive: false,
      timestamp: 'Yesterday',
    },
    {
      id: 3,
      type: 'activation',
      title: 'Account Activated',
      description: 'Dream purchase processed',
      value: '600 BV',
      valuePositive: false,
      timestamp: '15 May',
    },
  ];

  return (
    <div className="flex bg-[#F4F6FA] min-h-screen text-gray-800 font-sans antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <LoginTopbar logoSrc="/logo.png" />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-4 md:p-8 space-y-5">

            {/* ── Step 1: KYC Alert — only when not verified ── */}
            {!kycVerified && (
              <KycBanner
                status={profile.kycStatus}
                onComplete={fetchProfile}
              />
            )}

            {/* ── Step 2: Plan Alert — only when KYC done but no plan ── */}
            {kycVerified && !planActive && (
              <PlanBanner onActivate={() => router.push('/plan')} />
            )}

            {/* ── Step 3: KYC verified + Plan active success pill ── */}
            {/* {kycVerified && planActive && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-5 py-3 w-fit">
                <CheckCircle2 className="text-green-600" size={16} />
                <span className="text-xs font-bold text-green-700">
                  Account fully active — you&apos;re earning!
                </span>
              </div>
            )} */}

            {/* ── Stat Cards Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {stats.map((card, idx) => (
                <StatCard key={idx} card={card} />
              ))}
            </div>

            {/* ── Recent Activity — only shown when plan is active ── */}
            {planActive && <RecentActivity items={activityItems} />}

            {/* ── Empty state when no plan yet ── */}
            {!planActive && kycVerified && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="text-blue-400" size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">
                    No activity yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Your earnings and team activity will appear here once you
                    activate a plan.
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