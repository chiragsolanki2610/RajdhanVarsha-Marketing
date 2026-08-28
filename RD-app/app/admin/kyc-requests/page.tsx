'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertCircle, Check, X, Eye, 
  User, Calendar, Phone, MapPin, CreditCard, Landmark, FileText,
  Search, Filter, RefreshCw
} from 'lucide-react';
import Sidebar from '@/components/Sidebar'; 
import TopBar from '@/components/loginTopbar';   

interface KycRequest {
  id: number;
  userId: string;
  fullName: string;
  mobileNo: string;
  age: number;
  dob: string;
  address: string;
  aadharNo: string;
  panNo: string;
  accountHolderName: string;
  accountNo: string;
  bankName: string;
  ifscCode: string;
  aadharFrontImageUrl: string;
  aadharBackImageUrl: string;
  panCardImageUrl: string;
  bankProofImageUrl: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
}

export default function KycRequests() {
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [selectedKyc, setSelectedKyc] = useState<KycRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // LIGHTBOX PREVIEW STATE FOR RENDERING IMAGES INSIDE THE APP
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const fetchKycRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('https://rd-api-j7zj.onrender.com/api/Admin/kyc-requests', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) throw new Error('Failed to retrieve compliance records.');
      const data = await response.json();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Error syncing data streams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycRequests();
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: 'Approved' | 'Rejected') => {
    try {
      setActionLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await fetch(`https://rd-api-j7zj.onrender.com/api/Admin/kyc-requests/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error(`Failed to update status to ${newStatus}.`);

      setSuccessMsg(`Verification status updated to ${newStatus}.`);
      setSelectedKyc(null); 
      fetchKycRequests();

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // HELPER TO OPEN LIGHTBOX PREVIEW MODAL
  const openImagePreview = (url: string, title: string) => {
    if (!url || url === 'string' || url.trim() === '') {
      alert(`No valid verification image upload found for ${title}.`);
      return;
    }
    setPreviewImage({ url, title });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* SIDEBAR COMPONENT */}
      <Sidebar />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP NAVIGATION BAR */}
        <TopBar />

        {/* DASHBOARD BODY CONTROLLER */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="text-indigo-600" size={24} />
                Compliance Administration Panel
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Review network member registration identities and settlement details
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchKycRequests}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition border border-slate-200"
                title="Refresh Records"
              >
                <RefreshCw size={16} />
              </button>
              <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase border border-indigo-100">
                Pending Audits: {requests.filter(r => r.status === 'Pending').length}
              </div>
            </div>
          </div>

          {/* NOTIFICATION FEEDBACK BARS */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-xs text-rose-800 font-semibold animate-fadeIn">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-xs text-emerald-800 font-semibold animate-fadeIn">
              <Check className="text-emerald-500 shrink-0" size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MAIN GRID DISPLAY AREA */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Syncing Verification Packages...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-sm text-slate-400 font-medium shadow-sm">
              No compliance verification submission packages found in system registry.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4 pl-6">User Identity</th>
                      <th className="p-4">Mobile Mapping</th>
                      <th className="p-4">Audit Status</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {requests.map((kyc) => (
                      <tr key={kyc.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="p-4 pl-6 font-semibold text-slate-700">
                          <div className="flex flex-col">
                            <span className="text-slate-800 font-medium">{kyc.fullName}</span>
                            <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase mt-0.5">{kyc.userId}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-500 font-medium">{kyc.mobileNo}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            kyc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            kyc.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {kyc.status}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button 
                            onClick={() => setSelectedKyc(kyc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold text-slate-600 transition duration-150 shadow-sm"
                          >
                            <Eye size={13} />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FULL SCREEN MODAL POPUP OVERLAY */}
      {selectedKyc && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verification Package</h3>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{selectedKyc.fullName}</p>
              </div>
              <button 
                onClick={() => setSelectedKyc(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* SECTION 1: PERSONAL INFORMATION */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} /> Personal Matrix
                </h4>
                <div className="bg-slate-50/70 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-600 border border-slate-100">
                  <div className="flex justify-between"><span className="text-slate-400 font-medium">User Key:</span> <span className="font-mono text-slate-700 uppercase">{selectedKyc.userId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-medium">Contact mapping:</span> <span className="font-mono text-slate-700">{selectedKyc.mobileNo}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-medium">Age / DOB:</span> <span className="text-slate-700">{selectedKyc.age} yrs ({selectedKyc.dob})</span></div>
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] font-normal leading-relaxed text-slate-500 flex gap-1.5 items-start">
                    <MapPin size={13} className="shrink-0 text-slate-400 mt-0.5" /> 
                    <span>{selectedKyc.address}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: IDENTITY DETAILS */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} /> Compliance Credentials
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Aadhaar Identification</span>
                    <span className="font-mono font-bold text-slate-700 tracking-wider text-[11px]">[Aadhaar Redacted]</span>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">PAN ID Number</span>
                    <span className="font-mono font-bold text-slate-700 uppercase tracking-wider text-[11px]">{selectedKyc.panNo}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: BANK DETAILS */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark size={13} /> Settlement Node Bank Details
                </h4>
                <div className="bg-slate-50/70 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-600 border border-slate-100">
                  <div className="flex justify-between"><span className="text-slate-400 font-medium">Bank Name:</span> <span className="text-slate-700">{selectedKyc.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-medium">Holder Legal Title:</span> <span className="text-slate-700">{selectedKyc.accountHolderName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-medium">Account Route:</span> <span className="font-mono tracking-wide text-slate-700">{selectedKyc.accountNo}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-medium">IFSC Routing Code:</span> <span className="font-mono text-indigo-600 uppercase">{selectedKyc.ifscCode}</span></div>
                </div>
              </div>

              {/* SECTION 4: REWRITTEN IMAGE PREVIEW ACTION BUTTONS */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} /> Compliance Media Streams
                </h4>
                <div className="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-wider text-center">
                  <button 
                    type="button" 
                    onClick={() => openImagePreview(selectedKyc.aadharFrontImageUrl, "Aadhaar Front View")}
                    className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition block shadow-sm text-left"
                  >
                    🔍 View Aadhaar Front
                  </button>
                  <button 
                    type="button" 
                    onClick={() => openImagePreview(selectedKyc.aadharBackImageUrl, "Aadhaar Back View")}
                    className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition block shadow-sm text-left"
                  >
                    🔍 View Aadhaar Back
                  </button>
                  <button 
                    type="button" 
                    onClick={() => openImagePreview(selectedKyc.panCardImageUrl, "PAN Card Copy")}
                    className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition block shadow-sm text-left"
                  >
                    🔍 View PAN Card Doc
                  </button>
                  <button 
                    type="button" 
                    onClick={() => openImagePreview(selectedKyc.bankProofImageUrl, "Bank Account Ledger Proof")}
                    className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition block shadow-sm text-left"
                  >
                    🔍 View Bank Ledger Proof
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedKyc(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-xl transition border border-slate-200"
              >
                Cancel
              </button>
              {selectedKyc.status === 'Pending' && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedKyc.id, 'Rejected')}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 border border-rose-100"
                  >
                    <X size={14} /> Deny Package
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedKyc.id, 'Approved')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                  >
                    <Check size={14} /> Approve Node
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* NEW LIGHTBOX OVERLAY COMPONENT (RENDERS BASE64 PERFECTLY) */}
      {/* ========================================================= */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            
            {/* Modal Top Control Bar */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileText size={14} className="text-indigo-600"/> Document Viewer: {previewImage.title}
              </h4>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image Preview Canvas Area */}
            <div className="bg-slate-950 p-6 flex justify-center items-center max-h-[65vh] overflow-auto">
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-md border border-slate-800"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallbackBox = document.createElement('div');
                    fallbackBox.className = "text-center text-slate-400 text-xs py-12 flex flex-col items-center gap-2 font-medium";
                    fallbackBox.innerHTML = `⚠️ <span class="text-slate-300 font-bold">Image Failed to load</span> <span class="text-[11px] text-slate-500">The uploaded file string might be empty or corrupted.</span>`;
                    parent.appendChild(fallbackBox);
                  }
                }}
              />
            </div>

            {/* Dismiss Footer Strip */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}