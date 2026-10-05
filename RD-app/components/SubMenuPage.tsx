"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import PickupCenterSidebar, { NAV_GROUPS } from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";

const BRAND = "#3B5998";

// Short helper text shown under each option
const DESCRIPTIONS: Record<string, string> = {
  "/pickup-center/sell": "Create a new sale for a customer",
  "/pickup-center/plan-manager": "Activate a Dream or Binary Plan for a member",
  "/pickup-center/order-request": "View and handle incoming order requests",
  "/pickup-center/manage-inventory": "Check your stock and buy from the company",
  "/pickup-center/return": "Process product returns",
};

export default function SubMenuPage({ groupKey }: { groupKey: string }) {
  const router = useRouter();
  const [operatorName, setOperatorName] = useState("Operator");
  const [checking, setChecking] = useState(true);

  // Same auth check the other pickup-center pages use
  useEffect(() => {
    const raw = localStorage.getItem("pucInfo");
    const token = localStorage.getItem("pucToken");

    if (!raw || !token) {
      router.replace("/pickup-center");
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setOperatorName(parsed?.fullName || parsed?.username || "Operator");
    } catch {
      router.replace("/pickup-center");
      return;
    } finally {
      setChecking(false);
    }
  }, [router]);

  const group = NAV_GROUPS.find((g) => g.key === groupKey);

  if (checking || !group) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  const GroupIcon = group.icon;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PickupCenterSidebar />

      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <PickupCenterTopbar title={group.label} operatorName={operatorName} />

        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          {/* Banner */}
          <div
            className="mb-6 flex items-center gap-4 rounded-2xl p-5 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #2d4373)` }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <GroupIcon size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{group.label}</h1>
              <p className="text-xs text-blue-100">
                {group.items.length} options · choose one to continue
              </p>
            </div>
          </div>

          {/* Sub options */}
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                href={path}
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#3B5998]/50 hover:shadow-md active:scale-[0.98]"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  {DESCRIPTIONS[path] && (
                    <p className="mt-0.5 text-xs text-slate-500">{DESCRIPTIONS[path]}</p>
                  )}
                </div>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#3B5998]"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}