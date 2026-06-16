'use client';

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  User, 
  Network, 
  FileText, 
  Users, 
  GitMerge, 
  ShoppingBag, 
  Key, 
  LogOut,
  ChevronLeft,
  BookOpen,
  MoreHorizontal
} from 'lucide-react';

interface UserData {
  name: string;
  memberId: string;
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
function MobileBottomNav() {
  const [active, setActive] = useState('Home');

  const navItems = [
    { icon: Home,        label: 'Home'    },
    { icon: User,        label: 'Profile' },
    { icon: BookOpen,    label: 'Ledger'  },
    { icon: Users,       label: 'Team'    },
    { icon: MoreHorizontal, label: 'More' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      {navItems.map(({ icon: Icon, label }) => {
        const isActive = active === label;
        return (
          <button
            key={label}
            onClick={() => setActive(label)}
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
          </button>
        );
      })}
    </nav>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getInitials = (nameString: string | undefined) => {
    if (!nameString || nameString === 'GUEST USER') return 'GU';
    const parts = nameString.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const menuItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: User, label: 'Profile' },
    { icon: Network, label: 'Position' },
    { icon: FileText, label: 'Ledger View' },
    { icon: Users, label: 'Team Detail' },
    { icon: GitMerge, label: 'Tree View' },
  ];

  const pinSystemItems = [
    { icon: ShoppingBag, label: 'Purchase Req.' },
    { icon: Key, label: 'Pin Detail' },
  ];

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="relative hidden md:flex h-screen shrink-0 font-sans select-none z-40 bg-[#3B5998]">
        <button 
          onClick={() => setIsOpen(!isOpen)}
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
            <div className={`w-full flex items-center box-border transition-all duration-300 h-20 ${isOpen ? 'bg-white text-gray-800 px-4 border-b border-gray-200 mb-6 gap-3' : 'bg-transparent text-white px-2 justify-center border-b border-blue-400/30 mb-4'}`}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-sm overflow-hidden bg-gray-100">
                <img src="/photos/web_logo.jpg" alt="logo" className="w-full h-full object-cover" />
              </div>
              {isOpen && (
                <div className="truncate animate-fadeIn">
                  <h2 className="font-bold text-base tracking-wide truncate leading-tight">
                    <span className="text-red-600">RAJ </span>
                    <span className="text-[#3B5998]">DHANVARSHA</span>
                  </h2>
                  <p className="text-xs text-red-600 font-bold tracking-wider leading-none mt-1">MARKETING</p>
                </div>
              )}
            </div>

            <div className={`w-full ${isOpen ? 'px-4 mb-6' : 'px-2 mb-4 flex justify-center'}`}>
              <div className={`w-full flex items-center bg-blue-900/30 rounded-xl border border-blue-400/20 transition-all ${isOpen ? 'p-3 gap-3' : 'p-0 justify-center w-10 h-10 rounded-full'}`}>
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                  {loading ? '...' : getInitials(userData?.name)}
                </div>
                
                {isOpen && (
                  <div className="truncate w-full flex flex-col justify-center">
                    {loading ? (
                      <div className="space-y-2 animate-pulse w-24">
                        <div className="h-3 bg-blue-400/40 rounded"></div>
                        <div className="h-2 bg-blue-400/20 rounded w-2/3"></div>
                      </div>
                    ) : (
                      <div className="truncate animate-fadeIn">
                        <h3 className="font-semibold text-sm truncate uppercase">{userData?.name}</h3>
                        <p className="text-[10px] text-green-300 flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                          ID: {userData?.memberId}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`w-full space-y-6 ${isOpen ? 'px-4' : 'px-2'}`}>
              <div>
                {isOpen && <p className="text-[10px] uppercase font-bold text-blue-200/60 tracking-widest mb-2 pl-2 animate-fadeIn">Menu Bar</p>}
                <nav className="space-y-1 w-full">
                  {menuItems.map((item, idx) => (
                    <button
                      key={idx}
                      title={!isOpen ? item.label : undefined}
                      className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 ${isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'} ${item.active ? 'bg-white text-blue-900 font-bold shadow-md' : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'}`}
                    >
                      <item.icon size={16} className={item.active ? 'text-blue-600' : 'text-blue-200'} />
                      {isOpen && <span className="truncate animate-fadeIn">{item.label}</span>}
                    </button>
                  ))}
                </nav>
              </div>

              <div>
                {isOpen && <p className="text-[10px] uppercase font-bold text-blue-200/60 tracking-widest mb-2 pl-2 animate-fadeIn">Pin System</p>}
                <nav className="space-y-1 w-full">
                  {pinSystemItems.map((item, idx) => (
                    <button
                      key={idx}
                      title={!isOpen ? item.label : undefined}
                      className={`w-full flex items-center rounded-lg text-xs font-medium text-blue-100 hover:bg-blue-700/40 hover:text-white transition-all duration-150 ${isOpen ? 'px-3 py-2.5 gap-3' : 'p-2.5 justify-center'}`}
                    >
                      <item.icon size={16} className="text-blue-200" />
                      {isOpen && <span className="truncate animate-fadeIn">{item.label}</span>}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

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

      {/* ── Mobile bottom nav (visible only on mobile) ── */}
      <MobileBottomNav />
    </>
  );
}