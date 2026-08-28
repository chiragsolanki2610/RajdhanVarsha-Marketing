"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, User } from "lucide-react";
import PickupCenterSidebar from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";

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