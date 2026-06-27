'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import LoginTopBar from '@/components/loginTopbar';
import { useRouter } from 'next/navigation';
import {
  GitBranch, Wallet, CheckCircle2, AlertCircle, Loader2,
  ChevronDown, ChevronUp, ArrowRight, Lock, Unlock, Crown,
  ShoppingCart, Plus, Minus, Trash2, X, QrCode, Upload,
  ArrowLeft, Package, CheckCheck, Copy, IndianRupee, AlertTriangle,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://localhost:56187';
const ROOT_USER_ID = 'RD0001';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BinaryStatus {
  isInBinaryPlan: boolean;
  isActive: boolean;
  position?: string;
  treeLevel: number;
  leftLegCount: number;
  rightLegCount: number;
  totalDownlineCount: number;
  withdrawalUnlocked: boolean;
  pairsCompleted: number;
  walletBalance: number;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  pairsCount: number;
  withdrawalUnlocked: boolean;
  withdrawalUnlockMessage: string;
  recentTransactions: {
    id: number; type: string; amount: number; source: string; description?: string; createdAt: string;
  }[];
}

// ── Matches exactly what GET /api/Products returns (camelCase) ──
interface ApiProduct {
  id: number;
  productNo: string;
  productName: string;
  category: string;
  description: string;
  mrp: number;
  gst: number;
  dp: number;
  bv: number;
  imageUrl: string;
  createdAt: string;
}

// ── Normalised shape used inside the component ──
interface Product {
  id: number;
  productNo: string;
  name: string;
  category: string;
  description: string;
  mrp: number;
  gst: number;
  price: number;
  bv: number;
  imageUrl: string;
}

interface CartItem extends Product {
  qty: number;
}

type View = 'plan' | 'shop' | 'payment';

// ── NEW: shape returned by GET /api/binary/preview-placement ──
interface PlacementPreviewDto {
  success: boolean;
  message: string;
  actualParentId: string;
  actualPosition: 'LEFT' | 'RIGHT';
  treeLevel: number;
  isDirectPlacement: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeJwtPayload(jwt: string): Record<string, any> | null {
  try {
    const b64 = jwt.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return null;
    return JSON.parse(window.atob(b64));
  } catch { return null; }
}

function normaliseProduct(p: ApiProduct): Product {
  return {
    id:          p.id,
    productNo:   p.productNo,
    name:        p.productName,
    category:    p.category,
    description: p.description,
    mrp:         Number(p.mrp)  || 0,
    gst:         Number(p.gst)  || 0,
    price:       Number(p.dp)   || 0,
    bv:          Number(p.bv)   || 0,
    imageUrl:    p.imageUrl     || '',
  };
}

const pairCommissionInfo = [
  { pairs: 1,   earn: '₹150' },
  { pairs: 5,   earn: '₹750' },
  { pairs: 10,  earn: '₹1,500' },
  { pairs: 50,  earn: '₹7,500' },
  { pairs: 100, earn: '₹15,000' },
];

const DEMO_PRODUCTS: Product[] = [
  { id: 1, productNo: 'P001', name: 'Health Supplement Pack',   category: 'Health', description: 'Daily wellness essentials',   mrp: 1199, gst: 12, price: 999,  bv: 250, imageUrl: '' },
  { id: 2, productNo: 'P002', name: 'Herbal Wellness Kit',      category: 'Health', description: 'Ayurvedic herbal blend',       mrp: 1499, gst: 12, price: 1299, bv: 350, imageUrl: '' },
  { id: 3, productNo: 'P003', name: 'Immunity Booster Bundle',  category: 'Health', description: 'Strengthen your immunity',     mrp: 999,  gst: 12, price: 799,  bv: 200, imageUrl: '' },
  { id: 4, productNo: 'P004', name: 'Detox Tea Pack (30 bags)', category: 'Health', description: 'Cleanse & refresh daily',      mrp: 599,  gst: 12, price: 499,  bv: 150, imageUrl: '' },
  { id: 5, productNo: 'P005', name: 'Protein Nutrition Pack',   category: 'Health', description: 'High protein formula',         mrp: 1999, gst: 12, price: 1599, bv: 400, imageUrl: '' },
  { id: 6, productNo: 'P006', name: 'Energy & Vitality Combo',  category: 'Health', description: 'All-day energy support',       mrp: 1299, gst: 12, price: 1099, bv: 300, imageUrl: '' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BinaryPlanPage() {
  const router = useRouter();

  const [view,       setView]       = useState<View>('plan');
  const [status,     setStatus]     = useState<BinaryStatus | null>(null);
  const [wallet,     setWallet]     = useState<WalletData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showRules,  setShowRules]  = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  // ── NEW: tracks latest payment order status ──
  const [pendingOrderStatus, setPendingOrderStatus] = useState<'Pending' | 'Rejected' | null>(null);

  // join
  const [sponsorInput,  setSponsorInput]  = useState('');
  const [positionInput, setPositionInput] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [joining,   setJoining]   = useState(false);
  const [joinMsg,   setJoinMsg]   = useState('');
  const [joinError, setJoinError] = useState('');

  // ── NEW: placement preview (auto-placement warning) state ──
  const [previewLoading,        setPreviewLoading]        = useState(false);
  const [previewError,          setPreviewError]          = useState('');
  const [placementPreview,      setPlacementPreview]      = useState<PlacementPreviewDto | null>(null);
  const [showPlacementConfirm,  setShowPlacementConfirm]  = useState(false);

  // withdraw
  const [withdrawAmt,   setWithdrawAmt]   = useState('');
  const [withdrawing,   setWithdrawing]   = useState(false);
  const [withdrawMsg,   setWithdrawMsg]   = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  // shop / cart
  const [products,     setProducts]     = useState<Product[]>([]);
  const [productsLoad, setProductsLoad] = useState(false);
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [cartOpen,     setCartOpen]     = useState(false);

  // payment
  const [utrNumber,      setUtrNumber]      = useState('');
  const [screenshot,     setScreenshot]     = useState<File | null>(null);
  const [screenshotPrev, setScreenshotPrev] = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [submitError,    setSubmitError]    = useState('');
  const [orderSuccess,   setOrderSuccess]   = useState(false);
  const [orderMsg,       setOrderMsg]       = useState('');

  // ── auth ──
  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
  }, []);

  const currentUserId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem('userId') || localStorage.getItem('rdId') || '';
    if (stored) return stored.toUpperCase();
    if (!token) return '';
    const payload = decodeJwtPayload(token);
    const id =
      payload?.userId ||
      payload?.['nameid'] ||
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      '';
    return typeof id === 'string' ? id.toUpperCase() : '';
  }, [token]);

  const isRootUser = currentUserId === ROOT_USER_ID;

  // ── fetchers ──
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/binary/status`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (res.ok) setStatus(await res.json());
      else setError('Failed to load binary status.');
    } catch { setError('Network error loading status.'); }
  }, [token]);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/binary/wallet`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (res.ok) setWallet(await res.json());
    } catch {}
  }, [token]);

  // ── NEW: fetch latest order status to determine if payment is pending/rejected ──
  const fetchMyOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/Orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (res.ok) {
        const orders: { status: string; requestedAt: string }[] = await res.json();
        const latest = orders.sort(
          (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        )[0];
        if (latest?.status === 'Pending')        setPendingOrderStatus('Pending');
        else if (latest?.status === 'Rejected')  setPendingOrderStatus('Rejected');
        else                                     setPendingOrderStatus(null);
      }
    } catch {}
  }, [token]);

  const fetchProducts = useCallback(async () => {
    setProductsLoad(true);
    try {
      const res = await fetch(`${API_BASE}/api/Products`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (res.ok) {
        const raw: ApiProduct[] = await res.json();
        const seen = new Set<number>();
        const unique = raw.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setProducts(unique.map(normaliseProduct));
      }
    } catch {}
    finally { setProductsLoad(false); }
  }, [token]);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    (async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchWallet(), fetchMyOrders()]);
      setLoading(false);
    })();
  }, [fetchStatus, fetchWallet, fetchMyOrders, token, router]);

  useEffect(() => {
    if (view === 'shop' && products.length === 0) fetchProducts();
  }, [view, products.length, fetchProducts]);

  // ── cart helpers ──
  const cartTotal   = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const cartTotalBV = useMemo(() => cart.reduce((s, i) => s + i.bv   * i.qty, 0), [cart]);
  const cartCount   = useMemo(() => cart.reduce((s, i) => s + i.qty,           0), [cart]);
  const bvMet       = cartTotalBV >= 600;

  const addToCart = (p: Product) =>
    setCart(prev => {
      const exists = prev.find(i => i.id === p.id);
      if (exists) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1 }];
    });

  const changeQty = (id: number, delta: number) =>
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
    );

  const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.id !== id));

  // ── NEW: call /api/binary/preview-placement before joining ──
  const getPlacementPreview = async (
    sponsorId: string,
    preferredPosition: 'LEFT' | 'RIGHT'
  ): Promise<PlacementPreviewDto | null> => {
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const res = await fetch(
        `${API_BASE}/api/binary/preview-placement?sponsorId=${encodeURIComponent(sponsorId)}&preferredPosition=${preferredPosition}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.message || 'Failed to check placement.');
        return null;
      }
      return data as PlacementPreviewDto;
    } catch {
      setPreviewError('Network error while checking placement.');
      return null;
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── join: actually submits to /api/binary/join ──
  const doJoin = async () => {
    setJoinError(''); setJoinMsg('');
    setJoining(true);
    try {
      const body = isRootUser
        ? {}
        : { sponsorId: sponsorInput.trim().toUpperCase(), preferredPosition: positionInput };
      const res = await fetch(`${API_BASE}/api/binary/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) { setJoinMsg(data.message || 'Joined successfully!'); await fetchStatus(); }
      else setJoinError(data.message || 'Failed to join.');
    } catch { setJoinError('Network error.'); }
    finally { setJoining(false); }
  };

  // ── NEW: handles the Join button click — previews placement first for non-root users ──
  const handleJoinClick = async () => {
    setJoinError(''); setJoinMsg(''); setPreviewError('');

    // root user has no sponsor/position to preview — join straight away
    if (isRootUser) {
      await doJoin();
      return;
    }

    if (!sponsorInput.trim()) { setJoinError('Please enter a Sponsor ID.'); return; }

    const preview = await getPlacementPreview(sponsorInput.trim().toUpperCase(), positionInput);
    if (!preview) return; // previewError is already set

    if (preview.isDirectPlacement) {
      // no conflict — place directly under the chosen sponsor/position, no need to interrupt the user
      await doJoin();
    } else {
      // slot taken — show confirmation with where they'll actually land before joining
      setPlacementPreview(preview);
      setShowPlacementConfirm(true);
    }
  };

  // ── withdraw ──
  const handleWithdraw = async () => {
    setWithdrawError(''); setWithdrawMsg('');
    const amt = parseFloat(withdrawAmt);
    if (!withdrawAmt || isNaN(amt) || amt <= 0) { setWithdrawError('Enter a valid amount.'); return; }
    if (amt < 250) { setWithdrawError('Minimum withdrawal is ₹250.'); return; }
    setWithdrawing(true);
    try {
      const res = await fetch(`${API_BASE}/api/binary/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (res.ok) { setWithdrawMsg(data.message || 'Withdrawal requested.'); setWithdrawAmt(''); await fetchWallet(); await fetchStatus(); }
      else setWithdrawError(data.message || 'Withdrawal failed.');
    } catch { setWithdrawError('Network error.'); }
    finally { setWithdrawing(false); }
  };

  // ── screenshot pick ──
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPrev(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── payment submit ──
  // FIX: CartItems now includes productName, price (dp), bv, and gst so the
  // admin receipt PDF can render product name, rate, BV, and tax correctly.
  const handlePaymentSubmit = async () => {
    setSubmitError('');
    if (!utrNumber.trim()) { setSubmitError('Please enter the UTR / Transaction ID.'); return; }
    if (!screenshot)       { setSubmitError('Please upload your payment screenshot.'); return; }

    setSubmitting(true);
    try {
      const cartItemsJson = JSON.stringify(
        cart.map(i => ({
          productId:   i.id,
          productName: i.name,
          quantity:    i.qty,
          price:       i.price,   // dp / distributor price
          bv:          i.bv,      // business volume — needed for receipt PDF
          gst:         i.gst,     // GST % — used to split CGST/SGST on receipt
        }))
      );

      const formData = new FormData();
      formData.append('Utr',         utrNumber.trim());
      formData.append('Screenshot',  screenshot);
      formData.append('PlanType',    'Binary Plan');   // ← ADD THIS LINE
      formData.append('TotalAmount', cartTotal.toString());
      formData.append('TotalBv',     cartTotalBV.toString());
      formData.append('CartItems',   cartItemsJson);

      const res = await fetch(`${API_BASE}/api/Orders/payment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setOrderSuccess(true);
        setOrderMsg(data.message || 'Order submitted! Admin will verify and activate your Binary ID.');
        setCart([]);
        // ── NEW: after successful submit, mark as pending immediately ──
        setPendingOrderStatus('Pending');
      } else {
        setSubmitError(data.message || 'Submission failed. Please try again.');
      }
    } catch { setSubmitError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </main>
      </div>
    );
  }

  const isEnrolled = status?.isInBinaryPlan ?? false;
  const isActive   = status?.isActive ?? false;

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW: PAYMENT
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === 'payment') {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 pb-12 overflow-auto flex flex-col items-center">

          <div className="w-full max-w-5xl"><div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => { setView('shop'); setSubmitError(''); setOrderSuccess(false); }}
              className="p-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
              <p className="text-sm text-gray-400 mt-0.5">Step 3 of 3 — Scan · Pay · Confirm</p>
            </div>
          </div>

          {/* ── Success state ── */}
          {orderSuccess ? (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-emerald-100">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCheck size={40} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Submitted!</h2>
                <p className="text-gray-500 mb-2">{orderMsg}</p>
                <p className="text-sm text-gray-400 mb-8">
                  Admin will verify your payment within <span className="font-semibold text-gray-600">24 hours</span> and activate your Binary ID automatically.
                </p>
                <div className="bg-emerald-50 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">What happens next?</p>
                  <div className="space-y-1.5 text-xs text-emerald-600">
                    <p>✓ Admin reviews your screenshot & UTR</p>
                    <p>✓ Payment marked as verified</p>
                    <p>✓ Binary ID activated instantly</p>
                    <p>✓ You start earning pair commissions</p>
                  </div>
                </div>
                <button
                  onClick={() => { setView('plan'); setOrderSuccess(false); fetchStatus(); }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-2xl transition-colors w-full"
                >
                  Go to Binary Plan →
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">

              {/* ── LEFT COLUMN: QR + Order Summary ── */}
              <div className="space-y-5">

                {/* Order Summary */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
                    <h2 className="text-white font-bold text-base flex items-center gap-2">
                      <Package size={16} /> Order Summary
                    </h2>
                  </div>
                  <div className="p-5">
                    <div className="space-y-3 mb-4">
                      {cart.map(item => (
                        <div key={`payment-summary-${item.id}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-purple-50 flex-shrink-0 flex items-center justify-center">
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              : <Package size={16} className="text-purple-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">Qty: {item.qty} · {item.bv * item.qty} BV</p>
                          </div>
                          <span className="text-sm font-bold text-gray-800">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Business Volume</span>
                        <span className="font-semibold text-emerald-600">{cartTotalBV} BV</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-gray-900">
                        <span>Total Amount</span>
                        <span className="text-purple-600">₹{cartTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Scan & Pay via UPI</p>
                  <p className="text-2xl font-bold text-purple-700 mb-5">₹{cartTotal.toLocaleString('en-IN')}</p>

                  <div className="inline-flex flex-col items-center justify-center w-52 h-52 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-dashed border-purple-200 rounded-2xl mx-auto mb-5">
                    <QrCode size={72} className="text-purple-300 mb-2" />
                    <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed">
                      Replace with your<br />company UPI QR image
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 mb-3">
                    <IndianRupee size={15} className="text-purple-500 flex-shrink-0" />
                    <span className="font-mono text-purple-800 font-semibold text-sm">rajdhanvarsha@upi</span>
                    <button
                      onClick={() => navigator.clipboard?.writeText('rajdhanvarsha@upi')}
                      className="ml-1 text-purple-400 hover:text-purple-700 transition-colors p-1 hover:bg-purple-100 rounded-lg"
                      title="Copy UPI ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-left">
                    <span className="text-amber-500 flex-shrink-0 text-base">⚠️</span>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Pay the exact amount shown. Do not close this page after payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Transaction Details ── */}
              <div className="space-y-5">

                {/* Steps indicator */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">How to pay</p>
                  <div className="space-y-3">
                    {[
                      { n: '1', text: 'Scan the QR code or copy the UPI ID' },
                      { n: '2', text: 'Pay exactly ₹' + cartTotal.toLocaleString('en-IN') + ' from any UPI app' },
                      { n: '3', text: 'Note the UTR / Transaction ID from your app' },
                      { n: '4', text: 'Upload screenshot & enter UTR below' },
                    ].map(step => (
                      <div key={step.n} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step.n}</div>
                        <p className="text-sm text-gray-600">{step.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transaction form */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 text-base mb-5">Confirm Your Payment</h2>

                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    UTR / Transaction ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={e => setUtrNumber(e.target.value)}
                    placeholder="e.g. 426891234567"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />

                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Payment Screenshot <span className="text-red-400">*</span>
                  </label>

                  {screenshotPrev ? (
                    <div className="relative mb-5">
                      <img
                        src={screenshotPrev}
                        alt="Payment screenshot"
                        className="w-full max-h-60 object-contain rounded-2xl border-2 border-purple-100"
                      />
                      <button
                        onClick={() => { setScreenshot(null); setScreenshotPrev(''); }}
                        className="absolute top-2.5 right-2.5 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-red-50 transition-colors"
                      >
                        <X size={14} className="text-gray-500" />
                      </button>
                      <div className="absolute bottom-2.5 left-2.5 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> Screenshot added
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all mb-5 group">
                      <div className="w-10 h-10 bg-gray-100 group-hover:bg-purple-100 rounded-xl flex items-center justify-center mb-2 transition-colors">
                        <Upload size={20} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-gray-500 group-hover:text-purple-600 transition-colors">Click to upload screenshot</span>
                      <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP — max 5 MB</span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleScreenshotChange} />
                    </label>
                  )}

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-4 flex items-start gap-2">
                      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                      {submitError}
                    </div>
                  )}

                  <button
                    onClick={handlePaymentSubmit}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-300 disabled:to-indigo-300 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-200 text-sm"
                  >
                    {submitting
                      ? <><Loader2 size={16} className="animate-spin" /> Verifying your payment…</>
                      : <><CheckCheck size={16} /> Submit Payment for Verification</>}
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-3">
                    🔒 Secure · Admin verifies within 24 hours · Binary ID activates automatically
                  </p>
                </div>
              </div>
            </div>
          )}
          </div>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW: SHOP
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === 'shop') {
    const displayProducts = products.length > 0 ? products : DEMO_PRODUCTS;

    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 pb-52">

          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setView('plan')} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={20} className="text-purple-600" /> Select Products
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Add products worth ≥600 BV to activate Binary ID</p>
            </div>
            {cartCount > 0 && (
              <div className="relative">
                <ShoppingCart size={22} className="text-purple-600" />
                <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
            )}
          </div>

          {/* BV progress */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Business Volume</span>
              <span className={`font-bold ${bvMet ? 'text-emerald-600' : 'text-purple-600'}`}>
                {cartTotalBV} / 600 BV
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${bvMet ? 'bg-emerald-500' : 'bg-purple-500'}`}
                style={{ width: `${Math.min((cartTotalBV / 600) * 100, 100)}%` }}
              />
            </div>
            {bvMet
              ? <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1"><CheckCircle2 size={12} /> 600 BV requirement met!</p>
              : cartTotalBV > 0
                ? <p className="text-xs text-gray-400 mt-1.5">{600 - cartTotalBV} more BV needed</p>
                : null}
          </div>

          {/* Products */}
          {productsLoad ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
              {displayProducts.map(product => {
                const cartItem = cart.find(i => i.id === product.id);
                return (
                  <div key={`product-${product.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="w-full h-48 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package size={32} className="text-purple-200" />
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-gray-800 mb-0.5 leading-tight">{product.name}</h3>
                    {product.description && (
                      <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{product.description}</p>
                    )}

                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-base font-bold text-gray-800">₹{product.price.toLocaleString('en-IN')}</p>
                        <p className="text-[11px] text-gray-400 line-through">MRP ₹{product.mrp.toLocaleString('en-IN')}</p>
                        <p className="text-[11px] text-purple-500 font-medium">{product.bv} BV</p>
                      </div>
                    </div>

                    {cartItem ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden flex-1">
                          <button onClick={() => changeQty(product.id, -1)} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                            <Minus size={13} />
                          </button>
                          <span className="flex-1 text-center text-sm font-semibold">{cartItem.qty}</span>
                          <button onClick={() => changeQty(product.id, 1)} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                            <Plus size={13} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus size={13} /> Add to Cart
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating cart pill */}
          {cart.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
              <button
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-3 bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-full shadow-2xl transition-all"
              >
                <div className="relative">
                  <ShoppingCart size={18} />
                  <span className="absolute -top-2 -right-2 bg-white text-purple-700 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <span className="text-sm font-semibold">{cartCount} item{cartCount > 1 ? 's' : ''} in cart</span>
                <span className="text-sm font-bold">₹{cartTotal.toLocaleString('en-IN')}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Cart side drawer */}
          {cartOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/30 z-40"
                onClick={() => setCartOpen(false)}
              />
              <div className="fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-purple-700">
                  <h2 className="text-white font-bold text-base flex items-center gap-2">
                    <ShoppingCart size={18} /> Cart ({cartCount})
                  </h2>
                  <button onClick={() => setCartOpen(false)} className="text-white hover:text-purple-200 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {cart.map(item => (
                    <div key={`drawer-${item.id}`} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                          : <Package size={18} className="text-purple-200" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-[11px] text-purple-500 font-medium">BV {item.bv}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <button onClick={() => changeQty(item.id, -1)} className="px-2 py-1 hover:bg-gray-50 transition-colors"><Minus size={10} /></button>
                            <span className="px-2 text-xs font-bold">{item.qty}</span>
                            <button onClick={() => changeQty(item.id, 1)} className="px-2 py-1 hover:bg-gray-50 transition-colors"><Plus size={10} /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 px-5 py-4 bg-white">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Total BV</span>
                    <span className={`font-bold ${bvMet ? 'text-emerald-600' : 'text-purple-600'}`}>{cartTotalBV} BV</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-800 mb-3">
                    <span>Total Amount</span>
                    <span className="text-purple-700">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {!bvMet && (
                    <p className="text-[11px] text-amber-500 text-center mb-2">
                      Add {600 - cartTotalBV} more BV to unlock payment
                    </p>
                  )}
                  <button
                    onClick={() => { setCartOpen(false); setView('payment'); }}
                    disabled={!bvMet}
                    className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl transition-colors
                      ${bvMet ? 'bg-purple-700 hover:bg-purple-800 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    {!bvMet ? <Lock size={14} /> : <ArrowRight size={14} />}
                    Proceed to Payment →
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW: PLAN (binary plan overview)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pb-24 max-w-2xl">

        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <GitBranch size={20} className="text-purple-600" /> Binary Plan
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Earn ₹150 for every pair in your downline</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Status banner */}
        {isEnrolled && (
          <div className={`rounded-2xl p-4 mb-4 flex items-start gap-3 ${isActive ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            {isActive
              ? <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              : <AlertCircle  size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />}
            <div>
              <p className={`font-semibold text-sm ${isActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isActive ? 'Binary ID Active' : 'Placed — Activation Pending'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isActive
                  ? status?.position === 'ROOT'
                    ? `Root of the binary tree · ${status?.totalDownlineCount} downline member(s)`
                    : `Level ${status?.treeLevel} · ${status?.position} side · ${status?.totalDownlineCount} downline member(s)`
                  : 'Your payment is under admin review. Binary ID will activate once approved.'}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        {isEnrolled && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard label="Left Leg"   value={status?.leftLegCount ?? 0}   color="text-blue-600" />
            <StatCard label="Right Leg"  value={status?.rightLegCount ?? 0}  color="text-purple-600" />
            <StatCard label="Pairs Done" value={status?.pairsCompleted ?? 0} color="text-amber-600" />
          </div>
        )}

        {/* Rules */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
          <button
            onClick={() => setShowRules(r => !r)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700"
          >
            <span>Binary Plan Rules & Commission</span>
            {showRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showRules && (
            <div className="px-4 pb-4 space-y-3">
              <RuleItem icon="🌳" text="Each user can sponsor exactly 2 people — one LEFT and one RIGHT." />
              <RuleItem icon="💰" text="Every matched pair (1 LEFT + 1 RIGHT) earns you ₹150 instantly." />
              <RuleItem icon="🛍️" text="To activate your Binary ID, purchase products worth at least 600 BV." />
              <RuleItem icon="🔒" text="First withdrawal requires ≥3 downline members (at least 2 on one side, 1 on the other)." />
              <RuleItem icon="📊" text="Pairs cascade — as your downline grows, commissions keep flowing." />
              <RuleItem icon="💳" text="Minimum withdrawal amount is ₹250." />
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Pair Earnings Example</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2 font-medium text-gray-500">Pairs</th>
                      <th className="text-right p-2 font-medium text-gray-500">Total Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairCommissionInfo.map(row => (
                      <tr key={`pair-row-${row.pairs}`} className="border-t border-gray-100">
                        <td className="p-2">{row.pairs}</td>
                        <td className="p-2 text-right font-semibold text-emerald-600">{row.earn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Join: root */}
        {!isEnrolled && isRootUser && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={16} className="text-amber-500" />
              <h2 className="font-semibold text-sm text-gray-700">You are the Root of the Binary Tree</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              As RD0001 you don&apos;t need a Sponsor ID — you&apos;re the very first member.
            </p>
            {joinError && <p className="text-xs text-red-500 mb-2">{joinError}</p>}
            {joinMsg   && <p className="text-xs text-emerald-600 mb-2">{joinMsg}</p>}
            <button
              onClick={handleJoinClick} disabled={joining}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {joining ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {joining ? 'Placing as root…' : 'Join Binary Plan as Root'}
            </button>
          </div>
        )}

        {/* Join: regular */}
        {!isEnrolled && !isRootUser && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <h2 className="font-semibold text-sm text-gray-700 mb-3">Join Binary Plan</h2>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sponsor ID</label>
            <input
              type="text" value={sponsorInput}
              onChange={e => setSponsorInput(e.target.value.trim().toUpperCase())}
              placeholder="e.g. RD0001"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <label className="block text-xs font-medium text-gray-500 mb-1">Your Position Under Sponsor</label>
            <div className="flex gap-3 mb-4">
              {(['LEFT', 'RIGHT'] as const).map(pos => (
                <button
                  key={`pos-btn-${pos}`} onClick={() => setPositionInput(pos)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors
                    ${positionInput === pos
                      ? pos === 'LEFT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                >
                  {pos}
                </button>
              ))}
            </div>
            {(joinError || previewError) && <p className="text-xs text-red-500 mb-2">{joinError || previewError}</p>}
            {joinMsg   && <p className="text-xs text-emerald-600 mb-2">{joinMsg}</p>}
            <button
              onClick={handleJoinClick} disabled={joining || previewLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {(joining || previewLoading) ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {joining ? 'Placing in tree…' : previewLoading ? 'Checking placement…' : 'Join Binary Plan'}
            </button>
          </div>
        )}

        {/* ── Activate section: 3 states based on pendingOrderStatus ── */}
        {isEnrolled && !isActive && (
          <>
            {/* PENDING: payment submitted, waiting for admin */}
            {pendingOrderStatus === 'Pending' && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
                <Loader2 size={18} className="text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />
                <div>
                  <h2 className="font-semibold text-sm text-blue-800 mb-1">Payment Under Review</h2>
                  <p className="text-xs text-blue-600">
                    Your payment has been submitted and is awaiting admin verification.
                    Your Binary ID will activate automatically once approved.
                  </p>
                </div>
              </div>
            )}

            {/* REJECTED: admin rejected, let them try again */}
            {pendingOrderStatus === 'Rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <h2 className="font-semibold text-sm text-red-800 mb-1">Payment Rejected</h2>
                <p className="text-xs text-red-600 mb-3">
                  Your previous payment was rejected by the admin. Please submit a new payment to activate your Binary ID.
                </p>
                <button
                  onClick={() => setView('shop')}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <ShoppingCart size={15} /> Go to Shop (600 BV required)
                </button>
              </div>
            )}

            {/* NO ORDER YET: first-time, prompt them to buy */}
            {!pendingOrderStatus && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <h2 className="font-semibold text-sm text-amber-800 mb-1">Activate Your Binary ID</h2>
                <p className="text-xs text-amber-600 mb-3">
                  Purchase products worth ≥600 BV to activate your ID and start earning pair commissions.
                </p>
                <button
                  onClick={() => setView('shop')}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <ShoppingCart size={15} /> Go to Shop (600 BV required)
                </button>
              </div>
            )}
          </>
        )}

        {/* Wallet */}
        {isEnrolled && wallet && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
            <button
              onClick={() => setShowWallet(w => !w)}
              className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700"
            >
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-purple-600" />
                <span>Binary Wallet</span>
                <span className="text-purple-600 font-bold">₹{wallet.balance.toFixed(2)}</span>
              </div>
              {showWallet ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showWallet && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <MiniStat label="Balance" value={`₹${wallet.balance.toFixed(0)}`}     color="text-emerald-600" />
                  <MiniStat label="Earned"  value={`₹${wallet.totalEarned.toFixed(0)}`} color="text-blue-600" />
                  <MiniStat label="Pairs"   value={wallet.pairsCount.toString()}         color="text-amber-600" />
                </div>
                <div className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-xs ${wallet.withdrawalUnlocked ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
                  {wallet.withdrawalUnlocked ? <Unlock size={14} className="flex-shrink-0 mt-0.5" /> : <Lock size={14} className="flex-shrink-0 mt-0.5" />}
                  <span>{wallet.withdrawalUnlockMessage}</span>
                </div>
                {wallet.withdrawalUnlocked && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Withdrawal Amount (min ₹250)</label>
                    <div className="flex gap-2">
                      <input
                        type="number" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                        placeholder="Enter amount"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <button
                        onClick={handleWithdraw} disabled={withdrawing}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1 transition-colors"
                      >
                        {withdrawing && <Loader2 size={12} className="animate-spin" />} Withdraw
                      </button>
                    </div>
                    {withdrawError && <p className="text-xs text-red-500 mt-1">{withdrawError}</p>}
                    {withdrawMsg   && <p className="text-xs text-emerald-600 mt-1">{withdrawMsg}</p>}
                  </div>
                )}
                {(wallet.recentTransactions ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Transactions</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {wallet.recentTransactions.map(txn => (
                        <div key={`txn-${txn.id}`} className="flex items-center justify-between text-xs bg-gray-50 rounded-xl px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-700">{txn.source}</p>
                            <p className="text-gray-400">{new Date(txn.createdAt).toLocaleDateString('en-IN')}</p>
                          </div>
                          <span className={`font-bold ${txn.type === 'Credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {txn.type === 'Credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isEnrolled && (
          <button
            onClick={() => router.push('/network/binary-view')}
            className="w-full bg-white border border-purple-200 text-purple-700 text-sm font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
          >
            <GitBranch size={16} /> View My Binary Tree
          </button>
        )}
      </main>

      {/* ── NEW: Placement confirmation modal (shown when the requested slot is taken) ── */}
      {showPlacementConfirm && placementPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle size={20} />
                <h2 className="font-semibold text-gray-800 text-sm">Position Already Taken</h2>
              </div>
              <button
                onClick={() => setShowPlacementConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">{placementPreview.message}</p>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-1">
              <p>You'll be placed under: <span className="font-semibold text-gray-800">{placementPreview.actualParentId}</span></p>
              <p>Side: <span className="font-semibold text-gray-800">{placementPreview.actualPosition}</span></p>
              <p>Tree level: <span className="font-semibold text-gray-800">{placementPreview.treeLevel}</span></p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPlacementConfirm(false)}
                className="px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowPlacementConfirm(false);
                  await doJoin();
                }}
                className="px-3 py-2 text-sm rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
              >
                Continue & Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small shared components ──────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function RuleItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex gap-2 text-xs text-gray-600">
      <span className="flex-shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}