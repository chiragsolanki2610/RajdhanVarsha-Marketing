'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LoginTopBar from '@/components/loginTopbar';
import { 
  User, Landmark, Award, Edit, Lock, Download, AlertCircle, 
  ShieldAlert, CheckCircle, FileText, MapPin, Hash, MoveRight
} from 'lucide-react';

interface UserProfileData {
  name: string;
  mobileNo: string;
  aadharNo: string;
  sponsorId: string;
  sponsorIdName: string;
  position: 'Left' | 'Right' | string;
  address: string;
  userId?: string;
  memberId: string;
  email?: string;
  joinDate: string;
  status: string;
  membershipLevel: string;
  bvPoints: number;
  referrals: number;
  currentRank: string;
  nextRank: string;
  neededReferrals: number;
  isKycCompleted: boolean;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  accountType?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ FIX: Use 'authToken' — matches the key saved during login
        const token = localStorage.getItem('authToken');

        if (!token) {
          // No token means not logged in — redirect to login
          router.push('/login');
          return;
        }

        const response = await fetch('https://localhost:56187/api/Auth/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        // ✅ FIX: Handle 401 specifically — token expired or invalid
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userProfile');
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(`API response failed with server code: ${response.status}`);
        }

        const apiData = await response.json();

        const hasKyc = apiData.isKycCompleted ?? !!(apiData.bankName && apiData.accountNo);

        setProfile({
          name: apiData.name || 'N/A',
          mobileNo: apiData.mobileNo || 'N/A',
          aadharNo: apiData.aadharNo || 'N/A',
          sponsorId: apiData.sponsorId || 'N/A',
          sponsorIdName: apiData.sponsorIdName || 'N/A',
          position: apiData.position || 'Right',
          address: apiData.address || 'N/A',
          memberId: apiData.memberId || apiData.userId || 'RD0001',
          email: apiData.email || 'Not Provided',
          joinDate: apiData.joinDate || '17-06-2026',
          status: apiData.status || 'ACTIVE',
          membershipLevel: apiData.membershipLevel || 'Registered Member',
          bvPoints: Number(apiData.bvPoints) || 0,
          referrals: Number(apiData.referrals) || 0,
          currentRank: apiData.currentRank || 'New Member',
          nextRank: apiData.nextRank || 'Silver Member',
          neededReferrals: Number(apiData.neededReferrals) || 10,
          isKycCompleted: hasKyc,
          bankName: apiData.bankName || '',
          accountNo: apiData.accountNo || '',
          ifscCode: apiData.ifscCode || '',
          accountType: apiData.accountType || 'Savings'
        });

      } catch (err: any) {
        console.error("Profile Fetch Exception Error:", err);
        setError("Failed to load real-time database context. Displaying registration session profile schema.");

        // ✅ FIX: Try to load cached profile from localStorage as fallback
        const cached = localStorage.getItem('userProfile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setProfile({
              name: parsed.name || 'N/A',
              mobileNo: parsed.mobileNo || 'N/A',
              aadharNo: parsed.aadharNo || '[Redacted]',
              sponsorId: parsed.sponsorId || 'N/A',
              sponsorIdName: parsed.sponsorIdName || 'N/A',
              position: parsed.position || 'Right',
              address: parsed.address || 'N/A',
              memberId: parsed.memberId || parsed.userId || 'RD0001',
              email: parsed.email || 'Not Provided',
              joinDate: parsed.joinDate || '17-Jun-2026',
              status: parsed.status || 'ACTIVE',
              membershipLevel: parsed.membershipLevel || 'Registered Member',
              bvPoints: Number(parsed.bvPoints) || 0,
              referrals: Number(parsed.referrals) || 0,
              currentRank: parsed.currentRank || 'New Member',
              nextRank: parsed.nextRank || 'Silver Member',
              neededReferrals: Number(parsed.neededReferrals) || 10,
              isKycCompleted: parsed.isKycCompleted || false,
              bankName: parsed.bankName || '',
              accountNo: parsed.accountNo || '',
              ifscCode: parsed.ifscCode || '',
              accountType: parsed.accountType || 'Savings'
            });
          } catch {
            // If cached data is also corrupt, show hardcoded fallback
            setProfile({
              name: "FIRSTUSER",
              mobileNo: "N/A",
              aadharNo: "[Aadhaar Redacted]",
              sponsorId: "SYSTEM",
              sponsorIdName: "SYSTEM SPONSOR",
              position: "Right",
              address: "N/A",
              memberId: "RD0001",
              email: "N/A",
              joinDate: "17-Jun-2026",
              status: "ACTIVE",
              membershipLevel: "Registered Member",
              bvPoints: 0,
              referrals: 0,
              currentRank: "New Member",
              nextRank: "Silver Member",
              neededReferrals: 10,
              isKycCompleted: false
            });
          }
        } else {
          setProfile({
            name: "FIRSTUSER",
            mobileNo: "N/A",
            aadharNo: "[Aadhaar Redacted]",
            sponsorId: "SYSTEM",
            sponsorIdName: "SYSTEM SPONSOR",
            position: "Right",
            address: "N/A",
            memberId: "RD0001",
            email: "N/A",
            joinDate: "17-Jun-2026",
            status: "ACTIVE",
            membershipLevel: "Registered Member",
            bvPoints: 0,
            referrals: 0,
            currentRank: "New Member",
            nextRank: "Silver Member",
            neededReferrals: 10,
            isKycCompleted: false
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleKycRedirect = () => {
    router.push('/dashboard/kyc');
  };

  return (
    <div className="flex h-screen w-screen bg-[#F4F7FC] overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        <LoginTopBar />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F4F7FC]">

          {loading && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
              <div className="w-12 h-12 border-4 border-[#2B4C7E] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 font-medium">Connecting to secure API authorization nodes...</p>
            </div>
          )}

          {error && (
            <div className="max-w-5xl mx-auto p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>{error}</span>
              </div>
              <span className="text-[10px] uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">Fallback View Mode</span>
            </div>
          )}

          {!loading && profile && (
            <div className="max-w-5xl mx-auto space-y-6 mt-4 animate-fadeIn pb-10">

              {/* HEADER CONTAINER */}
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-6 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-[#2B4C7E] flex items-center justify-center font-bold text-2xl text-white shadow-md shadow-indigo-900/20">
                      {profile.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1.5">
                      <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight uppercase">{profile.name}</h1>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                          <User size={13} /> Member ID: <span className="font-mono font-bold text-gray-700">{profile.memberId}</span>
                        </span>

                        {profile.isKycCompleted ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle size={12} className="mr-1" /> KYC Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-amber-50 text-amber-600 border border-amber-200">
                            <ShieldAlert size={12} className="mr-1" /> KYC Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50/70 border border-gray-100 rounded-xl p-4 w-full md:w-auto min-w-[320px]">
                    <div className="px-4 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joined</p>
                      <p className="text-sm font-bold text-gray-700 mt-1">{profile.joinDate}</p>
                    </div>
                    <div className="px-4 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Purchase BV</p>
                      <p className="text-sm font-bold text-[#2B4C7E] mt-1">{profile.bvPoints} BV</p>
                    </div>
                    <div className="px-4 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Placement Leg</p>
                      <p className="text-sm font-bold text-indigo-600 mt-1 uppercase font-mono">{profile.position}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* REGISTRATION PROFILE */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <User size={18} className="text-[#2B4C7E]" />
                    <h2 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">Registration Profile</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
                      <p className="text-sm font-bold text-[#334155] uppercase">{profile.name}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Mobile Number</label>
                      <p className="text-sm font-bold text-[#334155] font-mono">{profile.mobileNo}</p>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Hash size={12} /> Aadhar Identification Number
                      </label>
                      <p className="text-sm font-mono font-bold text-[#334155] tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit">
                        {profile.aadharNo}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sponsor ID</label>
                      <p className="text-sm font-mono font-bold text-[#2B4C7E]">{profile.sponsorId}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sponsor Name</label>
                      <p className="text-sm font-bold text-[#334155] uppercase">{profile.sponsorIdName}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tree Position</label>
                      <p className="text-sm font-bold text-gray-700 font-mono">{profile.position} Side</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Plan Status</label>
                      <p className="text-sm font-bold text-gray-600">{profile.membershipLevel}</p>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin size={12} /> Registered Address
                      </label>
                      <p className="text-sm font-medium text-[#475569] leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        {profile.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* KYC / BANK BLOCK */}
                {profile.isKycCompleted ? (
                  <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-6 space-y-5">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                      <Landmark size={18} className="text-[#2B4C7E]" />
                      <h2 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">Settlement Node Account</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Bank Name</label>
                        <p className="text-sm font-bold text-[#334155] uppercase">{profile.bankName}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Account Number</label>
                        <p className="text-sm font-mono font-bold text-[#334155]">{profile.accountNo}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">IFSC Code</label>
                        <p className="text-sm font-mono font-bold text-[#334155] uppercase">{profile.ifscCode}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Account Type</label>
                        <p className="text-sm font-bold text-[#334155]">{profile.accountType}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FFFDF5] rounded-2xl border border-amber-200 p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                          <ShieldAlert size={22} />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-amber-900">KYC Verification Missing</h2>
                          <p className="text-xs text-amber-700 font-medium mt-0.5">Your banking payout settlement profile details are unlocked.</p>
                        </div>
                      </div>

                      <div className="bg-white border border-amber-200/60 rounded-xl p-4 text-xs space-y-2.5 leading-relaxed shadow-sm">
                        <p className="font-bold flex items-center gap-1.5 text-amber-900">
                          <FileText size={13} /> Complete verification now to link features:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-amber-800 font-medium">
                          <li>Unlock automatic system wallet payouts directly to your savings bank.</li>
                          <li>Activate downline network branch node pairing incentives matches.</li>
                          <li>Clear standard profile structural compliance verification audits.</li>
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={handleKycRedirect}
                      className="w-full mt-6 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-600/20 group font-sans"
                    >
                      Complete KYC Now
                      <MoveRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                )}
              </div>

              {/* MILESTONE TRACKER */}
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-[#2B4C7E]">
                      <Award size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Level Status</p>
                      <p className="text-base font-bold text-[#2B4C7E]">{profile.currentRank}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Next Target Milestone</p>
                    <p className="text-sm font-bold text-gray-500">{profile.nextRank}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#2B4C7E] to-indigo-500 h-full rounded-full w-[10%]" />
                  </div>
                  <p className="text-xs font-medium text-gray-400">
                    Acquire <span className="text-[#2B4C7E] font-bold">{profile.neededReferrals} more network direct sales joinings</span> to upgrade rank status tier.
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2B4C7E] hover:bg-[#1E355B] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition">
                  <Edit size={14} /> Account Settings
                </button>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition">
                  <Lock size={14} /> Credential Keys
                </button>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition ml-auto">
                  <Download size={14} /> Print Identity Badge
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}