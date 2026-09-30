"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, User } from "lucide-react";
import PickupCenterSidebar from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com";

interface PucInfo {
  pucId: string;
  username: string;
  fullName: string;
  centerName: string;
  token: string;
}

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PickupCenterSidebar />

      <div className="flex-1">
        <PickupCenterTopbar title="Dashboard" operatorName={puc.fullName} />

        <main className="mx-auto max-w-5xl space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
                <User size={14} /> Center ID
              </div>
              <p className="mt-2 text-xl font-bold text-blue-700">{puc.pucId}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
                <User size={14} /> Operator
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900">{puc.fullName}</p>
              <p className="text-xs text-gray-500">@{puc.username}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
                <Package size={14} /> Status
              </div>
              <p className="mt-2 text-lg font-semibold text-green-600">Active</p>
            </div>
          </div>

          {/* Store open / close */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-gray-900">Store Status</h2>
              <p className="mt-1 text-sm text-gray-500">
                {storeOpen === null
                  ? "Loading..."
                  : storeOpen
                  ? "Your store is Open — customers can select your pickup center and place orders."
                  : "Your store is Closed — customers will see your pickup center as currently offline."}
              </p>
              {storeError && <p className="mt-1 text-xs text-red-500">{storeError}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`text-sm font-semibold ${storeOpen ? "text-green-600" : "text-gray-500"}`}>
                {storeOpen === null ? "" : storeOpen ? "Open" : "Closed"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!!storeOpen}
                disabled={storeOpen === null || toggling}
                onClick={toggleStore}
                className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${
                  storeOpen ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                    storeOpen ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-base font-bold text-gray-900">Welcome</h2>
            <p className="text-sm text-gray-500">
              This is your pickup center dashboard. Order pickup/delivery
              management tools will appear here.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}