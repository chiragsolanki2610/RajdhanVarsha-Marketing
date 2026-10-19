'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Loader2,
  Search,
  PackageSearch,
  ChevronRight,
  FileText,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import PickupCenterSidebar from '@/components/pickup_centersidebar';
import PickupCenterTopbar from '@/components/pickup_centertopbar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://rd-api-j7zj.onrender.com';

// The API only returns the last 2 months; keep the UI in sync with that.
const HISTORY_MONTHS = 2;

type Source = 'Counter Sale' | 'Plan Activation' | 'Online Order';

interface SaleItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Sale {
  orderId: number;
  orderNo: string;
  source: Source;
  planType: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  paymentMethod?: string | null;
  items: SaleItem[];
  totalItems: number;
  totalAmount: number;
  totalBv: number;
  soldAt: string;
  receiptAvailable: boolean;
}

const sourceStyles: Record<Source, { badge: string; dot: string }> = {
  'Counter Sale': { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  'Plan Activation': { badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  'Online Order': { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

const SOURCES: Source[] = ['Counter Sale', 'Plan Activation', 'Online Order'];

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// yyyy-MM-dd in the user's local timezone (used for the date-range filter)
const toLocalDay = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};
const localDay = (iso: string) => toLocalDay(new Date(iso));

export default function SellHistoryPage() {
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState('');

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | Source>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Sale | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Date picker bounds: last 2 months → today
  const { minDay, maxDay } = useMemo(() => {
    const now = new Date();
    const min = new Date(now);
    min.setMonth(min.getMonth() - HISTORY_MONTHS);
    return { minDay: toLocalDay(min), maxDay: toLocalDay(now) };
  }, []);

  const getToken = () =>
    typeof window === 'undefined' ? null : localStorage.getItem('pucToken');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pucInfo');
      if (raw) setOperatorName(JSON.parse(raw)?.fullName || '');
    } catch (e) {
      console.error('Failed parsing pucInfo from localStorage:', e);
    }
  }, []);

  const logoutToLogin = useCallback(() => {
    localStorage.removeItem('pucToken');
    localStorage.removeItem('pucInfo');
    router.replace('/pickup-center');
  }, [router]);

  const fetchHistory = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace('/pickup-center');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/PickupCenter/sell-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        logoutToLogin();
        return;
      }
      if (!res.ok) throw new Error(`Failed to load sell history (status ${res.status})`);

      const data = await res.json();
      setSales(Array.isArray(data?.sales) ? data.sales : []);
    } catch (err: any) {
      console.error('Error fetching sell history:', err);
      setError(err?.message || 'Something went wrong while loading sell history.');
    } finally {
      setIsLoading(false);
    }
  }, [router, logoutToLogin]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Close the popup with Escape + lock background scroll while it is open
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (sourceFilter !== 'All' && s.source !== sourceFilter) return false;

      const day = localDay(s.soldAt);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;

      if (!q) return true;
      return (
        s.orderNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.customerId.toLowerCase().includes(q) ||
        (s.customerPhone ?? '').toLowerCase().includes(q) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });
  }, [sales, search, sourceFilter, fromDate, toDate]);

  // Totals for whatever is currently filtered on screen
  const shown = useMemo(
    () => ({
      sales: filtered.length,
      items: filtered.reduce((a, s) => a + s.totalItems, 0),
      amount: filtered.reduce((a, s) => a + s.totalAmount, 0),
      bv: filtered.reduce((a, s) => a + s.totalBv, 0),
    }),
    [filtered]
  );

  const activeFilterCount =
    (sourceFilter !== 'All' ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);
  const isFiltered = !!search || activeFilterCount > 0;

  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setSourceFilter('All');
  };

  const downloadReceipt = async (sale: Sale) => {
    const token = getToken();
    if (!token) {
      router.replace('/pickup-center');
      return;
    }
    setDownloadingId(sale.orderId);
    try {
      const res = await fetch(
        `${API_BASE}/api/PickupCenter/sell-history/${sale.orderId}/receipt`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Receipt is not available for this sale.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      alert(e?.message || 'Could not download receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  const statCards = [
    { label: 'Sales', value: String(shown.sales) },
    { label: 'Items', value: shown.items.toLocaleString('en-IN') },
    { label: 'Amount', value: inr(shown.amount) },
    { label: 'BV', value: shown.bv.toLocaleString('en-IN') },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PickupCenterSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <PickupCenterTopbar title="Sell History" operatorName={operatorName} />

        <main className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
          {/* Summary strip */}
          <div className="grid grid-cols-4 bg-white border border-gray-100 rounded-2xl shadow-sm divide-x divide-gray-100 mb-4">
            {statCards.map(({ label, value }) => (
              <div key={label} className="px-2 py-3 text-center min-w-0">
                <p className="text-sm sm:text-lg font-bold text-[#3B5998] truncate">{value}</p>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Search + filter toggle + refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, product, order no."
                className="w-full pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30"
              />
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Filters"
              className={`relative shrink-0 p-2.5 rounded-xl border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-[#3B5998]/40 text-[#3B5998] bg-[#3B5998]/5'
                  : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#3B5998] text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={fetchHistory}
              disabled={isLoading}
              aria-label="Refresh"
              className="shrink-0 p-2.5 rounded-xl border border-gray-200 text-gray-500 bg-white hover:text-[#3B5998] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Collapsible filters */}
          {showFilters && (
            <div className="mt-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['All', ...SOURCES] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSourceFilter(s)}
                    className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                      sourceFilter === s
                        ? 'bg-[#3B5998] text-white border-[#3B5998]'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    From
                  </span>
                  <input
                    type="date"
                    value={fromDate}
                    min={minDay}
                    max={toDate || maxDay}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full min-w-0 text-sm text-gray-800 border border-gray-200 rounded-xl px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    To
                  </span>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || minDay}
                    max={maxDay}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full min-w-0 text-sm text-gray-800 border border-gray-200 rounded-xl px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30"
                  />
                </label>
              </div>

              {isFiltered && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-gray-500 hover:text-[#3B5998]"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          <p className="mt-3 mb-2 px-1 text-xs text-gray-400">
            Showing the last {HISTORY_MONTHS} months
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Loader2 size={28} className="animate-spin mb-3" />
              <p className="text-sm">Loading sell history…</p>
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <PackageSearch size={36} className="mb-3" />
              <p className="text-sm font-medium">
                {sales.length === 0 ? 'No sales in the last 2 months' : 'No sales match your filters'}
              </p>
            </div>
          )}

          {/* Minimal list: customer · date · amount. Everything else is in the popup. */}
          {!isLoading && !error && filtered.length > 0 && (
            <ul className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {filtered.map((s) => (
                <li key={s.orderId}>
                  <button
                    type="button"
                    onClick={() => setSelected(s)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${sourceStyles[s.source].dot}`}
                      title={s.source}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">{s.customerName}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {formatDate(s.soldAt)} · {s.source}
                      </p>
                    </div>
                    <p className="font-bold text-gray-800 shrink-0">{inr(s.totalAmount)}</p>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>

      {/* Detail popup */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Sale ${selected.orderNo}`}
        >
          <div
            className="relative w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close (X) – top right */}
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="px-5 pt-5 pb-4 pr-14 border-b border-gray-100">
              <span
                className={`inline-block text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${sourceStyles[selected.source].badge}`}
              >
                {selected.source}
              </span>
              <h2 className="mt-2 text-lg font-bold text-gray-800 break-words">
                {selected.customerName}
              </h2>
              <p className="text-xs text-gray-400 break-all">
                {selected.customerId}
                {selected.customerPhone ? ` · ${selected.customerPhone}` : ''}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Order</dt>
                  <dd className="font-mono text-gray-700">#{selected.orderNo}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Date</dt>
                  <dd className="text-gray-700">{formatDateTime(selected.soldAt)}</dd>
                </div>
                {selected.paymentMethod && (
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Payment</dt>
                    <dd className="text-gray-700 uppercase">{selected.paymentMethod}</dd>
                  </div>
                )}
                {selected.source === 'Plan Activation' && selected.planType && (
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Plan</dt>
                    <dd className="text-gray-700">{selected.planType}</dd>
                  </div>
                )}
              </dl>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-2">
                  Items ({selected.totalItems})
                </p>
                {selected.items.length === 0 ? (
                  <p className="text-sm text-gray-400">Item details not available for this sale.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                    {selected.items.map((i, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="text-gray-800 break-words">{i.productName}</p>
                          <p className="text-xs text-gray-400">
                            {i.quantity} × {inr(i.unitPrice)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-800 shrink-0">{inr(i.lineTotal)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Total</p>
                  <p className="text-xl font-bold text-gray-800">{inr(selected.totalAmount)}</p>
                </div>
                <p className="text-sm text-gray-500">{selected.totalBv} BV</p>
              </div>

              {selected.receiptAvailable && (
                <button
                  onClick={() => downloadReceipt(selected)}
                  disabled={downloadingId === selected.orderId}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#3B5998] hover:bg-[#344e86] rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                >
                  {downloadingId === selected.orderId ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileText size={15} />
                  )}
                  View receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}