'use client';

import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import {
  History,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  X,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Hash,
  Link as LinkIcon,
  FileText,
  Download,
  Filter,
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar';

// ─── BASE URL ─────────────────────────────────────────────────────────────────
const BASE_URL = 'https://rd-api-j7zj.onrender.com';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Delivered';

interface ApiOrderItem {
  productId?: string | number;
  productName?: string;
  name?: string;
  quantity?: number;
  price?: number;
  unitPrice?: number;
  amount?: number;
  dp?: number;   // ← your backend uses "dp" for price
  bv?: number;   // ← your backend uses "bv" for business volume
}

interface ApiOrder {
  id: string | number;
  userId?: string;
  memberName?: string;
  userName?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  address?: string;
  deliveryAddress?: string;
  utrNumber?: string;
  screenshotUrl?: string;
  totalAmount?: number;
  totalBv?: number;
  cartItemsJson?: string;
  status?: string;
  requestedAt?: string;
  processedAt?: string;
  updatedAt?: string;
  adminRemarks?: string;
  receiptAvailable?: boolean;
  items?: ApiOrderItem[];
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface MyOrder {
  orderId: string;
  memberName?: string;
  phone?: string;
  address?: string;
  utrNumber: string;
  screenshotUrl?: string;
  items: OrderItem[];
  totalAmount: number;
  totalBv: number;
  status: OrderStatus;
  requestedAt: string;
  processedAt?: string;
  adminRemarks?: string;
  receiptAvailable: boolean;
}

// ─── Auth Headers ─────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCartItems(cartItemsJson?: string): ApiOrderItem[] {
  if (!cartItemsJson) return [];
  try {
    const parsed = JSON.parse(cartItemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normaliseStatus(raw: string | undefined): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    processing: 'Processing',
    delivered: 'Delivered',
  };
  return map[(raw ?? '').toLowerCase()] ?? 'Pending';
}

function normaliseOrder(o: ApiOrder): MyOrder {
  const rawItems: ApiOrderItem[] =
    o.items?.length
      ? o.items
      : parseCartItems(o.cartItemsJson);

  const items: OrderItem[] = rawItems.map((it, idx) => ({
    productId: String(it.productId ?? idx),
    productName: it.productName ?? it.name ?? `Product ${it.productId ?? idx + 1}`,
    quantity: it.quantity ?? 1,
    price: it.dp ?? it.price ?? it.unitPrice ?? it.amount ?? 0, // ← "dp" is your price field
  }));

  const totalAmount =
    o.totalAmount ?? items.reduce((s, it) => s + it.price * it.quantity, 0);

  return {
    orderId: String(o.id),
    memberName: o.memberName ?? o.userName ?? o.name,
    phone: o.phone ?? o.phoneNumber,
    address: o.address ?? o.deliveryAddress,
    utrNumber: o.utrNumber ?? '—',
    screenshotUrl: o.screenshotUrl,
    items,
    totalAmount,
    totalBv: o.totalBv ?? 0,
    status: normaliseStatus(o.status),
    requestedAt: o.requestedAt ?? new Date().toISOString(),
    processedAt: o.processedAt ?? o.updatedAt,
    adminRemarks: o.adminRemarks,
    receiptAvailable: o.receiptAvailable ?? false,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType; desc: string }
> = {
  Pending:    { label: 'Pending',    color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: Clock,        desc: 'Awaiting admin review' },
  Approved:   { label: 'Approved',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: CheckCircle,  desc: 'Payment verified' },
  Processing: { label: 'Processing', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: RefreshCw,    desc: 'Order being processed' },
  Delivered:  { label: 'Delivered',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: Package,      desc: 'Order delivered' },
  Rejected:   { label: 'Rejected',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: XCircle,      desc: 'Payment rejected' },
};

// ─── Receipt PDF Generator ─────────────────────────────────────────────────────
// Mirrors the admin's buildReceiptPDF exactly, so the receipt the member
// downloads here is identical to the one the admin previewed & approved.
// No backend file storage required — it's rebuilt from the same order data
// (items, totals, UTR, admin remarks) that `my-orders` already returns.

function buildReceiptPDF(order: MyOrder): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 50;
  let y = margin;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('RAJ DHAN VARSHA', margin, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Official Order Receipt', margin, 58);
  doc.text(`Receipt #${order.orderId}`, pageW - margin, 40, { align: 'right' });
  doc.text(
    `Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    pageW - margin, 55, { align: 'right' }
  );

  y = 115;

  // Approved badge
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(margin, y - 14, 80, 20, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('APPROVED', margin + 40, y, { align: 'center' });
  y += 30;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 20;

  const col2X = pageW / 2 + 10;

  // Member info (only render fields that came back from the API)
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MEMBER INFORMATION', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  y += 16;
  doc.text(order.memberName || '—', margin, y);
  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  if (order.phone) { doc.text(`Phone: ${order.phone}`, margin, y); y += 13; }
  if (order.address) { doc.text(`Address: ${order.address}`, margin, y); y += 13; }

  let ry = 131 + 16; // align with member block start
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ORDER INFORMATION', col2X, ry);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  ry += 16;
  doc.text(`Order ID: #${order.orderId}`, col2X, ry);
  ry += 13;
  doc.text(`Requested: ${new Date(order.requestedAt).toLocaleString('en-IN')}`, col2X, ry);
  ry += 13;
  doc.text(`UTR / Ref: ${order.utrNumber}`, col2X, ry);
  ry += 13;
  doc.text('Payment: Verified', col2X, ry);

  y = Math.max(y, ry) + 25;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 20;

  // Items table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('ORDERED ITEMS', margin, y);
  y += 14;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 12, pageW - margin * 2, 22, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Product', margin + 8, y + 3);
  doc.text('Qty', pageW - margin - 160, y + 3, { align: 'right' });
  doc.text('Unit Price', pageW - margin - 80, y + 3, { align: 'right' });
  doc.text('Amount', pageW - margin - 8, y + 3, { align: 'right' });
  y += 22;

  order.items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 12, pageW - margin * 2, 20, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(item.productName, margin + 8, y + 1);
    doc.text(String(item.quantity), pageW - margin - 160, y + 1, { align: 'right' });
    doc.text(`Rs.${item.price}`, pageW - margin - 80, y + 1, { align: 'right' });
    doc.text(`Rs.${item.quantity * item.price}`, pageW - margin - 8, y + 1, { align: 'right' });
    y += 20;
  });

  // Total
  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 16;
  doc.setFillColor(30, 41, 59);
  doc.rect(pageW - margin - 200, y - 14, 200, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL AMOUNT', pageW - margin - 110, y + 1, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`Rs.${order.totalAmount}`, pageW - margin - 15, y + 1, { align: 'right' });
  y += 45;

  // Admin remarks
  if (order.adminRemarks && order.adminRemarks.trim()) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ADMIN REMARKS', margin, y);
    y += 14;
    doc.setFillColor(254, 249, 195);
    doc.rect(margin, y - 12, pageW - margin * 2, 30, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(113, 63, 18);
    doc.text(order.adminRemarks.trim(), margin + 8, y + 4);
    y += 40;
  }

  // Footer
  doc.setFillColor(30, 41, 59);
  doc.rect(0, pageH - 60, pageW, 60, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('This is a computer-generated receipt. No signature required.', pageW / 2, pageH - 35, { align: 'center' });
  doc.text(`Raj Dhan Varsha | Generated on ${new Date().toLocaleString('en-IN')}`, pageW / 2, pageH - 20, { align: 'center' });

  return doc;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
}: {
  order: MyOrder;
  onClose: () => void;
}) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const cfg = STATUS_CONFIG[order.status];

  // Receipt is generated locally from order data — same builder the admin
  // used to preview/approve it — so no backend file endpoint is needed.
  const handleDownloadReceipt = () => {
    setDownloadingReceipt(true);
    try {
      const doc = buildReceiptPDF(order);
      doc.save(`Receipt-ORD-${order.orderId.padStart(6, '0')}.pdf`);
    } catch {
      alert('Could not generate the receipt. Please try again.');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] sm:max-h-[90vh] overflow-y-auto relative">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">Order Details</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5"># {order.orderId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-5">

          {/* Status Banner */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
            <cfg.icon size={18} className={cfg.color} />
            <div>
              <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[11px] text-gray-500">{cfg.desc}</p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={order.status} />
            </div>
          </div>

          {/* Admin Remarks (if rejected) */}
          {order.adminRemarks && order.status === 'Rejected' && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-0.5">Rejection Reason</p>
                <p className="text-xs text-red-700">{order.adminRemarks}</p>
              </div>
            </div>
          )}

          {/* Admin Remarks (if approved) */}
          {order.adminRemarks && order.status === 'Approved' && (
            <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
              <CheckCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-0.5">Admin Note</p>
                <p className="text-xs text-blue-700">{order.adminRemarks}</p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-medium mb-0.5">Requested</p>
              <p className="text-xs font-semibold text-gray-700">{formatDate(order.requestedAt)}</p>
            </div>
            {order.processedAt && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-medium mb-0.5">Processed</p>
                <p className="text-xs font-semibold text-gray-700">{formatDate(order.processedAt)}</p>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100/60 space-y-3">
            <p className="text-[11px] font-bold text-blue-600/80 uppercase tracking-widest">Payment Info</p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1 shrink-0">
                <LinkIcon size={12} className="text-blue-500" /> UTR / Ref:
              </span>
              <span className="font-mono font-bold text-xs text-gray-800 tracking-wide select-all bg-gray-50 px-2 py-0.5 rounded border border-gray-200 break-all">
                {order.utrNumber}
              </span>
            </div>

            {/* Screenshot */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <FileText size={12} className="text-blue-500" /> Payment Screenshot:
              </span>
              {order.screenshotUrl ? (
                <div
                  onClick={() => setIsLightboxOpen(true)}
                  className="relative group border border-gray-200 rounded-lg overflow-hidden cursor-zoom-in bg-white h-32 sm:h-36 flex items-center justify-center hover:border-blue-400 shadow-sm transition-all"
                >
                  <img
                    src={order.screenshotUrl}
                    alt="Payment screenshot"
                    className="h-full w-full object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-md font-medium">Tap to expand</span>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-gray-200 rounded-lg bg-gray-50 h-14 flex items-center justify-center">
                  <p className="text-xs text-gray-400 italic">No screenshot uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* Ordered Items */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ordered Items</p>
            <div className="space-y-2">
              {order.items.length > 0 ? order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 sm:px-4 py-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingCart size={13} className="text-[#3B5998] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-gray-400">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-800 shrink-0">{formatCurrency(item.quantity * item.price)}</p>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-3 italic">No item details available</p>
              )}
            </div>

            {/* Totals */}
            <div className="mt-3 rounded-xl border border-[#3B5998]/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#3B5998]/5">
                <span className="text-xs font-bold text-[#3B5998]">Total Amount</span>
                <span className="text-sm font-black text-[#3B5998]">{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.totalBv > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#3B5998]/[0.03] border-t border-[#3B5998]/10">
                  <span className="text-xs text-gray-500">Business Volume (BV)</span>
                  <span className="text-xs font-bold text-gray-700">{order.totalBv} BV</span>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Download — built locally, available as soon as the order is Approved */}
          {order.status === 'Approved' && (
            <button
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {downloadingReceipt
                ? <Loader2 size={14} className="animate-spin" />
                : <Download size={14} />}
              {downloadingReceipt ? 'Preparing…' : 'Download Receipt PDF'}
            </button>
          )}

        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && order.screenshotUrl && (
        <div
          className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white bg-white/10 w-9 h-9 rounded-full flex items-center justify-center">✕</button>
          <div className="max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={order.screenshotUrl} alt="Payment screenshot full" className="max-w-full max-h-full object-contain rounded-md shadow-2xl" />
          </div>
          <p className="text-gray-400 text-xs mt-4 font-mono">UTR: {order.utrNumber}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrderHistoryPage() {
  const [orders, setOrders]               = useState<MyOrder[]>([]);
  const [filtered, setFiltered]           = useState<MyOrder[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<OrderStatus | 'All'>('All');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<MyOrder | null>(null);
  const [toast, setToast]                 = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/Orders/my-orders`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        throw new Error('Session expired. Please log out and log back in.');
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(text).message ?? msg; } catch { msg = text || msg; }
        throw new Error(msg);
      }

      const data = await res.json();
      const raw: ApiOrder[] = Array.isArray(data) ? data : data.data ?? [];
      setOrders(raw.map(normaliseOrder));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load orders';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    let result = [...orders];
    if (statusFilter !== 'All') result = result.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        o => o.orderId.toLowerCase().includes(q) || o.utrNumber.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      const va = new Date(a.requestedAt).getTime();
      const vb = new Date(b.requestedAt).getTime();
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    setFiltered(result);
  }, [orders, search, statusFilter, sortDir]);

  // Summary counts
  const counts = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    approved: orders.filter(o => o.status === 'Approved').length,
    rejected: orders.filter(o => o.status === 'Rejected').length,
  };

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
                  <History size={18} className="text-[#3B5998]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black text-gray-900 leading-tight truncate">Order History</h1>
                  <p className="text-[11px] sm:text-xs text-gray-400 truncate">Track all your payment submissions</p>
                </div>
              </div>
              <button
                onClick={loadOrders}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#3B5998] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 shrink-0"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden xs:inline">Refresh</span>
              </button>
            </div>
          </div>

          <div className="px-4 md:px-8 py-5 space-y-5">

            {/* Summary Cards */}
            {!isLoading && !error && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Orders', value: counts.total,    color: 'text-gray-700',   bg: 'bg-white' },
                  { label: 'Pending',      value: counts.pending,  color: 'text-amber-600',  bg: 'bg-amber-50' },
                  { label: 'Approved',     value: counts.approved, color: 'text-blue-600',   bg: 'bg-blue-50' },
                  { label: 'Rejected',     value: counts.rejected, color: 'text-red-600',    bg: 'bg-red-50' },
                ].map(card => (
                  <div key={card.label} className={`${card.bg} rounded-xl border border-gray-100 px-4 py-3 shadow-sm`}>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{card.label}</p>
                    <p className={`text-2xl font-black mt-0.5 ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 w-full">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Order ID or UTR…"
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
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400 shrink-0 hidden sm:inline" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as OrderStatus | 'All')}
                  className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30"
                >
                  <option value="All">All Statuses</option>
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-[#3B5998] transition-colors shrink-0"
                  title="Toggle sort order"
                >
                  {sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  <span className="hidden sm:inline">Date</span>
                </button>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={28} className="animate-spin text-[#3B5998]" />
                <p className="text-sm text-gray-400">Loading your orders…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-sm font-semibold text-gray-700">Could not load orders</p>
                <p className="text-xs text-gray-400 max-w-xs">{error}</p>
                <button
                  onClick={loadOrders}
                  className="mt-2 px-4 py-2 bg-[#3B5998] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <History size={36} className="text-gray-200" />
                <p className="text-sm font-semibold text-gray-500">No orders yet</p>
                <p className="text-xs text-gray-400">
                  {orders.length === 0
                    ? 'Your order history will appear here after your first purchase.'
                    : 'No orders match your current filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(order => {
                  const cfg = STATUS_CONFIG[order.status];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={order.orderId}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-[#3B5998]/30 hover:shadow-md active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Hash size={11} className="text-[#3B5998] shrink-0" />
                            <span className="font-mono text-xs font-bold text-[#3B5998]">{order.orderId}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 font-mono truncate">UTR: {order.utrNumber}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      {/* Items preview */}
                      {order.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium truncate max-w-[160px]">
                              <ShoppingCart size={9} className="text-[#3B5998] shrink-0" />
                              {item.productName} ×{item.quantity}
                            </span>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                              +{order.items.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 min-w-0">
                          <Icon size={10} className={cfg.color} />
                          <span className="truncate">{formatDate(order.requestedAt)}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {order.status === 'Approved' && (
                            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5">
                              <Download size={10} /> Receipt
                            </span>
                          )}
                          <span className="text-sm font-black text-gray-800">{formatCurrency(order.totalAmount)}</span>
                          <Eye size={14} className="text-gray-300" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <p className="text-xs text-gray-400 text-center pt-1">
                  Showing {filtered.length} of {orders.length} orders
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}