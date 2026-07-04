'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LoginTopBar from '@/components/loginTopbar';
import {
  User, Landmark, Edit, Lock, Download, AlertCircle,
  ShieldAlert, CheckCircle, FileText, MapPin, Hash, MoveRight,
  CircleCheck, CircleX, X, Loader2, Eye, EyeOff,
  Camera, Image as ImageIcon, Trash2, Pencil
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
  idStatus: string; // ✅ NEW: active or inactive
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
  profilePictureUrl?: string | null;
}

const API_BASE = 'https://rd-api-j7zj.onrender.com';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Change Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // ✅ Profile picture upload state
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Live in-app camera capture (works consistently on desktop + mobile,
  // unlike the OS camera handoff which only fires on real mobile browsers)
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('authToken');

        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${API_BASE}/api/Auth/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

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
          idStatus: apiData.idStatus || 'inactive', // ✅ NEW
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
          accountType: apiData.accountType || 'Savings',
          profilePictureUrl: apiData.profilePictureUrl || null
        });

      } catch (err: any) {
        console.error("Profile Fetch Exception Error:", err);
        setError("Failed to load real-time database context. Displaying registration session profile schema.");

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
              idStatus: parsed.idStatus || 'inactive', // ✅ NEW
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
              accountType: parsed.accountType || 'Savings',
              profilePictureUrl: parsed.profilePictureUrl || null
            });
          } catch {
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
              idStatus: "inactive", // ✅ NEW
              membershipLevel: "Registered Member",
              bvPoints: 0,
              referrals: 0,
              currentRank: "New Member",
              nextRank: "Silver Member",
              neededReferrals: 10,
              isKycCompleted: false,
              profilePictureUrl: null
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
            idStatus: "inactive", // ✅ NEW
            membershipLevel: "Registered Member",
            bvPoints: 0,
            referrals: 0,
            currentRank: "New Member",
            nextRank: "Silver Member",
            neededReferrals: 10,
            isKycCompleted: false,
            profilePictureUrl: null
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

  // ── Persist a fresh profilePictureUrl into both state + the cached localStorage copy ──
  const applyProfilePicture = (url: string | null) => {
    setProfile((prev) => (prev ? { ...prev, profilePictureUrl: url } : prev));
    try {
      const cached = localStorage.getItem('userProfile');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.profilePictureUrl = url;
        localStorage.setItem('userProfile', JSON.stringify(parsed));
      }
    } catch {
      // non-fatal — cache is just a fallback for the profile page
    }
  };

  // ── Avatar action sheet handlers ──
  const openAvatarSheet = () => {
    setAvatarError(null);
    setShowAvatarSheet(true);
  };
  const closeAvatarSheet = () => {
    if (uploadingAvatar) return;
    setShowAvatarSheet(false);
  };

  const triggerGalleryPicker = () => {
    setShowAvatarSheet(false);
    galleryInputRef.current?.click();
  };

  // ── Live camera modal: start stream, capture a frame, or fall back ──
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const closeCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
    setCameraError(null);
  };

  const triggerCameraCapture = async () => {
    setShowAvatarSheet(false);
    setCameraError(null);
    setShowCameraModal(true);
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      // Permission denied, no camera device, or an insecure (non-HTTPS) context
      const message =
        err?.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera permission and try again, or choose from gallery instead.'
          : err?.name === 'NotFoundError'
          ? 'No camera was found on this device. Try choosing from gallery instead.'
          : 'Could not start the camera. Try choosing from gallery instead.';
      setCameraError(message);
    } finally {
      setCameraStarting(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontally so the captured photo matches what the user saw (selfie view)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `profile-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        closeCameraModal();
        uploadAvatar(file);
      },
      'image/jpeg',
      0.92
    );
  };

  const validateImageFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return 'Please choose a JPG, PNG, or WEBP image.';
    if (file.size > 5 * 1024 * 1024) return 'Image must be smaller than 5MB.';
    return null;
  };

  // Make sure the camera is always released if the component unmounts mid-stream
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const uploadAvatar = async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/Auth/profile-picture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`, // no Content-Type — browser sets multipart boundary
        },
        body: formData,
      });

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userProfile');
        router.push('/login');
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to upload profile picture.');
      }

      applyProfilePicture(data.profilePictureUrl ?? null);
    } catch (err: any) {
      setAvatarError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setShowAvatarSheet(false);
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const response = await fetch(`${API_BASE}/api/Auth/profile-picture`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to remove profile picture.');
      }

      applyProfilePicture(null);
    } catch (err: any) {
      setAvatarError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (file) uploadAvatar(file);
  };

  // ✅ Open the Change Password modal (resets any previous state)
  const openPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    if (changingPassword) return; // don't allow closing mid-request
    setShowPasswordModal(false);
  };

  // ✅ Submit new password to the backend
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setChangingPassword(true);

      const response = await fetch(`${API_BASE}/api/Auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userProfile');
        router.push('/login');
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPasswordError(data?.message || 'Failed to change password. Please try again.');
        return;
      }

      setPasswordSuccess(data?.message || 'Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Close the modal shortly after showing the success message
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 1500);

    } catch (err) {
      console.error('Change Password Exception Error:', err);
      setPasswordError('Something went wrong. Please check your connection and try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F4F7FC] overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        <LoginTopBar />

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-[#F4F7FC]">

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
            <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 mt-2 sm:mt-4 animate-fadeIn pb-10">

              {/* HEADER CONTAINER */}
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-4 sm:p-6 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 relative z-10">
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0 w-full md:w-auto">
                    {/* ── AVATAR (tap to change) ── */}
                    <button
                      type="button"
                      onClick={openAvatarSheet}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0 group focus:outline-none"
                      aria-label="Change profile picture"
                    >
                      {profile.profilePictureUrl ? (
                        <img
                          src={profile.profilePictureUrl}
                          alt={profile.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md shadow-indigo-900/20 border border-gray-100"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#2B4C7E] flex items-center justify-center font-bold text-xl sm:text-2xl text-white shadow-md shadow-indigo-900/20">
                          {profile.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Loading overlay while uploading/removing */}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                          <Loader2 size={20} className="text-white animate-spin" />
                        </div>
                      )}

                      {/* Edit pencil badge */}
                      {!uploadingAvatar && (
                        <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center group-hover:bg-gray-50 transition-colors">
                          <span className="w-full h-full rounded-full bg-[#2B4C7E] flex items-center justify-center">
                            <Pencil size={11} className="text-white" />
                          </span>
                        </span>
                      )}
                    </button>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <h1 className="text-lg sm:text-2xl font-bold text-[#1E293B] tracking-tight uppercase truncate">{profile.name}</h1>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] sm:text-xs font-medium text-gray-400 flex items-center gap-1 bg-gray-50 px-2 sm:px-2.5 py-1 rounded-md border border-gray-100 whitespace-nowrap">
                          <User size={12} /> ID: <span className="font-mono font-bold text-gray-700">{profile.memberId}</span>
                        </span>

                        {/* ✅ ID STATUS BADGE — active or inactive */}
                        {profile.idStatus === 'active' ? (
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap">
                            <CircleCheck size={11} className="mr-1" /> ID Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold tracking-wide bg-red-50 text-red-500 border border-red-200 whitespace-nowrap">
                            <CircleX size={11} className="mr-1" /> ID Inactive
                          </span>
                        )}

                        {profile.isKycCompleted ? (
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap">
                            <CheckCircle size={11} className="mr-1" /> KYC Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold tracking-wide bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
                            <ShieldAlert size={11} className="mr-1" /> KYC Pending
                          </span>
                        )}
                      </div>

                      {avatarError && (
                        <p className="text-[11px] font-medium text-red-600 flex items-center gap-1 pt-0.5">
                          <AlertCircle size={11} /> {avatarError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50/70 border border-gray-100 rounded-xl px-1 py-3 sm:p-4 w-full md:w-auto md:min-w-[320px]">
                    <div className="px-1 sm:px-4 text-center flex flex-col items-center">
                      <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joined</p>
                      <p className="text-xs sm:text-sm font-bold text-gray-700 mt-1 leading-tight">{profile.joinDate}</p>
                    </div>
                    <div className="px-1 sm:px-4 text-center flex flex-col items-center">
                      <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Purchase BV</p>
                      <p className="text-xs sm:text-sm font-bold text-[#2B4C7E] mt-1 leading-tight whitespace-nowrap">{profile.bvPoints} <span className="text-[9px] sm:text-[10px] font-semibold text-[#2B4C7E]/70">BV</span></p>
                    </div>
                    <div className="px-1 sm:px-4 text-center flex flex-col items-center">
                      <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Leg</p>
                      <p className="text-xs sm:text-sm font-bold text-indigo-600 mt-1 uppercase font-mono leading-tight">{profile.position}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* REGISTRATION PROFILE */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-4 sm:p-6 space-y-4 sm:space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <User size={18} className="text-[#2B4C7E]" />
                    <h2 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">Registration Profile</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
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
                  <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-4 sm:p-6 space-y-4 sm:space-y-5">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                      <Landmark size={18} className="text-[#2B4C7E]" />
                      <h2 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">Settlement Node Account</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
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
                  <div className="bg-[#FFFDF5] rounded-2xl border border-amber-200 p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden">
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

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <button
                  onClick={openPasswordModal}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-[#2B4C7E] hover:bg-[#1E355B] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
                >
                  <Lock size={14} /> Change Password
                </button>
                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition sm:ml-auto">
                  <Download size={14} /> Print Identity Badge
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── Hidden file inputs (gallery vs camera capture) ── */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={handleFileInputChange}
      />
      {/* Hidden canvas used to grab a still frame from the live camera preview */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ✅ AVATAR ACTION SHEET */}
      {showAvatarSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={closeAvatarSheet}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 relative animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">Profile Picture</h2>
              <button
                onClick={closeAvatarSheet}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={triggerCameraCapture}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-left"
              >
                <span className="w-9 h-9 rounded-lg bg-[#2B4C7E]/10 text-[#2B4C7E] flex items-center justify-center shrink-0">
                  <Camera size={17} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#334155]">Take Photo</p>
                  <p className="text-[11px] text-gray-400">Use your device camera</p>
                </div>
              </button>

              <button
                onClick={triggerGalleryPicker}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-left"
              >
                <span className="w-9 h-9 rounded-lg bg-[#2B4C7E]/10 text-[#2B4C7E] flex items-center justify-center shrink-0">
                  <ImageIcon size={17} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#334155]">Choose from Gallery</p>
                  <p className="text-[11px] text-gray-400">Pick an existing photo</p>
                </div>
              </button>

              {profile?.profilePictureUrl && (
                <button
                  onClick={removeAvatar}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-100 hover:bg-red-50 transition text-left"
                >
                  <span className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <Trash2 size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-red-600">Remove Photo</p>
                    <p className="text-[11px] text-red-400">Go back to your initials</p>
                  </div>
                </button>
              )}
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-4">JPG, PNG, or WEBP — max 5MB</p>
          </div>
        </div>
      )}

      {/* ✅ LIVE CAMERA CAPTURE MODAL */}
      {showCameraModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeCameraModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">Take Photo</h2>
              <button
                onClick={closeCameraModal}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative bg-black aspect-square w-full flex items-center justify-center">
              {cameraStarting && (
                <div className="flex flex-col items-center gap-2 text-white/80">
                  <Loader2 size={24} className="animate-spin" />
                  <p className="text-xs font-medium">Starting camera…</p>
                </div>
              )}

              {cameraError && !cameraStarting && (
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <AlertCircle size={22} className="text-red-400" />
                  <p className="text-xs font-medium text-white/90">{cameraError}</p>
                  <button
                    onClick={() => {
                      closeCameraModal();
                      triggerGalleryPicker();
                    }}
                    className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-white text-[#2B4C7E] text-xs font-bold uppercase tracking-wider rounded-lg"
                  >
                    <ImageIcon size={14} /> Choose from Gallery
                  </button>
                </div>
              )}

              {/* Video is always mounted (not just when stream is ready) so the ref
                  exists before getUserMedia resolves; it's simply covered by the
                  overlays above until the stream attaches. */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraStarting || cameraError ? 'invisible absolute' : ''}`}
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>

            {!cameraStarting && !cameraError && (
              <div className="flex items-center justify-center py-5">
                <button
                  onClick={capturePhoto}
                  aria-label="Capture photo"
                  className="w-16 h-16 rounded-full border-4 border-[#2B4C7E] flex items-center justify-center group"
                >
                  <span className="w-12 h-12 rounded-full bg-[#2B4C7E] group-active:scale-90 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={closePasswordModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePasswordModal}
              disabled={changingPassword}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition disabled:opacity-40"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 bg-[#2B4C7E]/10 text-[#2B4C7E] rounded-lg">
                <Lock size={18} />
              </div>
              <h2 className="text-base font-bold text-[#1E293B] uppercase tracking-wider">Change Password</h2>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <CheckCircle size={14} className="shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    disabled={changingPassword}
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2B4C7E]/30 focus:border-[#2B4C7E] disabled:bg-gray-50"
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={changingPassword}
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2B4C7E]/30 focus:border-[#2B4C7E] disabled:bg-gray-50"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={changingPassword}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2B4C7E]/30 focus:border-[#2B4C7E] disabled:bg-gray-50"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-[#2B4C7E] hover:bg-[#1E355B] text-white transition disabled:opacity-60"
                >
                  {changingPassword && <Loader2 size={14} className="animate-spin" />}
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}