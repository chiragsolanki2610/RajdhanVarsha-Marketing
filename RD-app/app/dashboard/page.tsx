import React from 'react';
import Sidebar from '@/components/Sidebar';
// import MobileBottomNav from '@/components/MobileBottomNav';
import LoginTopbar from '@/components/loginTopbar';
import {
  Calendar,
  TrendingUp,
  Zap,
  Wallet,
  ArrowDownToLine,
  Coins,
  ChevronRight,
  UserPlus,
} from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    {
      title: 'PURCHASE DATE',
      value: '15-05-2026',
      subtext: 'ACTIVE',
      subtextColor: 'text-green-600',
      icon: Calendar,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      borderColor: 'border-t-blue-500',
    },
    {
      title: 'PURCHASE BV',
      value: '600 BV',
      icon: TrendingUp,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      borderColor: 'border-t-indigo-500',
    },
    {
      title: 'TOTAL SELLS',
      value: '1 Sell',
      icon: Zap,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      borderColor: 'border-t-orange-400',
    },
    {
      title: 'TOTAL PAYOUT',
      value: 'Rs.220.00',
      icon: Wallet,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
      borderColor: 'border-t-green-500',
    },
    {
      title: 'WITHDRAWAL',
      value: 'Rs.0.00',
      icon: ArrowDownToLine,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      borderColor: 'border-t-red-400',
    },
    {
      title: 'BALANCE',
      value: 'Rs.220.00',
      icon: Coins,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      borderColor: 'border-t-blue-600',
      highlight: true,
    },
  ];

  const activities = [
    {
      id: 1,
      icon: Zap,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      title: 'Commission Credited',
      description: 'From Level 1 direct sell',
      value: '+ Rs.220.00',
      valueColor: 'text-green-600',
      timestamp: '10:45 AM',
    },
    {
      id: 2,
      icon: UserPlus,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      title: 'New Team Member',
      description: 'Rahul joined your downline',
      value: null,
      valueColor: '',
      timestamp: 'Yesterday',
    },
    {
      id: 3,
      icon: TrendingUp,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      title: 'Account Activated',
      description: 'Dream purchase processed',
      value: '600 BV',
      valueColor: 'text-gray-700',
      timestamp: '15 May',
    },
  ];

  return (
    <div className="flex bg-[#F4F6FA] min-h-screen text-gray-800 font-sans antialiased">

      {/* Sidebar — desktop only */}
      
        <Sidebar />
      

      <div className="flex-1 flex flex-col min-w-0">

        <LoginTopbar
          //title="RAJ DHAN VARSHA"
          userName="Dharamveer Varsha"
          logoSrc="/logo.png"
        />

        {/* pb-20 on mobile so content doesn't hide behind bottom nav */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">

          {/* ── Mobile Layout ── */}
          <div className="block md:hidden">

            {/* Welcome Banner */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white px-5 pt-10 pb-10 rounded-b-3xl relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-400/30 rounded-full" />
              <div className="absolute top-10 -right-2 w-16 h-16 bg-blue-300/20 rounded-full" />
              <p className="text-sm font-medium text-blue-100 mb-0.5">Welcome back,</p>
              <h1 className="text-2xl font-extrabold tracking-wide">DHARAMVEER</h1>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-700/50 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                <span className="text-xs font-semibold text-white">ID: RD0025</span>
              </div>
            </div>

            {/* My Performance */}
            <div className="px-4 mt-6">
              <h2 className="text-base font-bold text-gray-900">My Performance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tuesday, June 16, 2026</p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {stats.map((card, idx) => (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl p-4 border-t-4 ${card.borderColor} shadow-sm`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-xl ${card.iconBg}`}>
                        <card.icon size={16} className={card.iconColor} />
                      </div>
                      {card.subtext && (
                        <span className={`text-[10px] font-bold ${card.subtextColor}`}>
                          {card.subtext}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-tight">
                      {card.title}
                    </p>
                    <p className={`mt-1 font-extrabold leading-tight ${card.highlight ? 'text-blue-600 text-lg' : 'text-gray-900 text-sm'}`}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mx-4 mt-6 mb-8 bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-4 pt-4 pb-2">
                <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
                <button className="text-xs font-semibold text-blue-600 flex items-center gap-0.5">
                  View All <ChevronRight size={14} />
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {activities.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${item.iconBg}`}>
                        <item.icon size={16} className={item.iconColor} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{item.title}</p>
                        <p className="text-[11px] text-gray-400">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      {item.value && (
                        <p className={`text-xs font-bold ${item.valueColor}`}>{item.value}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Desktop Layout ── */}
          <div className="hidden md:block p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((card, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-t-4 ${card.borderColor} flex flex-col justify-between min-h-[110px]`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                        {card.title}
                      </p>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className={`font-extrabold text-gray-900 ${card.highlight ? 'text-3xl text-blue-600' : 'text-xl'}`}>
                          {card.value}
                        </span>
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                      <card.icon size={18} className={card.iconColor} />
                    </div>
                  </div>
                  {card.subtext && (
                    <div className="mt-2 flex">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-green-600 bg-green-50 border border-green-200">
                        {card.subtext}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-gray-900">Recent Activity</h3>
                <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {activities.map((item) => (
                  <div key={item.id} className="py-4 flex items-center justify-between group hover:bg-slate-50/50 px-2 rounded-xl transition-colors duration-150 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${item.iconBg}`}>
                        <item.icon size={18} className={item.iconColor} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      {item.value && (
                        <p className={`text-sm font-bold ${item.valueColor}`}>{item.value}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-400">{item.timestamp}</p>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Mobile bottom nav — rendered here, outside the hidden wrapper */}
      {/* <MobileBottomNav /> */}
    </div>
  );
}