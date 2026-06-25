// app/network/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { UserPlus, GitBranch, Network, ChevronRight } from 'lucide-react';

export default function MobileNetworkHub() {
  const options = [
    { icon: UserPlus, label: 'Team Detail', desc: 'View direct downline matrix records', path: '/network/team-detail', color: 'bg-emerald-50 text-emerald-600' },
    { icon: GitBranch, label: 'Dream Tree View', desc: 'Trace generation leveling distribution structure', path: '/dream-tree-view', color: 'bg-blue-50 text-blue-600' },
    { icon: Network, label: 'Binary View', path: '/network/binary-view', desc: 'Manage left/right spillover sales legs placement', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 pb-24 md:hidden animate-fadeIn">
      <header className="mb-6 mt-2">
        <h1 className="text-xl font-bold text-gray-800">My Network Area</h1>
        <p className="text-xs text-gray-500 mt-0.5">Select real-time genealogy configurations below</p>
      </header>

      <div className="space-y-3">
        {options.map((opt, i) => (
          <Link 
            key={i} 
            href={opt.path}
            className="flex items-center justify-between w-full p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform duration-100"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${opt.color}`}>
                <opt.icon size={22} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm text-gray-800">{opt.label}</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}