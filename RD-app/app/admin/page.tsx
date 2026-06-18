'use client';

import Link from 'next/link';
import { CheckSquare, Banknote, MapPin, ShieldCheck, ChevronRight } from 'lucide-react';
// ⚠️ Adjust these two import paths/alias if your project doesn't use the "@/components" alias
import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar';

const adminOptions = [
  {
    icon: CheckSquare,
    label: 'KYC Requests',
    description: 'Review and approve pending KYC verification submissions.',
    path: '/admin/kyc-requests',
  },
  {
    icon: Banknote,
    label: 'Withdrawal Requests',
    description: 'Approve or reject member withdrawal requests.',
    path: '/admin/withdrawal-requests',
  },
  {
    icon: MapPin,
    label: 'Pickup Center Requests',
    description: 'Manage new pickup center registration requests.',
    path: '/admin/pickup-center-requests',
  },
];

export default function AdminPanelPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar (renders desktop sidebar + mobile bottom nav) ── */}
      <Sidebar />

      {/* ── Right side: Topbar + Page content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <LoginTopbar />

        <main className="flex-1 pb-24 md:pb-10">
          {/* ── Header ── */}
          <div className="bg-[#3B5998] px-5 pt-8 pb-10 md:px-8 md:pt-10 md:pb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/90 flex items-center justify-center shadow-md shrink-0">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">Admin Panel</h1>
                <p className="text-blue-100 text-xs font-medium">Manage requests across the platform</p>
              </div>
            </div>
          </div>

          {/* ── Options List ── */}
          <div className="px-5 md:px-8 -mt-5">
            <div className="space-y-3 max-w-2xl mx-auto">
              {adminOptions.map(({ icon: Icon, label, description, path }) => (
                <Link
                  key={path}
                  href={path}
                  className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-red-200 hover:shadow-md active:scale-[0.99] transition-all duration-150 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                    <Icon size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-800">{label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-300 group-hover:text-red-400 transition-colors shrink-0"
                  />
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}