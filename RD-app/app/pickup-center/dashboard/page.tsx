"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  ClipboardList,
  FileText,
  History,
  Layers,
  MapPin,
  Package,
  ShoppingCart,
  Store,
  User,
  Wallet,
  ChevronRight,
} from "lucide-react";
import PickupCenterSidebar from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com";
const BRAND = "#3B5998";

interface PucInfo {
  pucId: string;
  username: string;
  fullName: string;
  centerName: string;
  token: string;
}

// Shortcuts shown on the dashboard (same routes as the sidebar)
const QUICK_ACTIONS = [
  { label: "Sell", hint: "New sale", href: "/pickup-center/sell", icon: ShoppingCart, tint: "bg-blue-50 text-blue-600" },
  { label: "Plan Manager", hint: "Activate a plan", href: "/pickup-center/plan-manager", icon: Layers, tint: "bg-indigo-50 text-indigo-600" },
  { label: "Order Requests", hint: "Pending orders", href: "/pickup-center/order-request", icon: FileText, tint: "bg-amber-50 text-amber-600" },
  { label: "Sell History", hint: "Past sales", href: "/pickup-center/sell-history", icon: ClipboardList, tint: "bg-emerald-50 text-emerald-600" },
  { label: "Inventory", hint: "Manage stock", href: "/pickup-center/manage-inventory", icon: Package, tint: "bg-violet-50 text-violet-600" },
  { label: "Return", hint: "Return products", href: "/pickup-center/return", icon: History, tint: "bg-rose-50 text-rose-600" },
  { label: "Wallet", hint: "Balance & top-up", href: "/pickup-center/wallet", icon: Wallet, tint: "bg-sky-50 text-sky-600" },
  { label: "Profile", hint: "Center details", href: "/pickup-center/profile", icon: User, tint: "bg-slate-100 text-slate-600" },
];

export default function PickupCenterDashboard() {
  const router = useRouter();
  const [puc, setPuc] = useState<PucInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [storeOpen, setStoreOpen] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("pucInfo");
    const token = localStorage.getItem("pucToken");

    if (!raw || !token) {
      router.replace("/pickup-center");
      return;
    }

    try {
      setPuc(JSON.parse(raw));
    } catch {
      router.replace("/pickup-center");
      return;
    } finally {
      setChecking(false);
    }
  }, [router]);

  // Load current open/close state
  useEffect(() => {
    if (!puc) return;
    const token = localStorage.getItem("pucToken");
    fetch(`${BASE_URL}/api/PickupCenter/store-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setStoreOpen(d.status === "Open"))
      .catch(() => setStoreError("Could not load store status."));
  }, [puc]);

  const toggleStore = async () => {
    if (storeOpen === null || toggling) return;
    const next = !storeOpen;
    setToggling(true);
    setStoreError(null);
    try {
      const token = localStorage.getItem("pucToken");
      const res = await fetch(`${BASE_URL}/api/PickupCenter/store-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: next ? "Open" : "Closed" }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setStoreOpen(d.status === "Open");
    } catch {
      setStoreError("Could not update store status. Please try again.");
    } finally {
      setToggling(false);
    }
  };

  if (checking || !puc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  const firstName = (puc.fullName || "").trim().split(/\s+/)[0] || "Operator";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PickupCenterSidebar />

      {/* pb-24 keeps content clear of the fixed bottom nav on mobile */}
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <PickupCenterTopbar title="Dashboard" operatorName={puc.fullName} />

        <main className="mx-auto w-full max-w-5xl space-y-5 p-4 md:space-y-6 md:p-6">
          {/* ── Hero: who / which center ─────────────────────────────── */}
          <section
            className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg md:p-7"
            style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #2B4C8C 60%, #1E3A6E 100%)` }}
          >
            {/* soft decorative circles */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-14 right-10 h-32 w-32 rounded-full bg-white/5" />

            <div className="relative">
              <p className="text-xs font-medium text-blue-100">Welcome back,</p>
              <h1 className="mt-0.5 truncate text-2xl font-extrabold tracking-tight md:text-3xl">
                {firstName}
              </h1>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-sm ring-1 ring-white/15">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight">
                    {puc.centerName || "Pickup Center"}
                  </p>
                  <p className="mt-0.5 text-xs text-blue-100">
                    Operator: {puc.fullName} · @{puc.username}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 font-mono text-xs font-bold tracking-wide text-[#2B4C8C]">
                  {puc.pucId}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
                  <BadgeCheck size={13} /> Active
                </span>
              </div>
            </div>
          </section>

          {/* ── Store open / close ───────────────────────────────────── */}
          <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  storeOpen ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Store size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-gray-900 md:text-base">Store Status</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                  {storeOpen === null ? (
                    <span className="text-gray-400">Loading...</span>
                  ) : (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        {storeOpen && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        )}
                        <span
                          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                            storeOpen ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        />
                      </span>
                      <span className={storeOpen ? "text-emerald-600" : "text-gray-500"}>
                        {storeOpen ? "Open" : "Closed"}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={!!storeOpen}
                aria-label="Toggle store open or closed"
                disabled={storeOpen === null || toggling}
                onClick={toggleStore}
                className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  storeOpen ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                    storeOpen ? "left-[30px]" : "left-1"
                  }`}
                />
              </button>
            </div>

            <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
              {storeOpen === null
                ? "Checking your store status..."
                : storeOpen
                ? "Customers can select your pickup center and place orders."
                : "Customers will see your pickup center as currently offline."}
            </p>
            {storeError && <p className="mt-2 text-xs text-red-500">{storeError}</p>}
          </section>

          {/* ── Quick actions ────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-gray-400">
              Quick actions
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {QUICK_ACTIONS.map(({ label, hint, href, icon: Icon, tint }) => (
                <Link
                  key={label}
                  href={href}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition active:scale-[0.98] hover:border-[#3B5998]/40 hover:shadow-md"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
                    <Icon size={20} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-gray-900">{label}</p>
                  <p className="mt-0.5 flex items-center justify-between text-xs text-gray-400">
                    <span className="truncate">{hint}</span>
                    <ChevronRight
                      size={14}
                      className="shrink-0 transition group-hover:translate-x-0.5 group-hover:text-[#3B5998]"
                    />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
