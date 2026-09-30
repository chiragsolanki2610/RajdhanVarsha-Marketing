// app/product-shop-formobile/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, History, ChevronRight } from 'lucide-react';
import LoginTopbar from "@/components/loginTopbar";
import Sidebar from "@/components/Sidebar";

export default function MobileProductShopHub() {
  const options = [
    {
      icon: ShoppingBag,
      label: 'Shop Product',
      desc: 'Browse and purchase available products',
      path: '/shop/products',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: History,
      label: 'Order History',
      desc: 'View your past orders and their status',
      path: '/shop/order-history',
      color: 'bg-blue-50 text-blue-600',
    },
  ];

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top bar */}
        <LoginTopbar pageTitle="Product Shop" />

        <div className="w-full min-h-screen bg-gray-50 p-4 pb-24 md:hidden animate-fadeIn">
          <header className="mb-6 mt-2">
            <h1 className="text-xl font-bold text-gray-800">Product Shop</h1>
            <p className="text-xs text-gray-500 mt-0.5">Shop products or check your order history</p>
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
      </div>
    </div>
  );
}