"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:56188";

interface CartItem {
  id:        number;
  productNo: string;
  name:      string;
  dp:        number;
  mrp:       number;
  bv:        number;
  gst:       number;
  quantity:  number;
  image:     string;
}

type Step = "review" | "pay" | "confirm";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
}

function StepBar({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "review",  label: "Review Order" },
    { key: "pay",     label: "Make Payment" },
    { key: "confirm", label: "Confirmation" },
  ];
  const idx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-0 w-full max-w-lg mx-auto mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                i < idx
                  ? "bg-green-500 border-green-500 text-white"
                  : i === idx
                  ? "bg-[#3B5998] border-[#3B5998] text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] font-semibold whitespace-nowrap ${i === idx ? "text-[#3B5998]" : i < idx ? "text-green-500" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 rounded transition-all duration-300 ${i < idx ? "bg-green-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Inner component that uses useSearchParams ────────────────────────────────
function PaymentContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [cart, setCart]             = useState<CartItem[]>([]);
  const [step, setStep]             = useState<Step>("review");
  const [utr, setUtr]               = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = searchParams.get("cart");
    if (raw) {
      try { setCart(JSON.parse(decodeURIComponent(raw))); } catch {}
    }
  }, [searchParams]);

  useEffect(() => {
    if (!screenshot) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(screenshot);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  const totalDp  = cart.reduce((s, i) => s + i.dp * i.quantity, 0);
  const totalBv  = cart.reduce((s, i) => s + i.bv * i.quantity, 0);
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  const handleSubmit = async () => {
    if (!utr.trim()) { setSubmitError("Please enter the UTR / Transaction ID."); return; }
    if (!screenshot) { setSubmitError("Please upload the payment screenshot."); return; }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const token = getToken();
      const form  = new FormData();
      form.append("utr", utr.trim());
      form.append("screenshot", screenshot);
      form.append("totalAmount", String(totalDp));
      form.append("totalBv", String(totalBv));
      form.append("cartItems", JSON.stringify(
        cart.map((i) => ({ productId: i.id, productName: i.name, quantity: i.quantity, dp: i.dp, bv: i.bv }))
      ));

      const res = await fetch(`${BASE_URL}/api/Orders/payment`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setOrderId(data?.orderId || data?.id || "N/A");
      setStep("confirm");
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const QR_IMAGE_URL = "/images/payment-qr.png";
  const UPI_ID       = "rajdhanvarsha@upi";

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <LoginTopbar pageTitle="Payment" />

        <main className="flex-1 overflow-y-auto pb-10">
          <div className="max-w-3xl mx-auto px-4 pt-8">

            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#3B5998] mb-6 transition-colors"
            >
              ← Back to Shop
            </button>

            <StepBar current={step} />

            {/* ── STEP 1: Review ── */}
            {step === "review" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-lg">🧾</span>
                  <h2 className="font-bold text-gray-800">Order Summary</h2>
                  <span className="ml-auto text-xs text-gray-400">{totalQty} item{totalQty !== 1 ? "s" : ""}</span>
                </div>

                <ul className="divide-y divide-gray-50">
                  {cart.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {item.image
                          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-gray-400">{item.productNo}</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-[#3B5998]">₹{item.dp.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-gray-400 line-through">₹{item.mrp.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">BV {item.bv}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">×{item.quantity}</p>
                        <p className="text-sm font-bold text-gray-800">₹{(item.dp * item.quantity).toLocaleString("en-IN")}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total BV</span>
                    <span className="font-bold text-green-600">{totalBv.toLocaleString("en-IN")} BV</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                    <span className="text-2xl font-bold text-[#3B5998]">₹{totalDp.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="px-6 py-4">
                  <button
                    onClick={() => setStep("pay")}
                    className="w-full bg-[#3B5998] hover:bg-[#2d4578] text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-md"
                  >
                    Proceed to Pay ₹{totalDp.toLocaleString("en-IN")} →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Pay ── */}
            {step === "pay" && (
              <div className="flex flex-col gap-5">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800">Scan & Pay</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Use any UPI app — GPay, PhonePe, Paytm, BHIM</p>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6 px-6 py-6">
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                        <img
                          src={QR_IMAGE_URL}
                          alt="UPI QR Code"
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            (e.currentTarget.parentElement as HTMLDivElement).innerHTML =
                              `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:#9ca3af">
                                <div style="font-size:48px">📱</div>
                                <div style="font-size:11px;font-weight:600">QR Code</div>
                                <div style="font-size:10px">Replace QR_IMAGE_URL</div>
                              </div>`;
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium">Scan with any UPI app</p>
                    </div>

                    <div className="hidden md:flex flex-col items-center gap-2 self-stretch">
                      <div className="flex-1 w-px bg-gray-200" />
                      <span className="text-xs font-semibold text-gray-400 bg-white px-1">OR</span>
                      <div className="flex-1 w-px bg-gray-200" />
                    </div>
                    <div className="flex md:hidden items-center gap-2 w-full">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs font-semibold text-gray-400">OR</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="flex flex-col gap-4 flex-1 w-full">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">UPI ID</p>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                          <span className="flex-1 text-sm font-bold text-gray-800 select-all">{UPI_ID}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(UPI_ID)}
                            className="text-[10px] font-semibold text-[#3B5998] bg-[#e8eef8] hover:bg-[#3B5998] hover:text-white px-2 py-1 rounded-lg transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Amount to Pay</p>
                        <div className="bg-[#3B5998]/5 border border-[#3B5998]/20 rounded-xl px-4 py-3">
                          <span className="text-2xl font-bold text-[#3B5998]">₹{totalDp.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
                        <span className="text-amber-500 text-sm shrink-0">⚠️</span>
                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                          Pay the exact amount shown. After payment, upload the screenshot and enter the UTR number below.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800">Confirm Your Payment</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Upload screenshot and enter transaction ID</p>
                  </div>

                  <div className="px-6 py-6 flex flex-col gap-5">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
                        Payment Screenshot <span className="text-red-400">*</span>
                      </label>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                      />
                      {!previewUrl ? (
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="w-full border-2 border-dashed border-gray-300 hover:border-[#3B5998] rounded-xl py-10 flex flex-col items-center gap-2 transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-[#e8eef8] flex items-center justify-center text-2xl transition-colors">
                            📸
                          </div>
                          <p className="text-sm font-semibold text-gray-600 group-hover:text-[#3B5998] transition-colors">
                            Click to upload screenshot
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</p>
                        </button>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                          <img src={previewUrl} alt="Payment screenshot" className="w-full max-h-64 object-contain bg-gray-50" />
                          <button
                            onClick={() => { setScreenshot(null); if (fileRef.current) fileRef.current.value = ""; }}
                            className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-md transition-colors"
                          >✕</button>
                          <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-white text-xs font-semibold py-2 text-center">
                            ✓ Screenshot uploaded
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
                        UTR / Transaction ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 425612345678"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/10 transition-all font-mono"
                        maxLength={22}
                      />
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Find this in your UPI app under transaction details (12-digit number)
                      </p>
                    </div>

                    {submitError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2">
                        <span className="text-red-500 shrink-0">⚠️</span>
                        <p className="text-xs text-red-600 font-medium">{submitError}</p>
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full bg-[#3B5998] hover:bg-[#2d4578] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        "Submit Payment →"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Confirmation ── */}
            {step === "confirm" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl animate-bounce">
                    ✅
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Payment Submitted!</h2>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Your payment is under review. You'll be notified once it's verified by our team.
                  </p>

                  <div className="w-full max-w-sm bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100 text-left mt-2">
                    {orderId && (
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-xs text-gray-500 font-medium">Order ID</span>
                        <span className="text-xs font-bold text-gray-800 font-mono">#{orderId}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-xs text-gray-500 font-medium">UTR / Txn ID</span>
                      <span className="text-xs font-bold text-gray-800 font-mono">{utr}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-xs text-gray-500 font-medium">Amount Paid</span>
                      <span className="text-sm font-bold text-[#3B5998]">₹{totalDp.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-xs text-gray-500 font-medium">Total BV</span>
                      <span className="text-xs font-bold text-green-600">{totalBv.toLocaleString("en-IN")} BV</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-xs text-gray-500 font-medium">Status</span>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        Pending Verification
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4 w-full max-w-sm">
                    <button
                      onClick={() => router.push("/shop/products")}
                      className="flex-1 bg-[#3B5998] hover:bg-[#2d4578] text-white font-bold py-3 rounded-xl text-sm transition-colors"
                    >
                      Continue Shopping
                    </button>
                    <button
                      onClick={() => router.push("/order-history")}
                      className="flex-1 border-2 border-[#3B5998] text-[#3B5998] hover:bg-[#3B5998] hover:text-white font-bold py-3 rounded-xl text-sm transition-colors"
                    >
                      View Orders
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Default export wrapped in Suspense ───────────────────────────────────────
export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#3B5998]/20 border-t-[#3B5998] rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading payment...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}