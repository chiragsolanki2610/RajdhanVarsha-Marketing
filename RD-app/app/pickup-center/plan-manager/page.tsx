"use client";

import { useEffect, useMemo, useState } from "react";
import PickupCenterSidebar from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";
import {
  ArrowLeft,
  Banknote,
  Check,
  Layers,
  Minus,
  Plus,
  Search,
  Smartphone,
  User,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://rd-api-j7zj.onrender.com";
const MIN_BV = 600;
const BRAND = "#3B5998";

type PlanType = "Dream Plan" | "Binary Plan";
type Step = "find" | "sponsor" | "products" | "confirm" | "done";

interface LookupResult {
  userId: string;
  name: string;
  mobileNo: string;
  planType: PlanType;
  hasSponsor: boolean;
  sponsorId: string | null;
  sponsorName: string | null;
  alreadyActiveForPlan: boolean;
  requiredBv: number;
}

interface Product {
  productId: number;
  productNo: string;
  productName: string;
  category: string;
  imageUrl: string;
  dp: number;
  bv: number;
  mrp: number;
  quantity: number;
}

interface CartLine {
  productId: number;
  quantity: number;
}

interface ActivateResult {
  message: string;
  orderId: number;
  userId: string;
  customerName: string;
  totalAmount: number;
  totalBv: number;
  receiptAvailable: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pucToken");
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message ?? `Request failed (${res.status}).`);
  }
  return body as T;
}

export default function PlanManagerPage() {
  const [step, setStep] = useState<Step>("find");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Topbar info
  const [operatorName, setOperatorName] = useState("Operator");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pucInfo");
      if (raw) {
        const parsed = JSON.parse(raw);
        setOperatorName(parsed?.fullName || parsed?.username || "Operator");
      }
    } catch (e) {
      console.error("Failed parsing pucInfo:", e);
    }
  }, []);

  // Step 1: find user
  const [userId, setUserId] = useState("");
  const [planType, setPlanType] = useState<PlanType>("Dream Plan");
  const [lookup, setLookup] = useState<LookupResult | null>(null);

  // Step 2: sponsor
  const [sponsorId, setSponsorId] = useState("");
  const [preferredPosition, setPreferredPosition] = useState<"LEFT" | "RIGHT">("LEFT");

  // Step 3: products
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});

  // Step 4: confirm
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [result, setResult] = useState<ActivateResult | null>(null);

  const cartLines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId: Number(productId), quantity })),
    [cart]
  );

  const totals = useMemo(() => {
    let bv = 0;
    let amount = 0;
    for (const line of cartLines) {
      const p = products.find((p) => p.productId === line.productId);
      if (!p) continue;
      bv += p.bv * line.quantity;
      amount += p.dp * line.quantity;
    }
    return { bv, amount };
  }, [cartLines, products]);

  const bvMet = totals.bv >= MIN_BV;
  const bvPercent = Math.min(100, Math.round((totals.bv / MIN_BV) * 100));

  async function handleLookup() {
    if (!userId.trim()) {
      setError("Enter the member's User ID.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api<LookupResult>(
        `/api/PickupCenter/plan-manager/lookup/${encodeURIComponent(userId.trim())}?planType=${encodeURIComponent(planType)}`
      );
      setLookup(data);

      if (data.alreadyActiveForPlan) {
        setError(`${data.name} (${data.userId}) already has an active ${planType}.`);
        return;
      }

      if (!data.hasSponsor) {
        setStep("sponsor");
      } else {
        await loadProducts();
        setStep("products");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that user.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetSponsor() {
    if (!sponsorId.trim()) {
      setError("Enter the Sponsor ID the member told you.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api(`/api/PickupCenter/plan-manager/set-sponsor`, {
        method: "POST",
        body: JSON.stringify({
          userId: lookup?.userId,
          sponsorId: sponsorId.trim(),
          planType,
          preferredPosition: planType === "Binary Plan" ? preferredPosition : undefined,
        }),
      });
      await loadProducts();
      setStep("products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set the sponsor.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    const data = await api<Product[]>(`/api/PickupCenter/plan-manager/products`);
    setProducts(data);
  }

  function setQuantity(productId: number, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  }

  const filteredProducts = products.filter((p) =>
    p.productName.toLowerCase().includes(productSearch.toLowerCase())
  );

  async function handleActivate() {
    if (!lookup) return;
    if (!bvMet) {
      setError(`Selected BV is ${totals.bv}. Minimum ${MIN_BV} BV is required to activate.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api<ActivateResult>(`/api/PickupCenter/plan-manager/activate`, {
        method: "POST",
        body: JSON.stringify({
          userId: lookup.userId,
          planType,
          paymentMethod,
          items: cartLines,
        }),
      });
      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate the plan.");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setStep("find");
    setError(null);
    setUserId("");
    setLookup(null);
    setSponsorId("");
    setPreferredPosition("LEFT");
    setCart({});
    setProductSearch("");
    setPaymentMethod("cash");
    setResult(null);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PickupCenterSidebar />

      {/* min-w-0 + overflow-x-hidden stops the step bar pushing the page sideways on phones */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden pb-20 md:pb-0">
        <PickupCenterTopbar title="Activate a Plan" operatorName={operatorName} />

        <div className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
          {/* Page heading */}
          <header className="mb-5 flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
              style={{ backgroundColor: BRAND }}
            >
              <Layers size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold leading-tight text-slate-900">Activate a Plan</h1>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Find a member, confirm their sponsor, pick products and activate their{" "}
                <span className="font-semibold" style={{ color: BRAND }}>Dream</span> Plan.
                {/* Binary Plan hidden for now — restore this text when you bring it back:
                {" "}or <span className="font-semibold" style={{ color: BRAND }}>Binary</span> Plan. */}
              </p>
            </div>
          </header>

          <StepBar step={step} />

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {/* STEP 1: FIND USER */}
          {step === "find" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Plan
                  </label>
                  <div className="flex gap-2">
                    {([
                      "Dream Plan",
                      // "Binary Plan", // hidden for now — remove the // to bring it back
                    ] as PlanType[]).map((p) => {
                      const active = planType === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPlanType(p)}
                          style={active ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                            active
                              ? "text-white shadow-sm"
                              : "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {active && <Check size={16} strokeWidth={3} />}
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Member User ID
                  </label>
                  <div className="relative">
                    <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !loading && handleLookup()}
                      placeholder="e.g. RD0002"
                      autoCapitalize="characters"
                      className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-3 text-base outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/20"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleLookup}
                disabled={loading}
                style={{ backgroundColor: BRAND }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] hover:brightness-110 disabled:opacity-50"
              >
                <Search size={17} />
                {loading ? "Searching..." : "Find member"}
              </button>
            </section>
          )}

          {/* STEP 2: SPONSOR MISSING */}
          {step === "sponsor" && lookup && (
            <section className="space-y-4">
              <MemberCard name={lookup.name} userId={lookup.userId} planType={planType} />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                  This member doesn&apos;t have a sponsor set for the {planType}. Ask them for their
                  Sponsor ID and enter it below.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Sponsor ID
                    </label>
                    <input
                      value={sponsorId}
                      onChange={(e) => setSponsorId(e.target.value)}
                      placeholder="e.g. RD0001"
                      autoCapitalize="characters"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/20"
                    />
                  </div>

                  {planType === "Binary Plan" && (
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                        Preferred side
                      </label>
                      <div className="flex gap-2">
                        {(["LEFT", "RIGHT"] as const).map((side) => (
                          <button
                            key={side}
                            type="button"
                            onClick={() => setPreferredPosition(side)}
                            style={preferredPosition === side ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
                            className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                              preferredPosition === side
                                ? "text-white shadow-sm"
                                : "border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {side}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setStep("find")}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    onClick={handleSetSponsor}
                    disabled={loading}
                    style={{ backgroundColor: BRAND }}
                    className="flex-1 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save & continue"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: PRODUCTS */}
          {step === "products" && lookup && (
            <section className="space-y-4">
              <MemberCard name={lookup.name} userId={lookup.userId} planType={planType} />

              {/* BV progress */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wide text-slate-400">BV target</span>
                  <BvBadge bv={totals.bv} met={bvMet} />
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${bvPercent}%`, backgroundColor: bvMet ? "#059669" : BRAND }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {bvMet
                    ? "Minimum BV reached — you can continue."
                    : `Add ${MIN_BV - totals.bv} more BV to reach the ${MIN_BV} BV minimum.`}
                </p>
              </div>

              {/* Product list */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative mb-3">
                  <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-base outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/20"
                  />
                </div>

                <div className="space-y-2 md:max-h-[28rem] md:overflow-y-auto md:pr-1">
                  {filteredProducts.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-400">
                      No products in stock match your search.
                    </p>
                  )}
                  {filteredProducts.map((p) => {
                    const qty = cart[p.productId] ?? 0;
                    const selected = qty > 0;
                    return (
                      <div
                        key={p.productId}
                        className={`rounded-xl border p-3 transition ${
                          selected ? "border-[#3B5998] bg-[#3B5998]/[0.04]" : "border-slate-200"
                        }`}
                      >
                        <p className="text-sm font-semibold leading-snug text-slate-900">{p.productName}</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="min-w-0 text-xs text-slate-500">
                            <span className="font-semibold text-slate-800">₹{p.dp}</span>
                            <span className="mx-1.5 text-slate-300">|</span>
                            <span className="font-semibold" style={{ color: BRAND }}>{p.bv} BV</span>
                            <p className="mt-0.5 text-[11px] text-slate-400">{p.quantity} in stock</p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 p-1">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => setQuantity(p.productId, Math.max(0, qty - 1))}
                              disabled={qty === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-40"
                            >
                              <Minus size={15} />
                            </button>
                            <span className="w-7 text-center text-sm font-bold text-slate-900">{qty}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => setQuantity(p.productId, Math.min(p.quantity, qty + 1))}
                              disabled={qty >= p.quantity}
                              style={qty < p.quantity ? { backgroundColor: BRAND } : undefined}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition active:scale-95 disabled:bg-slate-300"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sticky summary bar (sits just above the mobile bottom nav) */}
              <div className="sticky bottom-[4.5rem] z-30 md:bottom-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                  <div className="min-w-0 pl-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {cartLines.length} item{cartLines.length === 1 ? "" : "s"} · {totals.bv} BV
                    </p>
                    <p className="text-lg font-extrabold leading-tight text-slate-900">
                      ₹{totals.amount.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("confirm")}
                    disabled={!bvMet || cartLines.length === 0}
                    style={bvMet && cartLines.length > 0 ? { backgroundColor: BRAND } : undefined}
                    className="shrink-0 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:bg-slate-300"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STEP 4: CONFIRM & ACTIVATE */}
          {step === "confirm" && lookup && (
            <section className="space-y-4">
              <MemberCard name={lookup.name} userId={lookup.userId} planType={planType} />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">
                  Order summary
                </h2>

                <dl className="space-y-2.5 rounded-xl bg-slate-50 p-4 text-sm">
                  <Row label="Plan" value={planType} />
                  <Row label="Items" value={`${cartLines.length} product${cartLines.length === 1 ? "" : "s"}`} />
                  <Row label="Total BV" value={`${totals.bv} BV`} highlight />
                  <Row label="Total amount" value={`₹${totals.amount.toFixed(2)}`} last big />
                </dl>

                <div className="mt-5">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Payment collected via
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cash", "upi"] as const).map((m) => {
                      const active = paymentMethod === m;
                      const Icon = m === "cash" ? Banknote : Smartphone;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          style={active ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold uppercase transition ${
                            active
                              ? "text-white shadow-sm"
                              : "border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icon size={17} /> {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    onClick={() => setStep("products")}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    onClick={handleActivate}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading ? "Activating..." : "Confirm payment & activate"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* DONE */}
          {step === "done" && result && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm md:p-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                <Check size={28} strokeWidth={3} />
              </div>
              <p className="text-base font-bold text-emerald-800">{result.message}</p>

              <div className="mt-4 divide-y divide-emerald-200/70 rounded-xl bg-white/70 text-sm text-emerald-900">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-emerald-700">Order</span>
                  <span className="font-semibold">#{result.orderId}</span>
                </div>
                <div className="flex justify-between gap-3 px-4 py-2.5">
                  <span className="text-emerald-700">Member</span>
                  <span className="truncate font-semibold">{result.customerName}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-emerald-700">Amount</span>
                  <span className="font-semibold">₹{result.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-emerald-700">BV</span>
                  <span className="font-semibold">{result.totalBv} BV</span>
                </div>
              </div>

              <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-emerald-700">
                Commission distribution has been triggered automatically for the sponsor chain
                {planType === "Binary Plan" ? " and pair matching." : "."}
              </p>
              <button
                onClick={resetAll}
                style={{ backgroundColor: BRAND }}
                className="mt-6 w-full rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 sm:w-auto"
              >
                Activate another plan
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "find", label: "Find member" },
    { key: "sponsor", label: "Sponsor" },
    { key: "products", label: "Products" },
    { key: "confirm", label: "Confirm" },
  ];
  const order: Step[] = ["find", "sponsor", "products", "confirm", "done"];
  const currentIndex = order.indexOf(step);
  const currentLabel = steps.find((s) => s.key === step)?.label ?? "Done";
  const currentNumber = Math.min(currentIndex + 1, steps.length);

  return (
    <div className="mb-5">
      {/* Circles + connectors: always fit on one line, even on small phones */}
      <div className="flex items-center">
        {steps.map((s, i) => {
          const idx = order.indexOf(s.key);
          const done = idx < currentIndex || step === "done";
          const current = idx === currentIndex;
          return (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <div
                style={current ? { backgroundColor: BRAND } : done ? { backgroundColor: "#059669" } : undefined}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  !current && !done ? "bg-slate-200 text-slate-500" : "text-white"
                } ${current ? "ring-4 ring-[#3B5998]/15" : ""}`}
              >
                {done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className="mx-1.5 h-0.5 flex-1 rounded-full"
                  style={{ backgroundColor: idx < currentIndex ? "#059669" : "#e2e8f0" }}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2.5 text-xs text-slate-400">
        {step === "done" ? (
          <span className="font-semibold text-emerald-600">All steps complete</span>
        ) : (
          <>
            Step {currentNumber} of {steps.length} ·{" "}
            <span className="font-semibold" style={{ color: BRAND }}>{currentLabel}</span>
          </>
        )}
      </p>
    </div>
  );
}

function MemberCard({
  name,
  userId,
  planType,
}: {
  name: string;
  userId: string;
  planType: PlanType;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: BRAND }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{name}</p>
        <p className="font-mono text-xs text-slate-500">{userId}</p>
      </div>
      <span
        className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold"
        style={{ backgroundColor: `${BRAND}1A`, color: BRAND }}
      >
        {planType}
      </span>
    </div>
  );
}

function BvBadge({ bv, met }: { bv: number; met: boolean }) {
  return (
    <span
      style={met ? { backgroundColor: "#05966920", color: "#059669" } : undefined}
      className={`rounded-full px-3 py-1 text-xs font-bold ${met ? "" : "bg-amber-100 text-amber-700"}`}
    >
      {bv} / {MIN_BV} BV
    </span>
  );
}

function Row({
  label,
  value,
  highlight,
  last,
  big,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  last?: boolean;
  big?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${last ? "" : "border-b border-slate-200 pb-2.5"}`}>
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`text-right font-semibold ${big ? "text-lg" : ""} ${highlight ? "" : "text-slate-900"}`}
        style={highlight ? { color: BRAND } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
