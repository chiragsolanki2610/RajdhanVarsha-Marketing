"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>("");

    useEffect(() => {
        // Safe check for browser context
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("authToken");
            const savedUserId = localStorage.getItem("rememberUserId");
            
            // SECURITY GUARD: If no auth token is found, boot them back to the login page
            if (!token) {
                router.push("/login"); // Adjust path if your login page is at root "/"
            } else {
                setUserId(savedUserId || "Distributor");
            }
        }
    }, [router]);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("authToken");
        }
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-gray-800 font-sans">
            {/* Top Navigation Bar */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <span className="text-red-500">RAJ</span>
                    <span className="text-blue-800">DHANVARSHA</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400 font-medium">Welcome back,</p>
                        <p className="text-sm font-bold text-gray-700">{userId}</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-600 text-xs font-bold px-4 py-2.5 rounded-xl border border-gray-200 transition-all duration-200"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* Dashboard Content Container */}
            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                    <div className="relative z-10 space-y-2">
                        <span className="bg-red-500 text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-full">
                            Operational Panel
                        </span>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Welcome to your Wellness Business Portal
                        </h1>
                        <p className="text-blue-200 text-xs md:text-sm max-w-xl font-normal leading-relaxed">
                            Track your direct referrals, manage retail product inventory margins, and monitor corporate performance metrics from a clean centralized workspace.
                        </p>
                    </div>
                    {/* Background Graphic Element */}
                    <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none hidden md:block" />
                </div>

                {/* Grid Metric Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Metric Card 1 */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                        <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Total Earnings</p>
                        <p className="text-2xl font-black text-gray-900">₹0.00</p>
                        <span className="text-[10px] text-green-500 font-medium bg-green-50 px-2 py-0.5 rounded-md">
                            Current Cycle
                        </span>
                    </div>

                    {/* Metric Card 2 */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                        <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Direct Referrals</p>
                        <p className="text-2xl font-black text-gray-900">0</p>
                        <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-md">
                            Active Downline
                        </span>
                    </div>

                    {/* Metric Card 3 */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                        <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Retail Margin</p>
                        <p className="text-2xl font-black text-gray-900">Up to 20%</p>
                        <span className="text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-md">
                            Premium Tier
                        </span>
                    </div>

                    {/* Metric Card 4 */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                        <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Account Status</p>
                        <div className="flex items-center gap-2 pt-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Verified</p>
                        </div>
                    </div>

                </div>

                {/* Mock Data Placeholder Block */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="border-b border-gray-100 pb-3">
                        <h3 className="text-sm font-bold text-gray-800">Recent Operational Actions</h3>
                        <p className="text-xs text-gray-400">Your live activity logs will populate here once API integration hooks are complete.</p>
                    </div>
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 space-y-2">
                        <span className="text-3xl">📊</span>
                        <p className="text-xs font-medium">No log events detected in this session layout.</p>
                    </div>
                </div>

            </main>
        </div>
    );
}