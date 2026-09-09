'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LoginTopBar from '@/components/loginTopbar';
import { 
  Landmark, CreditCard, ShieldCheck, AlertCircle, 
  ArrowLeft, CheckCircle, HelpCircle, User, FileText, Upload
} from 'lucide-react';

export default function KycVerificationPage() {
  const router = useRouter();
  
  // PERSONAL DETAIL STATES
  const [fullName, setFullName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');

  // AADHARCARD DETAIL STATES
  const [aadharNo, setAadharNo] = useState('');
  const [aadharFront, setAadharFront] = useState<File | null>(null);
  const [aadharBack, setAadharBack] = useState<File | null>(null);

  // PANCARD DETAIL STATES
  const [panNo, setPanNo] = useState('');
  const [panCardImg, setPanCardImg] = useState<File | null>(null);

  // BANK DETAIL STATES
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankProofImg, setBankProofImg] = useState<File | null>(null);
  
  // APP LIFECYCLE STATES
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Max allowed size per uploaded image (in MB). Adjust to match your API/server limits.
  const MAX_FILE_SIZE_MB = 8;

  useEffect(() => {
    const fetchProfileToSeed = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch('https://localhost:56187/api/Auth/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        });

        if (response.ok) {
          const apiData = await response.json();
          setFullName(apiData.name || '');
          setMobileNo(apiData.mobileNo || '');
          setAddress(apiData.address || '');
          setAadharNo(apiData.aadharNo || '');
          setAccountHolderName(apiData.name || ''); 
        }
      } catch (err) {
        console.error("Could not pre-seed profile records into KYC form layout:", err);
      }
    };

    fetchProfileToSeed();
  }, []);

  const handleBackToProfile = () => {
    router.push('/profile'); 
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    fieldLabel: string
  ) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validate size up-front so we fail fast with a clear message instead of
    // discovering a huge/corrupt file mid-submit.
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setError(`"${fieldLabel}" is ${sizeMB.toFixed(1)}MB, which exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please choose a smaller image.`);
      e.target.value = '';
      setFile(null);
      return;
    }

    setError(null);
    setFile(file);
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!age || !dob || !panNo || !bankName || !accountNo || !ifscCode || !accountHolderName) {
      setError("Please fill out all missing textual registration data completely.");
      return;
    }

    if (!aadharFront || !aadharBack || !panCardImg || !bankProofImg) {
      setError("Compliance alert: All physical document media verification uploads are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      // Build a multipart/form-data payload instead of base64-encoded JSON.
      // This avoids the ~33% size inflation of base64 and the large in-memory
      // strings that were causing failures on some mobile devices.
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('mobileNo', mobileNo);
      formData.append('age', String(parseInt(age, 10)));
      formData.append('dob', dob);
      formData.append('address', address);
      formData.append('aadharNo', aadharNo);
      formData.append('panNo', panNo.toUpperCase());
      formData.append('accountHolderName', accountHolderName);
      formData.append('accountNo', accountNo);
      formData.append('bankName', bankName);
      formData.append('ifscCode', ifscCode.toUpperCase());
      formData.append('isKycCompleted', 'true');
      formData.append('aadharFrontImage', aadharFront, aadharFront.name);
      formData.append('aadharBackImage', aadharBack, aadharBack.name);
      formData.append('panCardImage', panCardImg, panCardImg.name);
      formData.append('bankProofImage', bankProofImg, bankProofImg.name);

      // DEBUG: log file sizes so we can see if mobile photos are huge
      console.log("=== FILE SIZES BEFORE UPLOAD ===");
      console.log("Aadhaar Front:", (aadharFront.size / 1024 / 1024).toFixed(2), "MB", aadharFront.type);
      console.log("Aadhaar Back:", (aadharBack.size / 1024 / 1024).toFixed(2), "MB", aadharBack.type);
      console.log("PAN Card:", (panCardImg.size / 1024 / 1024).toFixed(2), "MB", panCardImg.type);
      console.log("Bank Proof:", (bankProofImg.size / 1024 / 1024).toFixed(2), "MB", bankProofImg.type);

      const response = await fetch('https://localhost:56187/api/Kyc/submit', {
        method: 'POST',
        headers: {
          // NOTE: do NOT set Content-Type manually for FormData — the browser
          // sets it automatically, including the multipart boundary.
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      // DEBUG: log full response details regardless of success/failure
      console.log("=== SERVER RESPONSE ===");
      console.log("Status:", response.status, response.statusText);

      if (!response.ok) {
        let responseText = '';
        try {
          responseText = await response.text();
        } catch (readErr) {
          responseText = '(could not read response body)';
        }
        console.error("Server error response body:", responseText);
        throw new Error(`API submission failed: ${response.status} ${response.statusText} - ${responseText}`);
      }

      setSuccess(true);
      setTimeout(() => { router.push('/profile'); }, 2500);

    } catch (err: any) {
      // DEBUG: log the full error object, not just a generic message
      console.error("=== KYC SUBMISSION EXCEPTION ===");
      console.error("Error name:", err?.name);
      console.error("Error message:", err?.message);
      console.error("Full error object:", err);

      // Build a human-readable message. Network failures (offline, DNS,
      // CORS, server unreachable) surface as a generic "Failed to fetch" —
      // call that out explicitly since users on mobile networks hit this a lot.
      let displayMessage = err?.message;
      if (!displayMessage || displayMessage === 'Failed to fetch') {
        displayMessage = 'Could not reach the server. Please check your internet connection and try again.';
      }

      setError(`DEBUG INFO: ${displayMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F4F7FC] overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        <LoginTopBar />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F4F7FC]">
          <div className="max-w-3xl mx-auto space-y-6 mt-2 animate-fadeIn pb-10">
            
            <button 
              type="button"
              onClick={handleBackToProfile}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#2B4C7E] transition group"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              Back to Registration Profile
            </button>

            {error && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-800 font-medium">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-emerald-200 p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle size={32} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-800">KYC Verification Submitted!</h2>
                  <p className="text-sm text-gray-500">Your compliance artifacts and banking settlement nodes are now pending secure verification review.</p>
                </div>
                <p className="text-[11px] text-gray-400 font-medium animate-pulse">Redirecting back to profile core...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitKyc} className="space-y-6">
                
                {/* 1. PERSONAL DETAILS CARD */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-[#2B4C7E]">
                    <User size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Personal Details</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                      <input type="text" disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed" value={fullName} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mobile Number</label>
                      <input type="text" disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-mono text-gray-500 cursor-not-allowed" value={mobileNo} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Age</label>
                      <input type="number" required placeholder="Enter Age" value={age} onChange={(e) => setAge(e.target.value)} disabled={submitting} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:border-[#2B4C7E] focus:bg-white transition" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date of Birth</label>
                      <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} disabled={submitting} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:border-[#2B4C7E] focus:bg-white transition" />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Registered Address</label>
                      <textarea disabled rows={2} className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 cursor-not-allowed resize-none" value={address} />
                    </div>
                  </div>
                </div>

                {/* 2. AADHARCARD DETAILS CARD */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-[#2B4C7E]">
                    <FileText size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Aadhaar Card Details</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Aadhaar Identification Number</label>
                      <input type="text" disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-gray-500 cursor-not-allowed" value={aadharNo} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Aadhaar Image (Front)</label>
                        <div className="border-2 border-dashed border-gray-200 hover:border-[#2B4C7E] rounded-xl p-3 text-center transition cursor-pointer relative bg-gray-50/50">
                          <input type="file" required accept="image/*" onChange={(e) => handleFileChange(e, setAadharFront, 'Aadhaar Front')} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <Upload size={16} className="mx-auto text-gray-400 mb-1" />
                          <p className="text-xs text-gray-600 font-medium truncate">{aadharFront ? aadharFront.name : 'Choose Front View File'}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Aadhaar Image (Back)</label>
                        <div className="border-2 border-dashed border-gray-200 hover:border-[#2B4C7E] rounded-xl p-3 text-center transition cursor-pointer relative bg-gray-50/50">
                          <input type="file" required accept="image/*" onChange={(e) => handleFileChange(e, setAadharBack, 'Aadhaar Back')} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <Upload size={16} className="mx-auto text-gray-400 mb-1" />
                          <p className="text-xs text-gray-600 font-medium truncate">{aadharBack ? aadharBack.name : 'Choose Back View File'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PANCARD DETAILS CARD */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-[#2B4C7E]">
                    <CreditCard size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">PAN Card Details</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">PAN Permanent Identification Number</label>
                      <input type="text" required placeholder="e.g., ABCDE1234F" maxLength={10} value={panNo} onChange={(e) => setPanNo(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono uppercase font-bold text-gray-700 focus:outline-none focus:border-[#2B4C7E]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Upload PAN Card Document Image</label>
                      <div className="border-2 border-dashed border-gray-200 hover:border-[#2B4C7E] rounded-xl p-3 text-center transition cursor-pointer relative bg-gray-50/50">
                        <input type="file" required accept="image/*" onChange={(e) => handleFileChange(e, setPanCardImg, 'PAN Card')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <Upload size={16} className="mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-600 font-medium truncate">{panCardImg ? panCardImg.name : 'Select Panoramic Profile Copy'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. BANK DETAILS CARD */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-[#2B4C7E]">
                    <Landmark size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Settlement Node Bank Details</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name of Bank Holder</label>
                      <input type="text" required placeholder="Holder Account Legal Title" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#2B4C7E]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account Number</label>
                      <input type="password" required placeholder="Core Passbook Savings Digits" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-wider font-bold text-gray-700 focus:outline-none focus:border-[#2B4C7E]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bank Name</label>
                      <input type="text" required placeholder="e.g., PUNJAB NATIONAL BANK" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#2B4C7E]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">IFSC Routing Code</label>
                      <input type="text" required placeholder="e.g., PUNB0123456" maxLength={11} value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-bold uppercase text-gray-700 focus:outline-none focus:border-[#2B4C7E]" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Upload Bank Account Proof (Passbook / Cancelled Cheque)</label>
                      <div className="border-2 border-dashed border-gray-200 hover:border-[#2B4C7E] rounded-xl p-3 text-center transition cursor-pointer relative bg-gray-50/50">
                        <input type="file" required accept="image/*" onChange={(e) => handleFileChange(e, setBankProofImg, 'Bank Proof')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <Upload size={16} className="mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-600 font-medium truncate">{bankProofImg ? bankProofImg.name : 'Select Passbook Ledger Clear Image Snapshot'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-2 text-[11px] text-gray-400 font-medium leading-relaxed">
                  <HelpCircle size={14} className="text-[#2B4C7E] shrink-0 mt-0.5" />
                  <span>Ensure all physical uploaded file copies show data entries clearly. Mismatched image documentation audits delay downline wallet payout settlement channels.</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleBackToProfile} disabled={submitting} className="flex-1 py-3.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 py-3.5 bg-[#2B4C7E] hover:bg-[#1E355B] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition disabled:opacity-50 shadow-md shadow-indigo-950/10 flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Locking Documents...
                      </>
                    ) : "Submit Entire Verification Package"}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
