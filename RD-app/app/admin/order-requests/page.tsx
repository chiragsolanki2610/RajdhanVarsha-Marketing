'use client';

import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import {
  ClipboardList,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  Filter,
  X,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Hash,
  Link as LinkIcon,
  FileText,
  Download,
  ArrowLeft,
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar';

const BASE_URL = 'https://localhost:56187';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Delivered';

interface ApiOrder {
  id: string | number;
  userId?: string;
  memberId?: string;
  userName?: string;
  memberName?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  address?: string;
  deliveryAddress?: string;
  productName?: string;
  productId?: string | number;
  quantity?: number;
  amount?: number;
  totalAmount?: number;
  price?: number;
  status?: string;
  createdAt?: string;
  requestedAt?: string;
  updatedAt?: string;
  utrNumber?: string;
  screenshotUrl?: string;
  cartItemsJson?: string;
  items?: ApiOrderItem[];
}

interface ApiOrderItem {
  productId?: string | number;
  productName?: string;
  name?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  unitPrice?: number;
  dp?: number;
  bv?: number;
}

interface OrderRequest {
  orderId: string;
  memberId: string;
  memberName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  requestedAt: string;
  updatedAt?: string;
  utrNumber: string;
  screenshotUrl?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
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

// ─── Normalise ────────────────────────────────────────────────────────────────

function normaliseStatus(raw: string | undefined): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    processing: 'Processing', delivered: 'Delivered',
  };
  return map[(raw ?? '').toLowerCase()] ?? 'Pending';
}

function parseCartItems(cartItemsJson?: string): ApiOrderItem[] {
  if (!cartItemsJson) return [];
  try {
    const parsed = JSON.parse(cartItemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function normaliseOrder(o: ApiOrder): OrderRequest {
  const rawItems: ApiOrderItem[] =
    o.items?.length ? o.items
    : parseCartItems(o.cartItemsJson).length ? parseCartItems(o.cartItemsJson)
    : [{ productId: o.productId, productName: o.productName ?? 'Product', quantity: o.quantity ?? 1, price: o.price ?? o.amount ?? o.totalAmount ?? 0 }];

  const items: OrderItem[] = rawItems.map((it, idx) => ({
    productId: String(it.productId ?? idx),
    productName: it.productName ?? it.name ?? `Product ${it.productId ?? idx + 1}`,
    quantity: it.quantity ?? 1,
    price: it.dp ?? it.price ?? it.unitPrice ?? it.amount ?? 0,
  }));

  const totalAmount = o.totalAmount ?? o.amount ?? items.reduce((s, it) => s + it.price * it.quantity, 0);

  return {
    orderId: String(o.id),
    memberId: o.memberId ?? o.userId ?? '—',
    memberName: o.memberName ?? o.userName ?? o.name ?? 'Unknown',
    phone: o.phone ?? o.phoneNumber ?? '—',
    address: o.address ?? o.deliveryAddress ?? '—',
    items,
    totalAmount,
    status: normaliseStatus(o.status),
    requestedAt: o.requestedAt ?? o.createdAt ?? new Date().toISOString(),
    updatedAt: o.updatedAt,
    utrNumber: o.utrNumber ?? '—',
    screenshotUrl: o.screenshotUrl,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  Pending:    { label: 'Pending',    color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: Clock       },
  Approved:   { label: 'Approved',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: CheckCircle },
  Processing: { label: 'Processing', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: RefreshCw   },
  Delivered:  { label: 'Delivered',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: Package     },
  Rejected:   { label: 'Rejected',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: XCircle     },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─── Receipt PDF Generator ────────────────────────────────────────────────────

function buildReceiptPDF(order: OrderRequest, adminRemarks: string): jsPDF {
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

  // Two-column member + order info
  const col2X = pageW / 2 + 10;

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MEMBER INFORMATION', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  y += 16;
  doc.text(order.memberName, margin, y);
  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Member ID: ${order.memberId}`, margin, y);
  y += 13;
  doc.text(`Phone: ${order.phone}`, margin, y);
  y += 13;
  doc.text(`Address: ${order.address}`, margin, y);

  let ry = y - 57;
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

  y += 30;

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
  if (adminRemarks.trim()) {
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
    doc.text(adminRemarks.trim(), margin + 8, y + 4);
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
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-fadeIn ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

type ModalStep = 'view' | 'receipt';

function OrderDetailModal({
  order, onClose, onStatusChange,
}: {
  order: OrderRequest;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}) {
  const [updating, setUpdating]           = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [remarks, setRemarks]             = useState('');
  const [step, setStep]                   = useState<ModalStep>('view');
  const [pdfUrl, setPdfUrl]               = useState<string | null>(null);
  const [editRemarks, setEditRemarks]     = useState('');

  // Regenerate PDF preview whenever editRemarks changes
  useEffect(() => {
    if (step !== 'receipt') return;
    const doc = buildReceiptPDF(order, editRemarks);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [step, editRemarks, order]);

  const handleGenerateReceipt = () => {
    setEditRemarks(remarks);
    setStep('receipt');
  };

  const handleDownload = () => {
    const doc = buildReceiptPDF(order, editRemarks);
    doc.save(`receipt-order-${order.orderId}.pdf`);
  };

  const handleApprove = async () => {
    setUpdating(true);
    setActionError(null);
    try {
      const doc = buildReceiptPDF(order, editRemarks);
      const receiptBase64 = doc.output('datauristring');

      const res = await fetch(`${BASE_URL}/api/Orders/payment-requests/${order.orderId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          adminRemarks: editRemarks.trim() || 'Approved by admin',
          receiptPdf: receiptBase64,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let errMsg = `HTTP ${res.status}`;
        try { errMsg = JSON.parse(text).message ?? errMsg; } catch { errMsg = text || errMsg; }
        throw new Error(errMsg);
      }

      onStatusChange(order.orderId, 'Approved');
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Approval failed. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    setUpdating(true);
    setActionError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/Orders/payment-requests/${order.orderId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ adminRemarks: remarks.trim() || 'Rejected by admin' }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let errMsg = `HTTP ${res.status}`;
        try { errMsg = JSON.parse(text).message ?? errMsg; } catch { errMsg = text || errMsg; }
        throw new Error(errMsg);
      }
      onStatusChange(order.orderId, 'Rejected');
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto relative animate-slideUp sm:animate-fadeIn">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            {step === 'receipt' && (
              <button
                onClick={() => setStep('view')}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors mr-1"
              >
                <ArrowLeft size={16} className="text-gray-500" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {step === 'view' ? 'Order Details' : 'Receipt Preview'}
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5"># {order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* ── STEP 1: View Order ── */}
        {step === 'view' && (
          <div className="px-4 sm:px-6 py-5 space-y-5">

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Status</span>
              <StatusBadge status={order.status} />
            </div>

            {/* Member Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Member Info</p>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <User size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Name</p>
                    <p className="text-xs font-semibold text-gray-800 break-words">{order.memberName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Hash size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Member ID</p>
                    <p className="text-xs font-semibold text-gray-800 font-mono break-all">{order.memberId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Phone</p>
                    <p className="text-xs font-semibold text-gray-800">{order.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">Requested</p>
                    <p className="text-xs font-semibold text-gray-800">{formatDate(order.requestedAt)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-gray-200/60">
                <MapPin size={14} className="text-[#3B5998] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Delivery Address</p>
                  <p className="text-xs font-semibold text-gray-800 break-words">{order.address}</p>
                </div>
              </div>
            </div>

            {/* Payment Verification */}
            <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100/60 space-y-3">
              <p className="text-[11px] font-bold text-blue-600/80 uppercase tracking-widest">Payment Verification</p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <span className="text-xs font-medium text-gray-500 flex items-center gap-1 shrink-0">
                  <LinkIcon size={12} className="text-blue-500" /> UTR / Ref:
                </span>
                <span className="font-mono font-bold text-xs text-gray-800 tracking-wide select-all bg-gray-50 px-2 py-0.5 rounded border border-gray-200 break-all text-left sm:text-right">
                  {order.utrNumber}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <FileText size={12} className="text-blue-500" /> Payment Snapshot:
                </span>
                {order.screenshotUrl ? (
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative group border border-gray-200 rounded-lg overflow-hidden cursor-zoom-in bg-white h-32 sm:h-36 flex items-center justify-center transition-all hover:border-blue-400 shadow-sm"
                  >
                    <img
                      src={order.screenshotUrl}
                      alt="Receipt payment snapshot"
                      className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-md backdrop-blur-sm font-medium">
                        Tap to expand
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-200 rounded-lg bg-gray-50 h-16 flex items-center justify-center">
                    <p className="text-xs text-gray-400 italic">No image receipt uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ordered Items</p>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 sm:px-4 py-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShoppingCart size={13} className="text-[#3B5998] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.productName}</p>
                        <p className="text-[10px] text-gray-400">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-800 shrink-0">{formatCurrency(item.quantity * item.price)}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 px-4 py-3 bg-[#3B5998]/5 rounded-xl border border-[#3B5998]/10">
                <span className="text-xs font-bold text-[#3B5998]">Total Amount</span>
                <span className="text-sm font-black text-[#3B5998]">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            {/* Error */}
            {actionError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <AlertCircle size={14} className="shrink-0" />
                {actionError}
              </div>
            )}

            {/* Actions */}
            {order.status === 'Pending' && (
              <div className="space-y-3 pt-1 pb-4 sm:pb-0">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Take Action</p>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Admin remarks (optional)…"
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30 resize-none"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  {/* GENERATE RECEIPT — replaces old Approve button */}
                  <button
                    onClick={handleGenerateReceipt}
                    disabled={updating}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60"
                  >
                    <FileText size={13} />
                    Generate Receipt
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={updating}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-60"
                  >
                    {updating ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                    Reject
                  </button>
                </div>
              </div>
            )}

            {order.status !== 'Pending' && order.updatedAt && (
              <p className="text-[11px] text-gray-400 text-center pb-4 sm:pb-0">
                Last updated: {formatDate(order.updatedAt)}
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: Receipt Preview + Approve ── */}
        {step === 'receipt' && (
          <div className="px-4 sm:px-6 py-5 space-y-4 pb-6">

            {/* PDF iframe preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50" style={{ height: 380 }}>
              {pdfUrl ? (
                <iframe src={pdfUrl} className="w-full h-full" title="Receipt Preview" />
              ) : (
                <div className="flex items-center justify-center h-full gap-2 text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Generating receipt…</span>
                </div>
              )}
            </div>

            {/* Editable remarks — live-updates the PDF */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Edit Remarks <span className="normal-case font-normal text-gray-300">(updates receipt live)</span>
              </p>
              <textarea
                value={editRemarks}
                onChange={e => setEditRemarks(e.target.value)}
                placeholder="Add or edit admin remarks for this receipt…"
                rows={2}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30 resize-none"
              />
            </div>

            {/* Error */}
            {actionError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <AlertCircle size={14} className="shrink-0" />
                {actionError}
              </div>
            )}

            {/* Download + Approve */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-gray-300 bg-white text-gray-600 text-xs font-semibold rounded-xl transition-colors"
            >
              <Download size={13} />
              Download PDF
            </button>

            <button
              onClick={handleApprove}
              disabled={updating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-bold rounded-xl transition-colors"
            >
              {updating
                ? <Loader2 size={13} className="animate-spin" />
                : <CheckCircle size={13} />
              }
              Approve &amp; Send Receipt to User
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && order.screenshotUrl && (
        <div
          className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 text-xl bg-white/10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm">
            ✕
          </button>
          <div
            className="max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={order.screenshotUrl}
              alt="Receipt snapshot full view"
              className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
            />
          </div>
          <p className="text-gray-400 text-[11px] sm:text-xs mt-4 select-all bg-black/40 px-3 py-1 rounded font-mono tracking-wide max-w-full truncate">
            UTR Reference: {order.utrNumber}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrderRequestsPage() {
  const [orders, setOrders]               = useState<OrderRequest[]>([]);
  const [filtered, setFiltered]           = useState<OrderRequest[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<OrderStatus | 'All'>('All');
  const [sortField, setSortField]         = useState<'requestedAt' | 'totalAmount'>('requestedAt');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [toast, setToast]                 = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/Orders/payment-requests`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (res.status === 401) throw new Error('Session expired or insufficient permissions. Please log out and log back in.');
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(text).message ?? msg; } catch { msg = text || msg; }
        throw new Error(msg);
      }
      const data: ApiOrder[] = await res.json();
      const raw: ApiOrder[] = Array.isArray(data) ? data : (data as unknown as { data?: ApiOrder[] }).data ?? [];
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
      result = result.filter(o =>
        o.orderId.toLowerCase().includes(q) ||
        o.memberName.toLowerCase().includes(q) ||
        o.memberId.toLowerCase().includes(q) ||
        o.phone.includes(q),
      );
    }
    result.sort((a, b) => {
      const va = sortField === 'requestedAt' ? new Date(a.requestedAt).getTime() : a.totalAmount;
      const vb = sortField === 'requestedAt' ? new Date(b.requestedAt).getTime() : b.totalAmount;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    setFiltered(result);
  }, [orders, search, statusFilter, sortField, sortDir]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev =>
      prev.map(o => o.orderId === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o),
    );
    showToast(`Order #${orderId} marked as ${newStatus}`, 'success');
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ChevronDown size={12} className="opacity-30" />;

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
                  <ClipboardList size={18} className="text-[#3B5998]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black text-gray-900 leading-tight truncate">Order Requests</h1>
                  <p className="text-[11px] sm:text-xs text-gray-400 truncate">Review and manage member orders</p>
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
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 w-full">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search order ID, member, phone…"
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
                  onChange={e => setStatusFilter(e.target.value as OrderStatus | 'All')}
                  className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#3B5998]/30"
                >
                  <option value="All">All Statuses</option>
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={28} className="animate-spin text-[#3B5998]" />
                <p className="text-sm text-gray-400">Loading orders…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-sm font-semibold text-gray-700">Could not load orders</p>
                <p className="text-xs text-gray-400 max-w-xs">{error}</p>
                <button onClick={loadOrders} className="mt-2 px-4 py-2 bg-[#3B5998] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  Try Again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <ClipboardList size={32} className="text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">No orders found</p>
                <p className="text-xs text-gray-400">Adjust your search or status filter.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Order ID</th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Member</th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Items</th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer select-none" onClick={() => toggleSort('totalAmount')}>
                          <span className="flex items-center gap-1">Amount <SortIcon field="totalAmount" /></span>
                        </th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer select-none" onClick={() => toggleSort('requestedAt')}>
                          <span className="flex items-center gap-1">Requested <SortIcon field="requestedAt" /></span>
                        </th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                        <th className="px-5 py-3.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(order => (
                        <tr key={order.orderId} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-4"><span className="font-mono text-xs font-semibold text-[#3B5998]">{order.orderId}</span></td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-gray-800">{order.memberName}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{order.memberId}</p>
                          </td>
                          <td className="px-5 py-4"><span className="text-xs text-gray-600">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span></td>
                          <td className="px-5 py-4"><span className="text-xs font-bold text-gray-800">{formatCurrency(order.totalAmount)}</span></td>
                          <td className="px-5 py-4"><span className="text-xs text-gray-500">{formatDate(order.requestedAt)}</span></td>
                          <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#3B5998]/10 hover:bg-[#3B5998]/20 text-[#3B5998] text-[11px] font-semibold rounded-lg transition-colors"
                            >
                              <Eye size={12} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filtered.map(order => (
                    <div
                      key={order.orderId}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-[#3B5998]">#{order.orderId}</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{order.memberName}</p>
                          <p className="text-[11px] text-gray-400 font-mono truncate">{order.memberId}</p>
                        </div>
                        <div className="shrink-0"><StatusBadge status={order.status} /></div>
                      </div>
                      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 min-w-0">
                          <span className="truncate">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 inline-block shrink-0" />
                          <span className="truncate">{formatDate(order.requestedAt).split(',')[0]}</span>
                        </div>
                        <span className="text-sm font-black text-gray-800 shrink-0">{formatCurrency(order.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 text-center pt-2">
                  Showing {filtered.length} of {orders.length} orders
                </p>
              </>
            )}
          </div>
        </main>
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}