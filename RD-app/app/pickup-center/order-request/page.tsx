'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  PackageSearch,
  Loader2,
  Eye,
  X,
  User,
  Hash,
  Phone,
  CalendarDays,
  Link2,
  FileText,
} from 'lucide-react';
import PickupCenterSidebar from '@/components/pickup_centersidebar';
import PickupCenterTopbar from '@/components/pickup_centertopbar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:56187';

type RequestStatus = 'Pending' | 'Accepted' | 'Rejected';

interface OrderRequestItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

interface OrderRequest {
  id: number;
  requestNo: string;
  userId: number;
  userName: string;
  userPhone?: string;
  items: OrderRequestItem[];
  totalAmount: number;
  status: RequestStatus;
  createdAt: string;
  utrNumber?: string;
  screenshotUrl?: string | null;
}

interface PucInfo {
  pucId: string;
  username: string;
  fullName: string;
  centerName: string;
  token: string;
}

export default function OrderRequestPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'All' | RequestStatus>('Pending');
  const [operatorName, setOperatorName] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<OrderRequest | null>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pucToken');
  };

  // Load operator info (for topbar "Welcome back, ...")
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pucInfo');
      if (raw) {
        const parsed: PucInfo = JSON.parse(raw);
        setOperatorName(parsed?.fullName || '');
      }
    } catch (e) {
      console.error('Failed parsing pucInfo from localStorage:', e);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace('/pickup-center');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/PickupCenter/order-requests`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem('pucToken');
        localStorage.removeItem('pucInfo');
        router.replace('/pickup-center');
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load order requests (status ${res.status})`);
      }

      const data = await res.json();
      setRequests(Array.isArray(data) ? data : data?.requests || []);
    } catch (err: any) {
      console.error('Error fetching order requests:', err);
      setError(err?.message || 'Something went wrong while loading requests.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Keep the open modal's data in sync if the underlying list updates (e.g. after a decision)
  useEffect(() => {
    if (!selectedRequest) return;
    const updated = requests.find((r) => r.id === selectedRequest.id);
    if (updated) setSelectedRequest(updated);
  }, [requests, selectedRequest?.id]);

  const handleDecision = async (id: number, decision: 'accept' | 'reject') => {
    const token = getToken();
    if (!token) {
      router.replace('/pickup-center');
      return;
    }

    const confirmMsg =
      decision === 'accept'
        ? 'Accept this order request?'
        : 'Reject this order request? This action cannot be undone.';
    if (!window.confirm(confirmMsg)) return;

    setActioningId(id);
    try {
      const res = await fetch(`${API_BASE}/api/PickupCenter/order-requests/${id}/${decision}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Failed to ${decision} request (status ${res.status})`);
      }

      // Update local state optimistically instead of a full refetch
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: decision === 'accept' ? 'Accepted' : 'Rejected' }
            : r
        )
      );

      // Close the modal once a decision has been made
      setSelectedRequest(null);
    } catch (err: any) {
      console.error(`Error trying to ${decision} request:`, err);
      alert(err?.message || `Failed to ${decision} the request. Please try again.`);
    } finally {
      setActioningId(null);
    }
  };

  const filteredRequests = requests.filter((r) =>
    filter === 'All' ? true : r.status === filter
  );

  const statusStyles: Record<RequestStatus, string> = {
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Accepted: 'bg-green-50 text-green-700 border-green-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PickupCenterSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <PickupCenterTopbar title="Order Requests" operatorName={operatorName} />

        <main className="flex-1 p-3 sm:p-4 md:p-8">
          {/* Filter Tabs + Refresh */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm overflow-x-auto max-w-full">
              {(['Pending', 'Accepted', 'Rejected', 'All'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    filter === tab
                      ? 'bg-[#3B5998] text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              onClick={fetchRequests}
              disabled={isLoading}
              className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#3B5998] bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              <span className="hidden xs:inline">Refresh</span>
            </button>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Loader2 size={28} className="animate-spin mb-3" />
              <p className="text-sm">Loading order requests…</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && filteredRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <PackageSearch size={36} className="mb-3" />
              <p className="text-sm font-medium">No {filter !== 'All' ? filter.toLowerCase() : ''} order requests found</p>
            </div>
          )}

          {/* Requests — table on md+ screens, stacked cards on mobile */}
          {!isLoading && !error && filteredRequests.length > 0 && (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="text-left font-semibold text-gray-400 text-[11px] uppercase tracking-wide px-5 py-3">Request</th>
                        <th className="text-left font-semibold text-gray-400 text-[11px] uppercase tracking-wide px-5 py-3">Member</th>
                        <th className="text-left font-semibold text-gray-400 text-[11px] uppercase tracking-wide px-5 py-3">Items</th>
                        <th className="text-left font-semibold text-gray-400 text-[11px] uppercase tracking-wide px-5 py-3">Amount</th>
                        <th className="text-left font-semibold text-gray-400 text-[11px] uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Requested</th>
                        <th className="text-left font-semibold text-gray-400 text-[11px] uppercase tracking-wide px-5 py-3">Status</th>
                        <th className="text-right font-semibold text-gray-400 text-[11px] uppercase tracking-wide px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((req) => (
                        <tr key={req.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-4 text-xs text-gray-400 font-mono whitespace-nowrap">#{req.requestNo}</td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-800">{req.userName}</p>
                            {req.userPhone && <p className="text-xs text-gray-400">{req.userPhone}</p>}
                          </td>
                          <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                            {req.items.length} {req.items.length === 1 ? 'item' : 'items'}
                          </td>
                          <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">
                            ₹{req.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-4 text-gray-500 whitespace-nowrap hidden lg:table-cell">{formatDate(req.createdAt)}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2.5 py-1 inline-flex items-center gap-1 ${statusStyles[req.status]}`}
                            >
                              {req.status === 'Pending' && <Clock size={11} />}
                              {req.status === 'Accepted' && <CheckCircle2 size={11} />}
                              {req.status === 'Rejected' && <XCircle size={11} />}
                              {req.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setSelectedRequest(req)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B5998] border border-[#3B5998]/20 hover:bg-[#3B5998]/5 rounded-lg px-3 py-1.5 transition-colors"
                            >
                              <Eye size={13} />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile stacked cards */}
              <div className="md:hidden space-y-3">
                {filteredRequests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 font-mono">#{req.requestNo}</p>
                        <p className="font-semibold text-gray-800 text-sm truncate">{req.userName}</p>
                        {req.userPhone && <p className="text-xs text-gray-400">{req.userPhone}</p>}
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-1 inline-flex items-center gap-1 ${statusStyles[req.status]}`}
                      >
                        {req.status === 'Pending' && <Clock size={11} />}
                        {req.status === 'Accepted' && <CheckCircle2 size={11} />}
                        {req.status === 'Rejected' && <XCircle size={11} />}
                        {req.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <div className="text-xs text-gray-500">
                        <p>{req.items.length} {req.items.length === 1 ? 'item' : 'items'}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(req.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800 text-sm">
                          ₹{req.totalAmount.toLocaleString('en-IN')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B5998]">
                          <Eye size={13} />
                          View
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Order Details Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle, mobile only */}
            <div className="sm:hidden flex justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 sm:px-6 pt-3 sm:pt-6 pb-4 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800">Order Details</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">#{selectedRequest.requestNo}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 -m-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 sm:px-6 pb-6 space-y-5">
              {/* Current status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Current Status</span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2.5 py-1 inline-flex items-center gap-1 ${statusStyles[selectedRequest.status]}`}
                >
                  {selectedRequest.status === 'Pending' && <Clock size={11} />}
                  {selectedRequest.status === 'Accepted' && <CheckCircle2 size={11} />}
                  {selectedRequest.status === 'Rejected' && <XCircle size={11} />}
                  {selectedRequest.status}
                </span>
              </div>

              {/* Member info */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Member Info</p>

                <div className="flex items-start gap-2.5">
                  <User size={15} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-gray-400">Name</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedRequest.userName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Hash size={15} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-gray-400">Member ID</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedRequest.userId}</p>
                  </div>
                </div>

                {selectedRequest.userPhone && (
                  <div className="flex items-start gap-2.5">
                    <Phone size={15} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-gray-400">Phone</p>
                      <p className="text-sm font-semibold text-gray-800">{selectedRequest.userPhone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5">
                  <CalendarDays size={15} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-gray-400">Requested</p>
                    <p className="text-sm font-semibold text-gray-800">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Payment verification */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[#3B5998] uppercase tracking-wide">Payment Verification</p>

                <div className="flex items-center gap-2.5">
                  <Link2 size={15} className="text-gray-400" />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-400 whitespace-nowrap">UTR / Ref:</p>
                    <p className="text-sm font-mono font-semibold text-gray-800 truncate">
                      {selectedRequest.utrNumber || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <FileText size={15} className="text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 mb-1.5">Payment Snapshot:</p>
                    {selectedRequest.screenshotUrl ? (
                      <a
                        href={selectedRequest.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block border border-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={selectedRequest.screenshotUrl}
                          alt="Payment screenshot"
                          className="w-full h-auto max-h-48 object-contain bg-gray-50"
                        />
                      </a>
                    ) : (
                      <div className="border border-dashed border-gray-200 rounded-lg py-6 text-center">
                        <p className="text-xs italic text-gray-400">No image receipt uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ordered items */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ordered Items</p>
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {selectedRequest.items.map((item, idx) => (
                    <div
                      key={`${selectedRequest.id}-${item.productId}-${idx}`}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <span className="text-gray-600">
                        {item.productName} <span className="text-gray-400">× {item.quantity}</span>
                      </span>
                      <span className="font-medium text-gray-700 whitespace-nowrap">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-1 pt-3">
                  <span className="text-sm font-semibold text-gray-500">Total</span>
                  <span className="text-base font-bold text-gray-800">
                    ₹{selectedRequest.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Spacer so content isn't hidden behind the sticky action bar on mobile */}
              {selectedRequest.status === 'Pending' && <div className="h-1 sm:hidden" />}
            </div>

            {/* Approve / Reject actions */}
            {selectedRequest.status === 'Pending' ? (
              <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <button
                  onClick={() => handleDecision(selectedRequest.id, 'reject')}
                  disabled={actioningId === selectedRequest.id}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                >
                  {actioningId === selectedRequest.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <XCircle size={15} />
                  )}
                  Reject
                </button>
                <button
                  onClick={() => handleDecision(selectedRequest.id, 'accept')}
                  disabled={actioningId === selectedRequest.id}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#3B5998] hover:bg-blue-800 rounded-xl px-4 py-2.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  {actioningId === selectedRequest.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  Accept
                </button>
              </div>
            ) : (
              <div className="px-5 sm:px-6 pb-6 text-center">
                <span className="text-xs text-gray-400 italic">
                  {selectedRequest.status === 'Accepted' ? 'This request has been approved' : 'This request has been declined'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}