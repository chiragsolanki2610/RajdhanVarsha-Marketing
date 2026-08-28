'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShoppingCart,
  Package,
  History,
  LogOut,
  ChevronLeft,
} from 'lucide-react';

interface PucInfo {
  pucId: string;
  username: string;
  fullName: string;
  centerName: string;
  token: string;
}

function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: Home,         label: 'Home',    path: '/pickup-center/dashboard' },
    { icon: ShoppingCart, label: 'Sell',    path: '/pickup-center/sell' },
    { icon: Package,      label: 'Manage Inventory',  path: '/pickup-center/manage-inventory' },
    { icon: History,      label: 'History', path: '/pickup-center/history' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      {navItems.map(({ icon: Icon, label, path }) => {
        const isActive = pathname === path || (path !== '/pickup-center/dashboard' && pathname.startsWith(path));
        return (
          <Link
            key={label}
            href={path}
            className="flex flex-col items-center gap-0.5 min-w-[48px] py-1 px-2 rounded-xl transition-colors duration-150"
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.2 : 1.6}
              className={isActive ? 'text-[#3B5998]' : 'text-gray-400'}
            />
            <span
              className={`text-[10px] font-medium tracking-tight leading-none ${
                isActive ? 'text-[#3B5998] font-semibold' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            {isActive && (
              <span className="mt-0.5 w-1 h-1 rounded-full inline-block bg-[#3B5998]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function PickupCenterSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [pucData, setPucData] = useState<PucInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pucInfo');
      if (raw) {
        setPucData(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Failed parsing pucInfo from localStorage:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getInitials = (nameString: string | undefined) => {
    if (!nameString) return 'PC';
    const parts = nameString.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'PC';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem('pucToken');
    localStorage.removeItem('pucInfo');
    router.replace('/pickup-center');
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <div className="relative hidden md:flex shrink-0 font-sans select-none z-50 bg-[#3B5998] h-screen sticky top-0">

        {/* Collapse / Expand Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute top-4 z-50 bg-[#3B5998] hover:bg-blue-700 text-white p-1 rounded-full border border-blue-400/40 shadow-md transition-all duration-300 ${
            isOpen ? '-right-3' : '-right-3 rotate-180'
          }`}
          title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          <ChevronLeft size={16} />
        </button>

        {/* ── Main sidebar column ── */}
        <div className={`bg-[#3B5998] text-white flex flex-col h-full transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-16 items-center'}`}>

          {/* ── Logo Block ── */}
          <div className={`w-full flex items-center box-border transition-all duration-300 shrink-0 h-20 ${
            isOpen
              ? 'bg-white text-gray-800 px-3 border-b border-gray-200 gap-2'
              : 'bg-transparent text-white px-2 justify-center border-b border-blue-400/30'
          }`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-sm overflow-hidden bg-gray-100">
              <img src="/photos/web_logo.jpg" alt="logo" className="w-full h-full object-cover" />
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0 animate-fadeIn pl-0.5 flex flex-col items-end justify-center max-w-max">
                <h2 className="font-black text-[18px] tracking-tight whitespace-nowrap leading-tight text-right w-full">
                  <span className="text-red-600">RAJ </span>
                  <span className="text-[#3B5998]">DHANVARSHA</span>
                </h2>
                <p className="text-[11px] text-red-600 font-black tracking-wider leading-none mt-0.5 text-right w-full">
                  MARKETING
                </p>
              </div>
            )}
          </div>

          {/* ── Scrollable middle section ── */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {/* ── Profile Block ── */}
            <div className={`w-full mt-6 ${isOpen ? 'px-4 mb-6' : 'px-2 mb-4 flex justify-center'}`}>
              <div
                className={`w-full flex items-center rounded-xl border transition-all bg-blue-900/30 border-blue-400/20 text-white ${
                  isOpen ? 'p-3 gap-3' : 'p-0 justify-center w-10 h-10 rounded-full'
                }`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-inner bg-blue-600 text-white">
                  {isLoading ? '...' : getInitials(pucData?.fullName)}
                </div>

                {isOpen && (
                  <div className="truncate w-full flex flex-col justify-center">
                    {isLoading ? (
                      <div className="space-y-2 animate-pulse w-24">
                        <div className="h-3 rounded bg-blue-400/40"></div>
                        <div className="h-2 rounded w-2/3 bg-blue-400/20"></div>
                      </div>
                    ) : (
                      <div className="truncate animate-fadeIn text-left">
                        <h3 className="font-semibold text-sm truncate uppercase text-white">
                          {pucData?.centerName || 'PICKUP CENTER'}
                        </h3>
                        <p className="text-[10px] flex items-center gap-1 font-mono text-green-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                          ID: {pucData?.pucId || 'RDPUC0000'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Nav Menu ── */}
            <div className={`w-full space-y-6 ${isOpen ? 'px-4' : 'px-2'}`}>
              <div>
                {isOpen && (
                  <p className="text-[10px] uppercase font-bold text-blue-200/60 tracking-widest mb-2 pl-2 animate-fadeIn">
                    Menu Bar
                  </p>
                )}
                <nav className="space-y-1 w-full">

                  {/* Home */}
                  <Link
                    href="/pickup-center/dashboard"
                    className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${
                      isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'
                    } ${
                      pathname === '/pickup-center/dashboard'
                        ? 'bg-white text-blue-900 font-bold shadow-md'
                        : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
                    }`}
                  >
                    <Home size={16} className={pathname === '/pickup-center/dashboard' ? 'text-blue-600' : 'text-blue-200'} />
                    {isOpen && <span className="truncate animate-fadeIn">Home</span>}
                  </Link>

                  {/* Sell */}
                  <Link
                    href="/pickup-center/sell"
                    className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${
                      isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'
                    } ${
                      pathname === '/pickup-center/sell'
                        ? 'bg-white text-blue-900 font-bold shadow-md'
                        : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
                    }`}
                  >
                    <ShoppingCart size={16} className={pathname === '/pickup-center/sell' ? 'text-blue-600' : 'text-blue-200'} />
                    {isOpen && <span className="truncate animate-fadeIn">Sell</span>}
                  </Link>

                  {/* Manage Inventory */}
                  <Link
                    href="/pickup-center/manage-inventory"
                    className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${
                      isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'
                    } ${
                      pathname === '/pickup-center/manage-inventory'
                        ? 'bg-white text-blue-900 font-bold shadow-md'
                        : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
                    }`}
                  >
                    <Package size={16} className={pathname === '/pickup-center/manage-inventory' ? 'text-blue-600' : 'text-blue-200'} />
                    {isOpen && <span className="truncate animate-fadeIn">Manage Inventory</span>}
                  </Link>

                  {/* Order History */}
                  <Link
                    href="/pickup-center/history"
                    className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${
                      isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'
                    } ${
                      pathname === '/pickup-center/history'
                        ? 'bg-white text-blue-900 font-bold shadow-md'
                        : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
                    }`}
                  >
                    <History size={16} className={pathname === '/pickup-center/history' ? 'text-blue-600' : 'text-blue-200'} />
                    {isOpen && <span className="truncate animate-fadeIn">Order History</span>}
                  </Link>

                </nav>
              </div>
            </div>

            <div className="h-4" />
          </div>

          {/* ── Logout ── */}
          <div className={`w-full shrink-0 ${isOpen ? 'px-4 pb-4' : 'px-2 pb-4'}`}>
            <button
              type="button"
              title={!isOpen ? 'Log Out' : undefined}
              onClick={handleLogout}
              className={`w-full flex items-center text-xs font-medium text-blue-100 hover:bg-red-600/20 hover:text-red-200 rounded-lg transition-colors duration-150 border-t border-blue-400/20 pt-4 ${
                isOpen ? 'px-3 py-3 gap-3' : 'p-2.5 justify-center'
              }`}
            >
              <LogOut size={16} />
              {isOpen && <span className="animate-fadeIn">Log Out</span>}
            </button>
          </div>

        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <MobileBottomNav />
    </>
  );
}