'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from "next/navigation";
import { Check, Network, ChevronDown, ChevronUp, CircleDot, FileText, BadgeCheck } from 'lucide-react';

export default function PlanPage() {
  const router = useRouter();

  const [activePlanType, setActivePlanType] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Collapse toggles — Both set to false initially to display "Show Less" view on load
  const [showDreamDetails, setShowDreamDetails] = useState(false);
  const [showBinaryDetails, setShowBinaryDetails] = useState(false);

  // Fetch active plan on mount — always fetch fresh from API
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        // Grab JWT token
        const token =
          localStorage.getItem('token') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('jwtToken') ||
          '';

        if (!token) {
          // No token: clear any stale cache and show inactive
          localStorage.removeItem('userPlanType');
          setLoadingPlan(false);
          return;
        }

        // KEY FIX: Always fetch fresh — NEVER trust localStorage cache alone.
        // The cache can be stale across different user logins on the same browser.
        const res = await fetch(`https://rd-api-j7zj.onrender.com/api/Plans/my-plan`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();

          // Check isActive boolean from the server, NOT just planType.
          // A user can have a planType but still be inactive (BV threshold
          // not met, or stale cache from a previous user on this browser).
          const serverIsActive: boolean = data?.isActive ?? data?.IsActive ?? false;
          const planType = (data?.planType || data?.PlanType || '').toLowerCase();

          if (serverIsActive && planType) {
            setActivePlanType(planType);
            localStorage.setItem('userPlanType', planType);
          } else {
            // User is NOT active — clear any stale cached value
            setActivePlanType(null);
            localStorage.removeItem('userPlanType');
          }
        } else {
          // API error — clear stale cache, do not show active
          setActivePlanType(null);
          localStorage.removeItem('userPlanType');
        }
      } catch {
        // Network error — clear stale cache, do not show active
        setActivePlanType(null);
        localStorage.removeItem('userPlanType');
      } finally {
        setLoadingPlan(false);
      }
    };
    fetchPlan();
  }, []);

  // Level Matrix Data extracted directly from your Dream Plan blueprint screenshot
  const matrixData = [
    { level: 1, distributor: '3', bv: '1,800', pct: '10%', income: '₹180' },
    { level: 2, distributor: '9', bv: '5,400', pct: '7%', income: '₹378' },
    { level: 3, distributor: '27', bv: '16,200', pct: '5%', income: '₹810' },
    { level: 4, distributor: '81', bv: '48,620', pct: '4%', income: '₹1,945' },
    { level: 5, distributor: '243', bv: '145,800', pct: '4%', income: '₹5,832' },
    { level: 6, distributor: '729', bv: '437,400', pct: '3%', income: '₹13,122' },
    { level: 7, distributor: '2,187', bv: '1,312,200', pct: '3%', income: '₹39,366' },
    { level: 8, distributor: '6,561', bv: '3,936,600', pct: '2%', income: '₹78,732' },
    { level: 9, distributor: '19,683', bv: '11,809,800', pct: '2%', income: '₹236,196' },
    { level: 10, distributor: '59,049', bv: '35,429,400', pct: '2%', income: '₹708,588' },
    { level: 11, distributor: '177,147', bv: '106,288,200', pct: '1%', income: '₹1,062,882' },
    { level: 12, distributor: '531,441', bv: '318,864,600', pct: '1%', income: '₹3,188,646' },
  ];

  // ── UPDATED: now routes to the correct shop pages ──
  const handleActivation = (planId: string) => {
    localStorage.setItem('pendingActivationPlan', planId);
    if (planId === 'dream-plan') {
      window.location.href = '/shop/dream-plan';
    } else {
      window.location.href = '/shop/dream-plan';
    }
  };

  // Helper: is a given plan currently active?
  const isDreamActive = activePlanType === 'dream' || activePlanType === 'dream plan' || activePlanType === 'dream-plan';
  const isBinaryActive = activePlanType === 'binary' || activePlanType === 'binary plan' || activePlanType === 'binary-plan';

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans antialiased">
      {/* ── Sidebar Context Component ── */}
      <Sidebar />

      {/* ── Main Workspace Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Top Header Navigation Strip */}
        <header className="bg-white border-b border-slate-200 h-16 shrink-0 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase">Plan  Management </h1>
          </div>
          {/* <div className="flex items-center gap-4">
            <div className="border-l border-slate-200 pl-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span>
              <span className="text-xs font-black text-red-500 font-mono">INACTIVE profile</span>
            </div>
          </div> */}
        </header>

        {/* ── Primary Main Dashboard Viewport ── */}
        <main className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-8">

          {/* ──────────────────────────────────────────────────────────────────
             1. DREAM PLAN FULL SPECIFICATION VIEWPORT
             ────────────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative transition-all duration-300">

            {/* Top Graphic Most Popular Ribbon Accent */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
              <span className="bg-[#1E40AF] text-white text-[9px] font-black px-6 py-1 rounded-b-xl uppercase tracking-widest shadow-md border-x border-b border-blue-400/20">
                MOST POPULAR
              </span>
            </div>

            {/* Top Summary Block Layout Row */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-br from-white via-white to-blue-50/20">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dream Plan</h2>
                {/* ── ACTIVE BADGE (only shown when dream plan is active) ── */}
                {isDreamActive && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    <BadgeCheck size={12} className="text-emerald-500" /> Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                A comprehensive 12-Level business acceleration matrix allowing up to 10 direct network joinings.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-4xl font-extrabold text-[#3B5998] tracking-tight">600 B.V.</span>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  ACTIVATION MILESTONE (VALUE APPROX ₹900)
                </span>
              </div>

              {/* Checklist Rules Strip Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Existing distributors can join with an additional 600 B.V. purchase.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Enables a wider horizon of up to 10 direct customer joinings.</span>
                </div>
              </div>
            </div>

            {/* ── Toggled Complete Matrix Breakdown Content Frame ── */}
            {showDreamDetails && (
              <div className="p-6 md:p-8 bg-white grid grid-cols-1 xl:grid-cols-12 gap-8 border-b border-slate-100 transition-all duration-300">

                {/* LEFT WING: Operational Rules Checklist Deck */}
                <div className="xl:col-span-5 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                      <CircleDot size={10} className="text-blue-500" /> Included In Full Plan:
                    </h4>
                    <ul className="space-y-3.5">
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold shrink-0">✦</span>
                        <span><strong>Self Purchase Generation Bonus:</strong> 10%.</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold shrink-0">✦</span>
                        <span><strong>Level 1:</strong> Minimum of 3 distribute sales required to pass. Generates a 10% bonus (Rs. 180 on 3 sales, scales to Rs. 600 on 10 sales).</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold shrink-0">✦</span>
                        <span><strong>Level 2:</strong> Accessible upon making 3 or more sales. Generates a 7% bonus (Rs. 180 on 3 sales, scales up to Rs. 420 on 10 sales).</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold shrink-0">✦</span>
                        <span><strong>Level 3:</strong> Generates a 5% system bonus structure.</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold shrink-0">✦</span>
                        <span><strong>Levels 4 & 5:</strong> Generates a stable 4% distribution bonus.</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold shrink-0">✦</span>
                        <span><strong>Levels 6 & 7:</strong> Generates a 3% tier bonus payout.</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold shrink-0">✦</span>
                        <span><strong>Levels 8, 9 & 10:</strong> Tailored with a 2% bonus distribution framework.</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold shrink-0">✦</span>
                        <span><strong>Levels 11 & 12:</strong> Concludes with a 1% network generation incentive.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Network Tree Flowchart Architecture Slots */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-4">Network Tree Matrix Previews</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center min-h-[140px]">
                        <img
                          src="/photos/Plan slide-1.png"
                          alt="Direct Matrix Architecture"
                          className="max-h-[110px] w-auto object-contain mix-blend-multiply"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Direct Horizon Structure</span>';
                          }}
                        />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center min-h-[140px]">
                        <img
                          src="/photos/Plan slide-2.png"
                          alt="Compulsory Downline Layer Architecture"
                          className="max-h-[110px] w-auto object-contain mix-blend-multiply"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">3-Leg Compulsory Hierarchy</span>';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT WING: Dynamic Table Ledger Matrix Layout Grid */}
                <div className="xl:col-span-7 flex flex-col justify-between gap-6">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 text-center">
                      <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-widest">Level Matrix & Bonuses Breakdown Table</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                            <th className="px-4 py-2 text-center">Level</th>
                            <th className="px-4 py-2">Distributor Tree</th>
                            <th className="px-4 py-2">Business Vol (BV)</th>
                            <th className="px-4 py-2 text-center">Payout %</th>
                            <th className="px-4 py-2 text-right">Income Generated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                          <tr className="bg-blue-50/40 text-slate-900 font-semibold border-b border-slate-200">
                            <td className="px-4 py-2 text-center font-bold text-[#3B5998]">Self</td>
                            <td className="px-4 py-2 text-slate-400">—</td>
                            <td className="px-4 py-2 font-mono">600 BV</td>
                            <td className="px-4 py-2 text-center text-blue-700 font-bold">10%</td>
                            <td className="px-4 py-2 text-right font-mono text-blue-700 font-bold">₹60</td>
                          </tr>
                          {matrixData.map((row) => (
                            <tr key={row.level} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-1.5 text-center font-bold bg-slate-50/40 border-r border-slate-100">{row.level}</td>
                              <td className="px-4 py-1.5 font-mono">{row.distributor}</td>
                              <td className="px-4 py-1.5 font-mono text-slate-500">{row.bv}</td>
                              <td className="px-4 py-1.5 text-center text-emerald-600 font-bold">{row.pct}</td>
                              <td className="px-4 py-1.5 text-right font-mono font-bold text-slate-900">{row.income}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Marketing Flyers Graphic Banner Card */}
                  <div className="bg-gradient-to-r from-red-50 to-blue-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-md uppercase tracking-wider">Compulsory Rule Set</span>
                      <h5 className="text-xs font-black text-slate-800 mt-1.5 uppercase tracking-tight">First Level 3-Leg Compulsory Framework</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Next time entry targets respond adaptively based upon individual structural product selection parameters.</p>
                    </div>
                    <div className="w-24 h-16 shrink-0 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1 shadow-sm">
                      <img
                        src="/photos/marketing_chart.jpg"
                        alt="Dream Purchase Plan Table Flyer"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<span class="text-[9px] font-black text-red-600 uppercase text-center leading-none">DREAM TIER CHART</span>';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Dream Plan Accordion & Activation Control Footer ── */}
            <div className="flex flex-col border-t border-slate-100">
              <button
                onClick={() => setShowDreamDetails(!showDreamDetails)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 py-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 border-b border-slate-200 transition-colors shadow-sm"
              >
                {showDreamDetails ? (
                  <>Show Less Matrix Data <ChevronUp size={14} /></>
                ) : (
                  <>Show Full 12-Level Matrix & Bonus Data <ChevronDown size={14} /></>
                )}
              </button>

              {/* ── CONDITIONAL FOOTER: Active badge OR Get Started button ── */}
              <div className="p-4 bg-white flex justify-end">
                {loadingPlan ? (
                  // Skeleton while loading
                  <div className="w-full h-12 bg-slate-100 animate-pulse rounded-xl" />
                ) : isDreamActive ? (
                  // ── ACTIVE STATE ──
                  <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 py-3.5 px-6 rounded-xl">
                    <BadgeCheck size={16} className="text-emerald-500 shrink-0" />
                    <span className="font-black text-xs uppercase tracking-widest">Plan Active — Dream Plan Enrolled</span>
                  </div>
                ) : (
                  // ── DEFAULT STATE ──
                  <button
                    onClick={() => router.push("/dream-purchase")}
                    className="w-full bg-[#2B4C8C] hover:bg-blue-700 text-white py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
                  >
                    Get Started & Select Products
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
             2. BINARY PLAN SPECIFICATION VIEWPORT
             ────────────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative transition-all duration-300">

            <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-br from-white via-white to-indigo-50/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Binary Plan</h2>
                    {/* ── ACTIVE BADGE (only shown when binary plan is active) ── */}
                    {isBinaryActive && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        <BadgeCheck size={12} className="text-emerald-500" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Unlock compounding dual-team network capabilities. Apply online through our web application form to get started instantly.
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 text-[#3B5998] rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
                  <Network size={24} />
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-4xl font-extrabold text-[#3B5998] tracking-tight">Free Entry</span>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  Standard Ratio Conversion: 1 S.P. = 600 B.V.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>No membership fee required to join the binary structure track.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Activate your placement ID contextually by purchasing 1 S.P. product once.</span>
                </div>
              </div>
            </div>

            {showBinaryDetails && (
              <div className="p-6 md:p-8 bg-white grid grid-cols-1 xl:grid-cols-12 gap-8 border-b border-slate-100 transition-all duration-300">

                <div className="xl:col-span-6 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                      <CircleDot size={10} className="text-indigo-600" /> Included In Full Binary Plan:
                    </h4>
                    <ul className="space-y-3.5">
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-indigo-600 font-bold shrink-0">✦</span>
                        <span><strong>Initial Matching Criteria:</strong> Requires 2 SP (Left) : 1 SP (Right) OR 1 SP (Left) : 2 SP (Right).</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-indigo-600 font-bold shrink-0">✦</span>
                        <span><strong>Continuous Payout Cycles:</strong> Earn Rs. 150 on initial matching, and continuous Rs. 150 on every subsequent 1 S.P. : 1 S.P. match.</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-indigo-600 font-bold shrink-0">✦</span>
                        <span><strong>Daily Capping Limits:</strong> Earn up to a maximum bonus of Rs. 4,500 per day (At 30 SP : 30 SP network alignment status).</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-indigo-600 font-bold shrink-0">✦</span>
                        <span><strong>Unlock Requirements:</strong> Requires at least 1 direct sponsor on the Left leg and 1 direct sponsor on the Right leg to unlock your matching bonuses.</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-indigo-600 font-bold shrink-0">✦</span>
                        <span><strong>Monthly Club Pool:</strong> Access 5% of the company's monthly joining turnover by maintaining 5 sponsors on each side and achieving a 350 S.P. matching bonus status.</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <span className="text-indigo-600 font-bold shrink-0">✦</span>
                        <span><strong>Powerleg Continuity Logic:</strong> Powerleg system configuration with a robust Carry Forward logic tracking mechanism.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="xl:col-span-6 flex flex-col justify-between gap-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Binary Dual-Leg Matching Tree Architecture</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[180px]">
                      <div className="flex flex-col items-center space-y-4 w-full max-w-sm">
                        <div className="bg-[#2B4C8C] text-white text-xs font-black px-4 py-1.5 rounded-lg shadow-sm tracking-wide uppercase">YOU</div>
                        <div className="w-1/2 h-0.5 bg-slate-300 relative">
                          <div className="absolute top-0 left-0 w-0.5 h-3 bg-slate-300"></div>
                          <div className="absolute top-0 right-0 w-0.5 h-3 bg-slate-300"></div>
                        </div>
                        <div className="flex justify-between w-full px-4">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="bg-slate-200 border border-slate-300 text-slate-700 text-[11px] font-mono font-bold px-3 py-1 rounded-md">1 S.P. <span className="text-[9px] text-slate-400 block text-center">(Left)</span></div>
                            <div className="w-0.5 h-3 bg-slate-300"></div>
                            <div className="bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono font-bold px-3 py-1 rounded-md">1 S.P.</div>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="bg-slate-200 border border-slate-300 text-slate-700 text-[11px] font-mono font-bold px-3 py-1 rounded-md">1 S.P. <span className="text-[9px] text-slate-400 block text-center">(Right)</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 mb-2">
                      <FileText size={14} className="text-amber-500" /> Required Documentation Placeholder
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      To complete account validation matching cycles, ensure profile uploads contain a valid <strong>PAN Card, National ID Proof, Bank Account Passbook/Copy, Passport Size Photograph, and Active Mobile Number</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col border-t border-slate-100">
              <button
                onClick={() => setShowBinaryDetails(!showBinaryDetails)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 py-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 border-b border-slate-200 transition-colors shadow-sm"
              >
                {showBinaryDetails ? (
                  <>Show Less Binary Specifications <ChevronUp size={14} /></>
                ) : (
                  <>Show Full Binary Track Rules & Capping Data <ChevronDown size={14} /></>
                )}
              </button>

              {/* ── CONDITIONAL FOOTER: Active badge OR Activate button ── */}
              <div className="p-4 bg-white flex justify-end">
                {loadingPlan ? (
                  // Skeleton while loading
                  <div className="w-full h-12 bg-slate-100 animate-pulse rounded-xl" />
                ) : isBinaryActive ? (
                  // ── ACTIVE STATE ──
                  <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 py-3.5 px-6 rounded-xl">
                    <BadgeCheck size={16} className="text-emerald-500 shrink-0" />
                    <span className="font-black text-xs uppercase tracking-widest">Plan Active — Binary Plan Enrolled</span>
                  </div>
                ) : (
                  // ── DEFAULT STATE ──
                  <button
                    onClick={() => handleActivation('binary-plan')}
                    className="w-full bg-[#3B5998] hover:bg-blue-700 text-white py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
                  >
                    Activate Binary Target & Shop
                  </button>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
