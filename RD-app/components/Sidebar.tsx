'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Layers,      
  ShoppingBag, // Used for the main Product dropdown
  History,     // For Order History
  Users,        
  Wallet,       
  LogOut,
  ChevronLeft,
  ChevronDown,  
  UserPlus,     
  GitBranch,    
  Network       
} from 'lucide-react';

interface UserData {
  name: string;
  memberId: string;
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: Home,        label: 'Home',    path: '/dashboard' },
    { icon: Layers,      label: 'Plans',   path: '/plan' },
    { icon: ShoppingBag, label: 'Product', path: '/shop' }, 
    { icon: Users,       label: 'Network', path: '/network' }, 
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      {navItems.map(({ icon: Icon, label, path }) => {
        const isActive = pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
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
              <span className="mt-0.5 w-1 h-1 rounded-full bg-[#3B5998] inline-block" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isNetworkOpen, setIsNetworkOpen] = useState(false); 
  const [isProductOpen, setIsProductOpen] = useState(false); 
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Determine if the profile context tab is active
  const isProfileActive = pathname === '/profile';

  const loadUserFromStorage = () => {
    try {
      const profileString = localStorage.getItem('userProfile');
      const alternateUserString = localStorage.getItem('user');
      const rememberedId = localStorage.getItem('rememberUserId');

      if (profileString) {
        const profileData = JSON.parse(profileString);
        setUserData({
          name: profileData.name || 'DHARAMVEER',
          memberId: profileData.userId || profileData.memberId || 'N/A'
        });
      } else if (alternateUserString) {
        const alternateData = JSON.parse(alternateUserString);
        setUserData({
          name: alternateData.name || 'DHARAMVEER',
          memberId: alternateData.userId || alternateData.memberId || rememberedId || 'N/A'
        });
      } else if (rememberedId) {
        setUserData({
          name: 'DHARAMVEER',
          memberId: rememberedId
        });
      } else {
        setUserData({ name: 'GUEST USER', memberId: 'N/A' });
      }
    } catch (error) {
      console.error("Error reading authentication context:", error);
      setUserData({ name: 'GUEST USER', memberId: 'N/A' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserFromStorage();
    window.addEventListener('storage', loadUserFromStorage);
    const loopWorker = setInterval(loadUserFromStorage, 1000);

    return () => {
      window.removeEventListener('storage', loadUserFromStorage);
      clearInterval(loopWorker);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (pathname.startsWith('/network')) {
        setIsNetworkOpen(true);
        setIsProductOpen(false);
      } else if (pathname.startsWith('/shop')) {
        setIsProductOpen(true);
        setIsNetworkOpen(false);
      }
    }
  }, [pathname, isOpen]);

  const getInitials = (nameString: string | undefined) => {
    if (!nameString || nameString === 'GUEST USER') return 'GU';
    const parts = nameString.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const networkSubItems = [
    { icon: UserPlus, label: 'Team Detail', path: '/network/team-detail' },
    { icon: GitBranch, label: 'Dream Tree View', path: '/network/dream-tree' },
    { icon: Network, label: 'Binary View', path: '/network/binary-view' },
  ];

  const productSubItems = [
    { icon: ShoppingBag, label: 'Shop Product', path: '/shop/products' },
    { icon: History, label: 'Order History', path: '/shop/order-history' },
  ];

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="relative hidden md:flex h-screen shrink-0 font-sans select-none z-40 bg-[#3B5998]">
        <button 
          onClick={() => {
            setIsOpen(!isOpen);
            if (isOpen) {
              setIsNetworkOpen(false);
              setIsProductOpen(false);
            }
          }}
          className={`absolute top-4 z-50 bg-[#3B5998] hover:bg-blue-700 text-white p-1 rounded-full border border-blue-400/40 shadow-md transition-all duration-300 ${
            isOpen ? '-right-3' : '-right-3 rotate-180'
          }`}
          title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <ChevronLeft size={16} />
        </button>

        <div className={`bg-[#3B5998] text-white flex flex-col justify-between transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-16 items-center'}`}>
          <div className="w-full flex flex-col items-center">
            {/* Logo block */}
            <div className={`w-full flex items-center box-border transition-all duration-300 h-20 ${isOpen ? 'bg-white text-gray-800 px-3 border-b border-gray-200 mb-6 gap-2' : 'bg-transparent text-white px-2 justify-center border-b border-blue-400/30 mb-4'}`}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-sm overflow-hidden bg-gray-100">
                <img src="/photos/web_logo.jpg" alt="logo" className="w-full h-full object-cover" />
              </div>
              {isOpen && (
                <div className="flex-1 min-w-0 animate-fadeIn pl-0.5">
                  <h2 className="font-extrabold text-[13px] tracking-tight whitespace-nowrap leading-tight">
                    <span className="text-red-600">RAJ </span>
                    <span className="text-[#3B5998]">DHANVARSHA</span>
                  </h2>
                  <p className="text-[10px] text-red-600 font-bold tracking-wider leading-none mt-0.5">MARKETING</p>
                </div>
              )}
            </div>

            {/* Profile Context Block (Dynamically Highlighted) */}
            <div className={`w-full ${isOpen ? 'px-4 mb-6' : 'px-2 mb-4 flex justify-center'}`}>
              <Link 
                href="/profile"
                title={!isOpen ? "View Profile" : undefined}
                className={`w-full flex items-center rounded-xl border transition-all ${
                  isOpen ? 'p-3 gap-3' : 'p-0 justify-center w-10 h-10 rounded-full'
                } ${
                  isProfileActive 
                    ? 'bg-white border-white shadow-md text-blue-900 font-bold' 
                    : 'bg-blue-900/30 hover:bg-blue-900/50 border-blue-400/20 text-white'
                }`}
              >
                {/* Avatar Badge setup */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-inner ${
                  isProfileActive ? 'bg-[#3B5998] text-white' : 'bg-blue-600 text-white'
                }`}>
                  {loading ? '...' : getInitials(userData?.name)}
                </div>
                
                {isOpen && (
                  <div className="truncate w-full flex flex-col justify-center">
                    {loading ? (
                      <div className="space-y-2 animate-pulse w-24">
                        <div className={`h-3 rounded ${isProfileActive ? 'bg-blue-200' : 'bg-blue-400/40'}`}></div>
                        <div className={`h-2 rounded w-2/3 ${isProfileActive ? 'bg-blue-100' : 'bg-blue-400/20'}`}></div>
                      </div>
                    ) : (
                      <div className="truncate animate-fadeIn text-left">
                        <h3 className={`font-semibold text-sm truncate uppercase ${
                          isProfileActive ? 'text-gray-800 font-bold' : 'text-white'
                        }`}>
                          {userData?.name}
                        </h3>
                        <p className={`text-[10px] flex items-center gap-1 font-mono ${
                          isProfileActive ? 'text-[#3B5998]/80 font-semibold' : 'text-green-300'
                        }`}>
                          {!isProfileActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                          )}
                          ID: {userData?.memberId}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            </div>

            {/* Core Operational Menu Links */}
            <div className={`w-full space-y-6 ${isOpen ? 'px-4' : 'px-2'}`}>
              <div>
                {isOpen && <p className="text-[10px] uppercase font-bold text-blue-200/60 tracking-widest mb-2 pl-2 animate-fadeIn">Menu Bar</p>}
                <nav className="space-y-1 w-full">
                  
                  {/* Home Link */}
                  <Link href="/dashboard" className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'} ${pathname === '/dashboard' ? 'bg-white text-blue-900 font-bold shadow-md' : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'}`}>
                    <Home size={16} className={pathname === '/dashboard' ? 'text-blue-600' : 'text-blue-200'} />
                    {isOpen && <span className="truncate animate-fadeIn">Home (Dashboard)</span>}
                  </Link>

                  {/* Choose Plan Link */}
                  <Link href="/plan" className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'} ${pathname === '/plan' ? 'bg-white text-blue-900 font-bold shadow-md' : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'}`}>
                    <Layers size={16} className={pathname === '/plan' ? 'text-blue-600' : 'text-blue-200'} />
                    {isOpen && <span className="truncate animate-fadeIn">Choose Plan</span>}
                  </Link>

                  {/* Dropdown Master Row: Product */}
                  <div>
                    <button
                      onClick={() => {
                        if (!isOpen) {
                          setIsOpen(true);
                          setIsProductOpen(true);
                          setIsNetworkOpen(false);
                        } else {
                          setIsProductOpen(!isProductOpen);
                          setIsNetworkOpen(false); 
                        }
                      }}
                      className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${
                        isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'
                      } ${
                        pathname.startsWith('/shop') 
                          ? 'bg-blue-800/50 text-white font-semibold' 
                          : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
                      }`}
                    >
                      <ShoppingBag size={16} className="text-blue-200" />
                      {isOpen && (
                        <div className="flex items-center justify-between flex-1 min-w-0 animate-fadeIn">
                          <span className="truncate">Product</span>
                          <ChevronDown 
                            size={14} 
                            className={`transition-transform duration-200 shrink-0 ml-1 ${isProductOpen ? 'rotate-180' : ''}`} 
                          />
                        </div>
                      )}
                    </button>

                    {isOpen && isProductOpen && (
                      <div className="mt-1 pl-4 space-y-1 border-l border-blue-400/30 ml-5 animate-fadeIn">
                        {productSubItems.map((subItem, sIdx) => {
                          const isSubActive = pathname === subItem.path;
                          return (
                            <Link
                              key={sIdx}
                              href={subItem.path}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-all ${
                                isSubActive 
                                  ? 'bg-white text-blue-900 font-bold shadow-sm' 
                                  : 'text-blue-200 hover:bg-blue-700/30 hover:text-white'
                              }`}
                            >
                              <subItem.icon size={13} className={isSubActive ? 'text-blue-600' : 'text-blue-300'} />
                              <span className="truncate">{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dropdown Master Row: My Network */}
                  <div>
                    <button
                      onClick={() => {
                        if (!isOpen) {
                          setIsOpen(true);
                          setIsNetworkOpen(true);
                          setIsProductOpen(false);
                        } else {
                          setIsNetworkOpen(!isNetworkOpen);
                          setIsProductOpen(false); 
                        }
                      }}
                      className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${
                        isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'
                      } ${
                        pathname.startsWith('/network') 
                          ? 'bg-blue-800/50 text-white font-semibold' 
                          : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
                      }`}
                    >
                      <Users size={16} className="text-blue-200" />
                      {isOpen && (
                        <div className="flex items-center justify-between flex-1 min-w-0 animate-fadeIn">
                          <span className="truncate">My Network</span>
                          <ChevronDown 
                            size={14} 
                            className={`transition-transform duration-200 shrink-0 ml-1 ${isNetworkOpen ? 'rotate-180' : ''}`} 
                          />
                        </div>
                      )}
                    </button>

                    {isOpen && isNetworkOpen && (
                      <div className="mt-1 pl-4 space-y-1 border-l border-blue-400/30 ml-5 animate-fadeIn">
                        {networkSubItems.map((subItem, sIdx) => {
                          const isSubActive = pathname === subItem.path;
                          return (
                            <Link
                              key={sIdx}
                              href={subItem.path}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-all ${
                                isSubActive 
                                  ? 'bg-white text-blue-900 font-bold shadow-sm' 
                                  : 'text-blue-200 hover:bg-blue-700/30 hover:text-white'
                              }`}
                            >
                              <subItem.icon size={13} className={isSubActive ? 'text-blue-600' : 'text-blue-300'} />
                              <span className="truncate">{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Finance & Earnings Link */}
                  <Link href="/finance" className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'} ${pathname === '/finance' ? 'bg-white text-blue-900 font-bold shadow-md' : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'}`}>
                    <Wallet size={16} className={pathname === '/finance' ? 'text-blue-600' : 'text-blue-200'} />
                    {isOpen && <span className="truncate animate-fadeIn">Finance & Earnings</span>}
                  </Link>

                </nav>
              </div>
            </div>
          </div>

          {/* Logout Trigger Footprint */}
          <div className={`w-full mt-auto pb-4 ${isOpen ? 'px-4' : 'px-2'}`}>
            <button 
              title={!isOpen ? "Log Out" : undefined}
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login'; 
              }}
              className={`w-full flex items-center text-xs font-medium text-blue-100 hover:bg-red-600/20 hover:text-red-200 rounded-lg transition-colors duration-150 border-t border-blue-400/20 pt-4 ${isOpen ? 'px-3 py-3 gap-3' : 'p-2.5 justify-center'}`}
            >
              <LogOut size={16} />
              {isOpen && <span className="animate-fadeIn">Log Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <MobileBottomNav />
    </>
  );
}