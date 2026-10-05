'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Undo2, Search, RefreshCw, ChevronDown, ChevronUp, Eye, CheckCircle, XCircle,
  Clock, Package, User, Hash, Calendar, Filter, X, Loader2, AlertCircle, Wallet,
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar';

const BASE_URL = 'https://rd-api-j7zj.onrender.com';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReturnStatus = 'Pending' | 'Approved' | 'Rejected';

interface ReturnItem {
  productId: number;
  productNo: string;
  productName: string;
  quantity: number;
  dp: number;
  lineTotal: number;
}

interface ReturnRequest {
  id: number;
  requestNo: string;
  pucId: string;
  centerName: string;
  items: ReturnItem[];
  subTotalDp: number;
  deductionPercent: number;
  deductionAmount: number;
  creditAmount: number;
  reason?: string | null;
  status: ReturnStatus;
  requestedAt: string;
  processedAt?: string | null;
  rejectionReason?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('authToken') ?? localStorage.getItem('token')
      : null;
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const STATUS_CONFIG: Record<ReturnStatus, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Pending:  { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  Approved: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle },
  Rejected: { color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   icon: XCircle },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try { return JSON.parse(text).message ?? `HTTP ${res.status}`; } catch { return text || `HTTP ${res.status}`; }
}

function StatusBadge({ status }: { status: ReturnStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon size={11} /> {status}
    </span>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-fadeIn ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function ReturnDetailModal({
  request, onClose, onDone,
}: {
  request: ReturnRequest;
  onClose: () => void;
  onDone: (id: number, status: ReturnStatus, message: string) => void;
}) {
  const [updating, setUpdating] = useState<'approve' | 'reject' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isPending = request.status === 'Pending';
  const units = request.items.reduce((s, i) => s + i.quantity, 0);

  const submit = async (status: 'Approved' | 'Rejected') => {
    setUpdating(status === 'Approved' ? 'approve' : 'reject');
    setActionError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/Admin/pickup-center-returns/${request.id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          rejectionReason: status === 'Rejected' ? rejectReason.trim() || null : null,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json().catch(() => ({}));
      onDone(request.id, status, data?.message ?? `Return ${status.toLowerCase()}`);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto relative animate-slideUp sm:animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Undo2 size={16} className="text-[#3B5998]" />
            <h2 className="text-sm font-black text-gray-900">Return {request.requestNo}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Status</span>
            <StatusBadge status={request.status} />
          </div>

          {/* Center info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pickup Center</p>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Center Name</p>
                  <p className="text-xs font-semibold text-gray-800 break-words">{request.centerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Hash size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Center ID</p>
                  <p className="text-xs font-semibold text-gray-800 font-mono">{request.pucId}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Requested</p>
                  <p className="text-xs font-semibold text-gray-800">{formatDate(request.requestedAt)}</p>
                </div>
              </div>
              {request.processedAt && (
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Processed</p>
                    <p className="text-xs font-semibold text-gray-800">{formatDate(request.processedAt)}</p>
                  </div>
                </div>
              )}
            </div>
            {request.reason && (
              <div className="pt-2 border-t border-gray-200/60">
                <p className="text-[10px] text-gray-400">Reason given by center</p>
                <p className="text-xs font-semibold text-gray-800 break-words">{request.reason}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Package size={12} /> Products to return ({units} units)
            </p>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden">
              {request.items.map(it => (
                <div key={it.productId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{it.productName}</p>
                    <p className="text-[11px] text-gray-400">
                      <span className="font-mono">{it.productNo}</span> · {it.quantity} × {formatCurrency(it.dp)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-gray-800 shrink-0">{formatCurrency(it.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Amount breakdown */}
          <div className="bg-[#3B5998]/5 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Total (DP)</span><span className="font-semibold">{formatCurrency(request.subTotalDp)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Deduction ({request.deductionPercent}%)</span>
              <span className="font-semibold">− {formatCurrency(request.deductionAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#3B5998]/10 text-sm font-black text-gray-900">
              <span className="flex items-center gap-1.5"><Wallet size={13} className="text-green-600" /> Credit to center wallet</span>
              <span className="text-green-600">{formatCurrency(request.creditAmount)}</span>
            </div>
          </div>

          {request.status === 'Rejected' && request.rejectionReason && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <span className="font-bold">Rejection note: </span>{request.rejectionReason}
            </div>
          )}

          {actionError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {actionError}
            </div>
          )}

          {/* Actions */}
          {isPending && (
            rejecting ? (
              <div className="space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (optional, shown to the center)…"
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setRejecting(false)}
                    disabled={!!updating}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => submit('Rejected')}
                    disabled={!!updating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-bold rounded-xl"
                  >
                    {updating === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                    Confirm Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setRejecting(true)}
                  disabled={!!updating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl"
                >
                  <XCircle size={13} /> Reject
                </button>
                <button
                  onClick={() => submit('Approved')}
                  disabled={!!updating}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-bold rounded-xl"
                >
                  {updating === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Approve &amp; Credit Wallet
                </button>
              </div>
            )
          )}
          {isPending && !rejecting && (
            <p className="text-[11px] text-gray-400 text-center">
              Approving removes these units from the center&apos;s stock, returns them to company stock and credits {formatCurrency(request.creditAmount)} to its wallet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReturnProductsPage() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [filtered, setFiltered] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'All'>('All');
  const [sortField, setSortField] = useState<'requestedAt' | 'creditAmount'>('requestedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/Admin/pickup-center-returns`, { headers: getAuthHeaders() });
      if (res.status === 401) throw new Error('Session expired or insufficient permissions. Please log out and log back in.');
      if (!res.ok) throw new Error(await readError(res));
      const data: ReturnRequest[] = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load return requests';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = [...requests];
    if (statusFilter !== 'All') result = result.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.requestNo.toLowerCase().includes(q) ||
        r.centerName.toLowerCase().includes(q) ||
        r.pucId.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      const va = sortField === 'requestedAt' ? new Date(a.requestedAt).getTime() : a.creditAmount;
      const vb = sortField === 'requestedAt' ? new Date(b.requestedAt).getTime() : b.creditAmount;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    setFiltered(result);
  }, [requests, search, statusFilter, sortField, sortDir]);

  const handleDone = (_id: number, status: ReturnStatus, message: string) => {
    showToast(message, status === 'Approved' ? 'success' : 'error');
    load(); // refresh from the server so status/processed time are exact
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ChevronDown size={12} className="opacity-30" />;

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const th = 'px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <LoginTopbar />
        <main className="flex-1 pb-24 md:pb-8 overflow-y-auto">
          {toast && <Toast message={toast.message} type={toast.type} />}

          {/* Page Header */}
          <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 sm:py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#3B5998]/10 flex items-center justify-center shrink-0">
                  <Undo2 size={18} className="text-[#3B5998]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black text-gray-900 leading-tight truncate">
                    Return Products
                    {pendingCount > 0 && (
                      <span className="ml-2 align-middle px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                        {pendingCount} pending
                      </span>
                    )}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-gray-400 truncate">Stock return requests from pickup centers</p>
                </div>
              </div>
              <button
                onClick={load}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#3B5998] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 shrink-0"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden xs:inline">Refresh</span>
              </button>
            </div>
          </div>

          <div className="px-4 md:px-8 py-5 space-y-5">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 w-full">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search request ID, center name, center ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30 focus:border-[#3B5998]"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X size={14} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter size={14} className="text-gray-400 shrink-0 hidden sm:inline" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as ReturnStatus | 'All')}
                  className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30"
                >
                  <option value="All">All Statuses</option>
                  {(Object.keys(STATUS_CONFIG) as ReturnStatus[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={28} className="animate-spin text-[#3B5998]" />
                <p className="text-sm text-gray-400">Loading return requests…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-sm font-semibold text-gray-700">Could not load return requests</p>
                <p className="text-xs text-gray-400 max-w-xs">{error}</p>
                <button onClick={load} className="mt-2 px-4 py-2 bg-[#3B5998] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  Try Again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Undo2 size={32} className="text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">No return requests found</p>
                <p className="text-xs text-gray-400">
                  {requests.length === 0 ? 'Pickup centers haven’t requested any returns yet.' : 'Adjust your search or status filter.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className={th}>Request ID</th>
                        <th className={th}>Pickup Center</th>
                        <th className={th}>Items</th>
                        <th className={`${th} cursor-pointer select-none`} onClick={() => toggleSort('creditAmount')}>
                          <span className="flex items-center gap-1">Credit <SortIcon field="creditAmount" /></span>
                        </th>
                        <th className={`${th} cursor-pointer select-none`} onClick={() => toggleSort('requestedAt')}>
                          <span className="flex items-center gap-1">Requested <SortIcon field="requestedAt" /></span>
                        </th>
                        <th className={th}>Status</th>
                        <th className={`${th} text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-4"><span className="font-mono text-xs font-semibold text-[#3B5998]">{r.requestNo}</span></td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-gray-800">{r.centerName}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{r.pucId}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs text-gray-600">
                              {r.items.reduce((s, i) => s + i.quantity, 0)} unit{r.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
                              <span className="text-gray-400"> · {r.items.length} product{r.items.length !== 1 ? 's' : ''}</span>
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-bold text-gray-800">{formatCurrency(r.creditAmount)}</p>
                            <p className="text-[11px] text-gray-400">of {formatCurrency(r.subTotalDp)}</p>
                          </td>
                          <td className="px-5 py-4"><span className="text-xs text-gray-500">{formatDate(r.requestedAt)}</span></td>
                          <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setSelected(r)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#3B5998]/10 hover:bg-[#3B5998]/20 text-[#3B5998] text-[11px] font-semibold rounded-lg transition-colors"
                            >
                              <Eye size={12} /> {r.status === 'Pending' ? 'Review' : 'View'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filtered.map(r => (
                    <div
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-[#3B5998]">{r.requestNo}</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{r.centerName}</p>
                          <p className="text-[11px] text-gray-400 font-mono truncate">{r.pucId}</p>
                        </div>
                        <div className="shrink-0"><StatusBadge status={r.status} /></div>
                      </div>
                      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 min-w-0">
                          <span className="truncate">{r.items.reduce((s, i) => s + i.quantity, 0)} units</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 inline-block shrink-0" />
                          <span className="truncate">{formatDate(r.requestedAt).split(',')[0]}</span>
                        </div>
                        <span className="text-sm font-black text-gray-800 shrink-0">{formatCurrency(r.creditAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 text-center pt-2">
                  Showing {filtered.length} of {requests.length} requests
                </p>
              </>
            )}
          </div>
        </main>
      </div>

      {selected && (
        <ReturnDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}