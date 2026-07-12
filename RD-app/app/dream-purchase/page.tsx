"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import LoginTopBar from "@/components/loginTopbar";
import {
  ShoppingCart, Plus, Minus, Trash2, X, ArrowRight, ArrowLeft,
  Package, CheckCheck, Copy, IndianRupee, Upload, AlertCircle,
  CheckCircle2, Loader2, QrCode,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  bv: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
}

interface CartItem extends Product {
  qty: number;
}

type PaymentStep = "cart" | "checkout" | "success";

// ─── API URL ──────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com";

const DREAM_PLAN_BV_TARGET = 600;

// IMPORTANT: this file must physically exist at "public/photos/QR.jpg" in your Next.js project.
const QR_IMAGE_URL = "/photos/QR.jpg";
const UPI_ID = "QR917404526380-0195@UNIONBANKOFINDIA";

// ─── Helper: get auth headers ─────────────────────────────────────────────────
function getToken(): string {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Product Image Component ──────────────────────────────────────────────────
function ProductImage({ imageUrl, name, className }: { imageUrl: string; name: string; className?: string }) {
  const [imgError, setImgError] = useState(false);

  if (!imageUrl || imgError) {
    return (
      <div className={`bg-[#eef1f8] flex items-center justify-center ${className ?? ""}`}>
        <Package size={22} className="text-[#8fa0ce]" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      onError={() => setImgError(true)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DreamPurchasePage() {
  const router = useRouter();
  const [products, setProducts]                 = useState<Product[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [cart, setCart]                         = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [step, setStep]                         = useState<PaymentStep>("cart");
  const [showCart, setShowCart]                 = useState(false);
  const [qrFailed, setQrFailed]                 = useState(false);

  // payment form
  const [utrNumber, setUtrNumber]           = useState("");
  const [screenshot, setScreenshot]         = useState<File | null>(null);
  const [screenshotPrev, setScreenshotPrev] = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [orderMsg, setOrderMsg]             = useState("");

  // ── Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!getToken()) {
          router.push("/login");
          return;
        }

        const res = await fetch(`${API_URL}/api/Products`, {
          headers: getAuthHeaders(),
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.clear();
          router.push("/login");
          return;
        }

        if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);

        const data = await res.json();

        const mapped: Product[] = data.map((p: any) => ({
          id:          p.id,
          name:        p.productName,
          description: p.description ?? "",
          price:       p.dp,
          bv:          p.bv,
          imageUrl:    p.imageUrl ?? "",
          category:    p.category ?? "General",
          inStock:     true,
        }));

        setProducts(mapped);
      } catch (err: any) {
        console.error("Products fetch error:", err);
        setError(err.message ?? "Could not load products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ── Derived values
  const CATEGORIES = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

  // ── Cart helpers
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing)
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((i) => i.id !== id));

  const updateQty = (id: number, qty: number) => {
    if (qty < 1) return removeFromCart(id);
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const totalBV      = cart.reduce((sum, i) => sum + i.bv * i.qty, 0);
  const totalPrice   = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount    = cart.reduce((sum, i) => sum + i.qty, 0);
  const bvProgress   = Math.min((totalBV / DREAM_PLAN_BV_TARGET) * 100, 100);
  const bvMet        = totalBV >= DREAM_PLAN_BV_TARGET;

  const filteredProducts =
    selectedCategory === "All" ? products : products.filter((p) => p.category === selectedCategory);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPrev(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Payment handler (UTR + screenshot, admin verification — same pattern as Binary Plan)
  const handlePaymentSubmit = async () => {
    setSubmitError(null);
    if (!utrNumber.trim()) { setSubmitError("Please enter the UTR / Transaction ID."); return; }
    if (!screenshot)       { setSubmitError("Please upload your payment screenshot."); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("Utr", utrNumber.trim());
      formData.append("Screenshot", screenshot);
      formData.append("PlanType", "Dream Plan");
      formData.append("TotalAmount", totalPrice.toString());
      formData.append("TotalBv", totalBV.toString());
      formData.append(
        "CartItems",
        JSON.stringify(
          cart.map((i) => ({
            productId: i.id,
            productName: i.name,
            quantity: i.qty,
            price: i.price,
            bv: i.bv,
          }))
        )
      );

      const token = getToken();
      const res = await fetch(`${API_URL}/api/Orders/payment`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        router.push("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Submission failed (${res.status})`);

      setOrderMsg(data.message || "Order submitted! Admin will verify and activate your Dream Plan.");
      setCart([]);
      setStep("success");
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCart([]);
    setStep("cart");
    setShowCart(false);
    setUtrNumber("");
    setScreenshot(null);
    setScreenshotPrev("");
    router.push("/plan");
  };

  const handleCopyUpi = () => navigator.clipboard?.writeText(UPI_ID);

  // ─── Shell wrapper ────────────────────────────────────────────────────────────
  const Shell = ({ children, gradient }: { children: React.ReactNode; gradient?: boolean }) => (
    <div className={`flex h-screen overflow-hidden ${gradient ? "bg-gradient-to-br from-slate-50 via-[#eef1f8] to-indigo-50" : "bg-gray-50"}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="sticky top-0 z-20 shrink-0 bg-white">
          <LoginTopBar pagetitle="Dream Purchase" />
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESS SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "success") {
    return (
      <Shell gradient>
        <div className="p-6 md:p-8 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-emerald-100">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCheck size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Submitted!</h2>
              <p className="text-gray-500 mb-2">{orderMsg}</p>
              <p className="text-sm text-gray-400 mb-8">
                Admin will verify your payment within <span className="font-semibold text-gray-600">24 hours</span> and activate your Dream Plan automatically.
              </p>
              <div className="bg-emerald-50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">What happens next?</p>
                <div className="space-y-1.5 text-xs text-emerald-600">
                  <p>✓ Admin reviews your screenshot &amp; UTR</p>
                  <p>✓ Payment marked as verified</p>
                  <p>✓ Dream Plan activated instantly</p>
                  <p>✓ You can start referring up to 10 direct joinings</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="bg-[#3b5998] hover:bg-[#2f4677] text-white font-semibold px-8 py-3 rounded-2xl transition-colors w-full"
              >
                Go to Plans →
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKOUT / PAYMENT SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "checkout") {
    return (
      <Shell gradient>
        <div className="p-6 md:p-8 pb-12 flex flex-col items-center">
          <div className="w-full max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => setStep("cart")}
                className="p-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <ArrowLeft size={18} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
                <p className="text-sm text-gray-400 mt-0.5">Dream Plan · Scan · Pay · Confirm</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
              <div className="space-y-5">
                {/* Order Summary */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#3b5998] to-indigo-600 px-5 py-4">
                    <h2 className="text-white font-bold text-base flex items-center gap-2">
                      <Package size={16} /> Order Summary
                    </h2>
                  </div>
                  <div className="p-5">
                    <div className="space-y-3 mb-4">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <ProductImage imageUrl={item.imageUrl} name={item.name} className="w-10 h-10 rounded-xl flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">Qty: {item.qty} · {item.bv * item.qty} BV</p>
                          </div>
                          <span className="text-sm font-bold text-gray-800">₹{(item.price * item.qty).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Business Volume</span>
                        <span className="font-semibold text-emerald-600">{totalBV} BV</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-gray-900">
                        <span>Total Amount</span>
                        <span className="text-[#3b5998]">₹{totalPrice.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Scan &amp; Pay via UPI</p>
                  <p className="text-2xl font-bold text-[#2f4677] mb-5">₹{totalPrice.toLocaleString("en-IN")}</p>

                  <div className="inline-flex flex-col items-center justify-center w-52 h-52 bg-gradient-to-br from-[#eef1f8] to-indigo-50 border-2 border-dashed border-[#b8c3e1] rounded-2xl mx-auto mb-5 overflow-hidden">
                    {!qrFailed ? (
                      <img
                        src={QR_IMAGE_URL}
                        alt="UPI QR Code"
                        className="w-full h-full object-contain p-3"
                        onError={() => setQrFailed(true)}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-4 text-center">
                        <QrCode size={56} className="text-[#8fa0ce]" />
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          QR image not found.<br />
                          Add it at <code className="font-mono">public{QR_IMAGE_URL}</code>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 bg-[#eef1f8] border border-[#dde3f1] rounded-2xl px-4 py-3 mb-3">
                    <IndianRupee size={15} className="text-[#46608f] flex-shrink-0" />
                    <span className="font-mono text-[#253a63] font-semibold text-xs break-all">{UPI_ID}</span>
                    <button
                      onClick={handleCopyUpi}
                      className="ml-1 text-[#5f76ab] hover:text-[#2f4677] transition-colors p-1 hover:bg-[#dde3f1] rounded-lg flex-shrink-0"
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

              <div className="space-y-5">
                {/* Steps indicator */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">How to pay</p>
                  <div className="space-y-3">
                    {[
                      { n: "1", text: "Scan the QR code or copy the UPI ID" },
                      { n: "2", text: "Pay exactly ₹" + totalPrice.toLocaleString("en-IN") + " from any UPI app" },
                      { n: "3", text: "Note the UTR / Transaction ID from your app" },
                      { n: "4", text: "Upload screenshot & enter UTR below" },
                    ].map((s) => (
                      <div key={s.n} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#dde3f1] text-[#2f4677] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</div>
                        <p className="text-sm text-gray-600">{s.text}</p>
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
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 426891234567"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-[#5f76ab] focus:border-transparent transition-all"
                  />

                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Payment Screenshot <span className="text-red-400">*</span>
                  </label>

                  {screenshotPrev ? (
                    <div className="relative mb-5">
                      <img
                        src={screenshotPrev}
                        alt="Payment screenshot"
                        className="w-full max-h-60 object-contain rounded-2xl border-2 border-[#dde3f1]"
                      />
                      <button
                        onClick={() => { setScreenshot(null); setScreenshotPrev(""); }}
                        className="absolute top-2.5 right-2.5 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-red-50 transition-colors"
                      >
                        <X size={14} className="text-gray-500" />
                      </button>
                      <div className="absolute bottom-2.5 left-2.5 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> Screenshot added
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-[#5f76ab] hover:bg-[#eef1f8] transition-all mb-5 group">
                      <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#dde3f1] rounded-xl flex items-center justify-center mb-2 transition-colors">
                        <Upload size={20} className="text-gray-400 group-hover:text-[#46608f] transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-gray-500 group-hover:text-[#3b5998] transition-colors">Click to upload screenshot</span>
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
                    className="w-full bg-gradient-to-r from-[#3b5998] to-indigo-600 hover:from-[#2f4677] hover:to-indigo-700 disabled:from-[#8fa0ce] disabled:to-indigo-300 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#b8c3e1] text-sm"
                  >
                    {submitting
                      ? <><Loader2 size={16} className="animate-spin" /> Verifying your payment…</>
                      : <><CheckCheck size={16} /> Submit Payment for Verification</>}
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-3">
                    🔒 Secure · Admin verifies within 24 hours · Dream Plan activates automatically
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SHOP / CART SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Shell>
      <div className="p-4 md:p-6 pb-24 flex-1">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart size={20} className="text-[#3b5998]" /> Dream Plan — Select Products
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Add products worth at least {DREAM_PLAN_BV_TARGET} BV to activate your Dream Plan
            </p>
          </div>
          {cartCount > 0 && (
            <div className="relative">
              <ShoppingCart size={22} className="text-[#3b5998]" />
              <span className="absolute -top-1.5 -right-1.5 bg-[#3b5998] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </div>
          )}
        </div>

        {/* BV progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Business Volume</span>
            <span className={`font-bold ${bvMet ? "text-emerald-600" : "text-[#3b5998]"}`}>
              {totalBV} / {DREAM_PLAN_BV_TARGET} BV
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${bvMet ? "bg-emerald-500" : "bg-[#46608f]"}`}
              style={{ width: `${bvProgress}%` }}
            />
          </div>
          {bvMet
            ? <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1"><CheckCircle2 size={12} /> {DREAM_PLAN_BV_TARGET} BV requirement met!</p>
            : totalBV > 0
              ? <p className="text-xs text-gray-400 mt-1.5">{DREAM_PLAN_BV_TARGET - totalBV} more BV needed</p>
              : null}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat
                  ? "bg-[#3b5998] text-white border-[#3b5998]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#8fa0ce]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin mb-3" />
            <p className="text-sm">Loading products...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle size={28} className="text-red-400 mb-3" />
            <p className="text-red-500 font-medium text-sm mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#3b5998] hover:bg-[#2f4677] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package size={28} className="mb-3" />
            <p className="text-sm">No products found in this category.</p>
          </div>
        )}

        {/* Products */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((i) => i.id === product.id);
              return (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="w-full h-48 bg-gradient-to-br from-[#eef1f8] to-indigo-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Package size={32} className="text-[#b8c3e1]" />
                    )}
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{product.category}</p>
                  <h3 className="font-semibold text-sm text-gray-800 mb-0.5 leading-tight">{product.name}</h3>
                  {product.description && (
                    <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{product.description}</p>
                  )}

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-base font-bold text-gray-800">₹{product.price.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-[#46608f] font-medium">{product.bv} BV</p>
                    </div>
                  </div>

                  {cartItem ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden flex-1">
                        <button onClick={() => updateQty(product.id, cartItem.qty - 1)} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                          <Minus size={13} />
                        </button>
                        <span className="flex-1 text-center text-sm font-semibold">{cartItem.qty}</span>
                        <button onClick={() => updateQty(product.id, cartItem.qty + 1)} className="px-3 py-2 hover:bg-gray-50 transition-colors">
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
                      className="w-full bg-[#3b5998] hover:bg-[#2f4677] text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
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
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-3 bg-[#2f4677] hover:bg-[#253a63] text-white pl-4 pr-5 py-3 rounded-full shadow-2xl transition-all"
            >
              <div className="relative">
                <ShoppingCart size={18} />
                <span className="absolute -top-2 -right-2 bg-white text-[#2f4677] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="text-sm font-bold whitespace-nowrap">₹{totalPrice.toLocaleString("en-IN")}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* Cart side drawer */}
        {showCart && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowCart(false)} />
            <div className="fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#2f4677]">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <ShoppingCart size={18} /> Cart ({cartCount})
                </h2>
                <button onClick={() => setShowCart(false)} className="text-white hover:text-[#b8c3e1] transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {cart.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center mt-6">No items added yet.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                      <ProductImage imageUrl={item.imageUrl} name={item.name} className="w-12 h-12 rounded-lg flex-shrink-0 bg-white border border-gray-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-[11px] text-[#46608f] font-medium">BV {item.bv}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2 py-1 hover:bg-gray-50 transition-colors"><Minus size={10} /></button>
                            <span className="px-2 text-xs font-bold">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2 py-1 hover:bg-gray-50 transition-colors"><Plus size={10} /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">₹{(item.price * item.qty).toLocaleString("en-IN")}</span>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-gray-100 px-5 py-4 bg-white">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Total BV</span>
                    <span className={`font-bold ${bvMet ? "text-emerald-600" : "text-[#3b5998]"}`}>{totalBV} BV</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-800 mb-3">
                    <span>Total Amount</span>
                    <span className="text-[#2f4677]">₹{totalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  {!bvMet && (
                    <p className="text-[11px] text-amber-500 text-center mb-2">
                      Add {DREAM_PLAN_BV_TARGET - totalBV} more BV to unlock payment
                    </p>
                  )}
                  <button
                    onClick={() => { if (bvMet) { setShowCart(false); setStep("checkout"); } }}
                    disabled={!bvMet}
                    className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl transition-colors ${
                      bvMet ? "bg-[#2f4677] hover:bg-[#253a63] text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <ArrowRight size={14} /> Proceed to Payment →
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}