"use client";

import { useEffect, useMemo, useState } from "react";
import PickupCenterSidebar from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";
import { Check } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:56187";
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
      amount += p.mrp * line.quantity;
    }
    return { bv, amount };
  }, [cartLines, products]);

  const bvMet = totals.bv >= MIN_BV;

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

      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <PickupCenterTopbar title="Activate a Plan" operatorName={operatorName} />

        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <header className="mb-6">
            <p className="text-sm text-slate-500">
              Look up a member, confirm their sponsor, choose products, and activate their{" "}
              <span className="font-medium" style={{ color: BRAND }}>Dream</span> or{" "}
              <span className="font-medium" style={{ color: BRAND }}>Binary</span> Plan.
            </p>
          </header>

          <StepBar step={step} />

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          {/* STEP 1: FIND USER */}
          {step === "find" && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Plan</label>
                  <div className="flex gap-2">
                    {(["Dream Plan", "Binary Plan"] as PlanType[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlanType(p)}
                        style={planType === p ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
                        className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                          planType === p
                            ? "text-white shadow-sm"
                            : "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Member User ID</label>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. RD0002"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/20"
                  />
                </div>
              </div>

              <button
                onClick={handleLookup}
                disabled={loading}
                style={{ backgroundColor: BRAND }}
                className="mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {loading ? "Searching..." : "Find member"}
              </button>
            </section>
          )}

          {/* STEP 2: SPONSOR MISSING */}
          {step === "sponsor" && lookup && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{lookup.name}</span> ({lookup.userId}) doesn't have a
                sponsor set for the {planType}. Ask the member for their Sponsor ID and enter it below.
              </p>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Sponsor ID</label>
                  <input
                    value={sponsorId}
                    onChange={(e) => setSponsorId(e.target.value)}
                    placeholder="e.g. RD0001"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/20"
                  />
                </div>

                {planType === "Binary Plan" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Preferred side</label>
                    <div className="flex gap-2">
                      {(["LEFT", "RIGHT"] as const).map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setPreferredPosition(side)}
                          style={preferredPosition === side ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
                          className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
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
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSetSponsor}
                  disabled={loading}
                  style={{ backgroundColor: BRAND }}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save sponsor & continue"}
                </button>
              </div>
            </section>
          )}

          {/* STEP 3: PRODUCTS */}
          {step === "products" && lookup && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  Activating <span className="font-semibold text-slate-900">{planType}</span> for{" "}
                  <span className="font-semibold text-slate-900">{lookup.name}</span> ({lookup.userId})
                </p>
                <BvBadge bv={totals.bv} met={bvMet} />
              </div>

              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/20"
              />

              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {filteredProducts.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">No products in stock match your search.</p>
                )}
                {filteredProducts.map((p) => {
                  const qty = cart[p.productId] ?? 0;
                  const selected = qty > 0;
                  return (
                    <div
                      key={p.productId}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition ${
                        selected ? "border-[#3B5998] bg-[#3B5998]/[0.04]" : "border-slate-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{p.productName}</p>
                        <p className="text-xs text-slate-500">
                          ₹{p.mrp} · <span className="font-medium" style={{ color: BRAND }}>{p.bv} BV</span> · {p.quantity} in stock
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity(p.productId, Math.max(0, qty - 1))}
                          className="h-8 w-8 rounded-md border border-slate-300 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-slate-900">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(p.productId, Math.min(p.quantity, qty + 1))}
                          disabled={qty >= p.quantity}
                          style={{ borderColor: qty < p.quantity ? BRAND : undefined }}
                          className="h-8 w-8 rounded-md border text-sm font-medium transition hover:bg-slate-100 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-sm">
                  <p className="text-slate-500">
                    Total: <span className="font-semibold text-slate-900">₹{totals.amount.toFixed(2)}</span> ·{" "}
                    <span className={bvMet ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                      {totals.bv} BV
                    </span>{" "}
                    (min {MIN_BV})
                  </p>
                </div>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!bvMet || cartLines.length === 0}
                  style={bvMet && cartLines.length > 0 ? { backgroundColor: BRAND } : undefined}
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:bg-slate-300 disabled:opacity-100"
                >
                  Continue
                </button>
              </div>
            </section>
          )}

          {/* STEP 4: CONFIRM & ACTIVATE */}
          {step === "confirm" && lookup && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Confirm activation</h2>

              <dl className="mb-6 space-y-2.5 rounded-lg bg-slate-50 p-4 text-sm">
                <Row label="Member" value={`${lookup.name} (${lookup.userId})`} />
                <Row label="Plan" value={planType} />
                <Row label="Items" value={`${cartLines.length} product${cartLines.length === 1 ? "" : "s"}`} />
                <Row label="Total BV" value={`${totals.bv} BV`} highlight />
                <Row label="Total amount" value={`₹${totals.amount.toFixed(2)}`} last />
              </dl>

              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment collected via</label>
                <div className="flex gap-2">
                  {(["cash", "upi"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      style={paymentMethod === m ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium uppercase transition ${
                        paymentMethod === m
                          ? "text-white shadow-sm"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("products")}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleActivate}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "Activating..." : "Confirm payment & activate plan"}
                </button>
              </div>
            </section>
          )}

          {/* DONE */}
          {step === "done" && result && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check size={24} strokeWidth={3} />
              </div>
              <p className="text-base font-semibold text-emerald-800">{result.message}</p>
              <p className="mt-2 text-sm text-emerald-700">
                Order #{result.orderId} · {result.customerName} · ₹{result.totalAmount.toFixed(2)} · {result.totalBv} BV
              </p>
              <p className="mx-auto mt-2 max-w-md text-xs text-emerald-600">
                Commission distribution has been triggered automatically for the sponsor chain
                {planType === "Binary Plan" ? " and pair matching." : "."}
              </p>
              <button
                onClick={resetAll}
                style={{ backgroundColor: BRAND }}
                className="mt-6 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
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

  return (
    <div className="mb-6 flex items-center gap-2">
      {steps.map((s, i) => {
        const idx = order.indexOf(s.key);
        const done = idx < currentIndex || step === "done";
        const current = idx === currentIndex;
        return (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <div
              style={current ? { backgroundColor: BRAND } : done ? { backgroundColor: "#059669" } : undefined}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                !current && !done ? "bg-slate-200 text-slate-500" : "text-white"
              }`}
            >
              {done ? <Check size={14} strokeWidth={3} /> : i + 1}
            </div>
            <span
              style={current ? { color: BRAND } : undefined}
              className={`text-xs ${current ? "font-semibold" : done ? "font-medium text-emerald-600" : "text-slate-400"}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className="h-px flex-1"
                style={{ backgroundColor: idx < currentIndex ? "#059669" : "#e2e8f0" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BvBadge({ bv, met }: { bv: number; met: boolean }) {
  return (
    <span
      style={met ? { backgroundColor: `${BRAND}1A`, color: BRAND } : undefined}
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        met ? "" : "bg-amber-100 text-amber-700"
      }`}
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`flex justify-between ${last ? "" : "border-b border-slate-200 pb-2.5"}`}>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-semibold ${highlight ? "" : "text-slate-900"}`} style={highlight ? { color: BRAND } : undefined}>
        {value}
      </dd>
    </div>
  );
}