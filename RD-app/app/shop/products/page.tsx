"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://rd-api-j7zj.onrender.com";

// ─── Exact backend shape from GET /api/Products ───────────────────────────────
interface ApiProduct {
  id:          number;
  productNo:   string;
  productName: string;
  category:    string;
  description: string;
  mrp:         number;
  gst:         number;
  dp:          number;
  bv:          number;
  imageUrl:    string;
  createdAt:   string;
}

// ─── UI shape ─────────────────────────────────────────────────────────────────
interface Product {
  id:          number;
  productNo:   string;
  name:        string;
  category:    string;
  description: string;
  mrp:         number;
  gst:         number;
  dp:          number;
  bv:          number;
  image:       string;
}

interface CartItem extends Product {
  quantity: number;
}

// ─── Auth token ───────────────────────────────────────────────────────────────
function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
}

// ─── Map API → UI ─────────────────────────────────────────────────────────────
function toProduct(p: ApiProduct): Product {
  return {
    id:          p.id,
    productNo:   p.productNo   ?? "",
    name:        p.productName ?? "Unknown Product",
    category:    p.category    ?? "General",
    description: p.description ?? "",
    mrp:         p.mrp  ?? 0,
    gst:         p.gst  ?? 0,
    dp:          p.dp   ?? 0,
    bv:          p.bv   ?? 0,
    image:       p.imageUrl ?? "",
  };
}

// ─── API call ─────────────────────────────────────────────────────────────────
async function fetchProducts(): Promise<Product[]> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/Products`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data: ApiProduct[] = await res.json();
  return data.map(toProduct);
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
function CartDrawer({
  items, onClose, onUpdate, onCheckout,
}: {
  items: CartItem[];
  onClose: () => void;
  onUpdate: (id: number, delta: number) => void;
  onCheckout: () => void;
}) {
  const totalDp = items.reduce((s, i) => s + i.dp  * i.quantity, 0);
  const totalBv = items.reduce((s, i) => s + i.bv  * i.quantity, 0);
  const count   = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-white shadow-2xl z-[201] flex flex-col"
        style={{ animation: "slideIn .25s ease" }}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#3B5998] shrink-0">
          <h2 className="text-white font-bold text-lg">Cart ({count})</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-md px-2 py-1 transition-colors"
            aria-label="Close cart"
          >✕</button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
            <div className="text-5xl">🛒</div>
            <p className="text-sm font-medium">Your cart is empty</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-400">{item.productNo}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-[#3B5998]">₹{item.dp.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-gray-400 line-through">₹{item.mrp.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-green-600 font-semibold">BV {item.bv}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onUpdate(item.id, -1)}
                      className="w-7 h-7 rounded-md border border-gray-200 bg-white text-[#3B5998] font-bold hover:bg-[#3B5998] hover:text-white hover:border-[#3B5998] transition-colors flex items-center justify-center"
                    >−</button>
                    <span className="text-sm font-bold text-gray-800 min-w-[20px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdate(item.id, 1)}
                      className="w-7 h-7 rounded-md border border-gray-200 bg-white text-[#3B5998] font-bold hover:bg-[#3B5998] hover:text-white hover:border-[#3B5998] transition-colors flex items-center justify-center"
                    >+</button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Summary */}
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0 flex flex-col gap-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Total BV</span>
                <span className="font-bold text-green-600">{totalBv.toLocaleString("en-IN")} BV</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Total Amount</span>
                <span className="text-xl font-bold text-[#3B5998]">₹{totalDp.toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full bg-[#3B5998] hover:bg-[#2d4578] text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-md"
              >
                Proceed to Payment →
              </button>
            </div>
          </>
        )}
      </aside>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

// ─── Product Detail Modal ──────────────────────────────────────────────────────
function ProductModal({
  product, accent, inCart, onAdd, onUpdate, onClose, onViewCart,
}: {
  product: Product;
  accent: string;
  inCart: number;
  onAdd: (p: Product) => void;
  onUpdate: (id: number, delta: number) => void;
  onClose: () => void;
  onViewCart: () => void;
}) {
  const discount = product.mrp > product.dp
    ? Math.round(((product.mrp - product.dp) / product.mrp) * 100)
    : 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 md:p-8"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[85vh] overflow-y-auto flex flex-col md:flex-row"
          style={{ animation: "popIn .2s ease" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image side */}
          <div className="relative md:w-1/2 shrink-0 aspect-[4/3] md:aspect-auto bg-gray-100">
            {product.image
              ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-7xl text-gray-300">📦</div>
            }
            {product.category && (
              <span
                className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-100"
                style={{ color: accent }}
              >
                {product.category}
              </span>
            )}
            {discount > 0 && (
              <span className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Detail side */}
          <div className="flex-1 flex flex-col p-8 gap-4 relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md w-9 h-9 flex items-center justify-center transition-colors"
              aria-label="Close"
            >✕</button>

            <p className="text-xs font-mono text-gray-400">{product.productNo}</p>
            <h2 className="text-2xl font-bold text-gray-800 leading-snug pr-10">{product.name}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>

            {/* Price block */}
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold" style={{ color: accent }}>
                ₹{product.dp.toLocaleString("en-IN")}
              </span>
              {product.mrp > product.dp && (
                <span className="text-base text-gray-400 line-through">
                  ₹{product.mrp.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {/* Spec grid */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">MRP</p>
                <p className="text-base font-bold text-gray-800">₹{product.mrp.toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">DP</p>
                <p className="text-base font-bold text-gray-800">₹{product.dp.toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-green-500 font-semibold">BV</p>
                <p className="text-base font-bold text-green-700">{product.bv}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">GST</p>
                <p className="text-base font-bold text-gray-800">{product.gst}%</p>
              </div>
            </div>

            {/* Add to cart / quantity stepper + View Cart */}
            <div className="mt-auto pt-4">
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Add to Cart / Stepper — shrinks when item added */}
                <div
                  className="overflow-hidden shrink-0"
                  style={{
                    transition: "width 0.5s ease",
                    width: inCart === 0 ? "100%" : "120px",
                  }}
                >
                  {inCart === 0 ? (
                    <button
                      onClick={() => onAdd(product)}
                      className="w-full text-white font-bold py-3.5 rounded-xl text-sm shadow-md hover:opacity-90 whitespace-nowrap"
                      style={{ backgroundColor: accent, transition: "opacity 0.2s" }}
                    >
                      Add to cart
                    </button>
                  ) : (
                    <div
                      className="flex items-center justify-center gap-2 rounded-xl px-2 w-full h-[51px]"
                      style={{ backgroundColor: accent }}
                    >
                      <button
                        onClick={() => onUpdate(product.id, -1)}
                        className="w-7 h-7 rounded-md font-bold text-base text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                      >−</button>
                      <span className="text-base font-bold text-white min-w-[16px] text-center">{inCart}</span>
                      <button
                        onClick={() => onUpdate(product.id, 1)}
                        className="w-7 h-7 rounded-md font-bold text-base text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                      >+</button>
                    </div>
                  )}
                </div>

                {/* View Cart — grows from 0 when item added */}
                <div
                  className="overflow-hidden"
                  style={{
                    transition: "width 0.5s ease",
                    width: inCart === 0 ? "0px" : "100%",
                    minWidth: inCart === 0 ? "0px" : undefined,
                  }}
                >
                  <button
                    onClick={() => { onClose(); onViewCart(); }}
                    className="w-full font-bold py-3.5 rounded-xl text-sm border-2 flex items-center justify-center gap-2 whitespace-nowrap"
                    style={{
                      borderColor: accent,
                      color: accent,
                      backgroundColor: "transparent",
                      transition: "background-color 0.6s ease, color 0.6s ease",
                    }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget as HTMLButtonElement;
                      btn.style.backgroundColor = accent;
                      btn.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget as HTMLButtonElement;
                      btn.style.backgroundColor = "transparent";
                      btn.style.color = accent;
                    }}
                  >
                    🛒 View Cart
                    <span
                      className="text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {inCart}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
const ACCENTS = ["#6366f1", "#8b5cf6", "#22c55e", "#ef4444", "#f59e0b", "#3B5998"];

function ProductCard({
  product, inCart, onAdd, onUpdate, index, onView,
}: {
  product: Product;
  inCart: number;
  onAdd: (p: Product) => void;
  onUpdate: (id: number, delta: number) => void;
  index: number;
  onView: (p: Product, accent: string) => void;
}) {
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <article
      onClick={() => onView(product, accent)}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {product.image
          ? <img src={product.image} alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">📦</div>
        }
        {product.category && (
          <span
            className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-100"
            style={{ color: accent }}
          >
            {product.category}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-1.5">
        <p className="text-[10px] font-mono text-gray-400">{product.productNo}</p>
        <h3 className="text-sm font-bold text-gray-800 leading-snug">{product.name}</h3>
        <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-2">{product.description}</p>

        {/* Price row */}
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[#3B5998]">₹{product.dp.toLocaleString("en-IN")}</span>
              {product.mrp > product.dp && (
                <span className="text-xs text-gray-400 line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">
                BV {product.bv}
              </span>
              {product.gst > 0 && (
                <span className="text-[10px] text-gray-400">+{product.gst}% GST</span>
              )}
            </div>
          </div>

          {inCart === 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(product); }}
              className="text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 bg-[#e8eef8] text-[#3B5998] hover:bg-[#3B5998] hover:text-white"
            >
              Add to cart
            </button>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 shrink-0 rounded-lg px-1 py-1"
              style={{ backgroundColor: accent }}
            >
              <button
                onClick={() => onUpdate(product.id, -1)}
                className="w-6 h-6 rounded-md font-bold text-sm text-white flex items-center justify-center transition-colors hover:bg-white/20"
              >−</button>
              <span className="text-sm font-bold text-white min-w-[16px] text-center">{inCart}</span>
              <button
                onClick={() => onUpdate(product.id, 1)}
                className="w-6 h-6 rounded-md font-bold text-sm text-white flex items-center justify-center transition-colors hover:bg-white/20"
              >+</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts]             = useState<Product[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [cart, setCart]                     = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]             = useState(false);
  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewProduct, setViewProduct]       = useState<{ product: Product; accent: string } | null>(null);

  // ─── Plan Guard ───────────────────────────────────────────────────────────
  const [planChecked, setPlanChecked]   = useState(false);
  const [planActive, setPlanActive]     = useState(false);

  useEffect(() => {
    const checkPlan = async () => {
      try {
        const token = getToken();
        if (!token) { setPlanActive(false); setPlanChecked(true); return; }

        const res = await fetch(`${BASE_URL}/api/Plans/my-plan`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const active: boolean = data?.isActive ?? data?.IsActive ?? false;
          setPlanActive(active);
        } else {
          setPlanActive(false);
        }
      } catch {
        setPlanActive(false);
      } finally {
        setPlanChecked(true);
      }
    };
    checkPlan();
  }, []);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchProducts()
      .then(setProducts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const visible = products.filter((p) => {
    const matchCat    = activeCategory === "All" || p.category === activeCategory;
    const q           = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.productNo.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const addToCart = (product: Product) =>
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });

  const updateCart = (id: number, delta: number) =>
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0)
    );

  const router = useRouter();

  const handleCheckout = () => {
    // Serialize cart to query or pass via state/context
    const cartData = encodeURIComponent(JSON.stringify(cart));
    router.push(`/shop/payment?cart=${cartData}`);
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <LoginTopbar pageTitle="Shop Products" />

        {/* ── Plan Guard: block access until check is done ── */}
        {!planChecked ? (
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-10 h-10 border-[3px] border-gray-200 border-t-[#3B5998] rounded-full animate-spin" />
              <span className="text-sm font-medium">Checking your plan…</span>
            </div>
          </main>
        ) : !planActive ? (
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl border border-amber-200 shadow-lg p-8 max-w-md w-full text-center flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-3xl">🔒</div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Plan Required</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  You need an active plan to purchase products from the shop.
                  Activate a plan first to unlock shopping and start earning commissions.
                </p>
              </div>
              <button
                onClick={() => router.push("/plan")}
                className="w-full bg-[#3B5998] hover:bg-[#2d4578] text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-md"
              >
                View & Activate a Plan →
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Back to Dashboard
              </button>
            </div>
          </main>
        ) : (
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">

          {/* Page header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Product Catalogue</p>
              <h1 className="text-2xl font-bold text-gray-800">
                Our <span className="text-[#3B5998]">Products</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {!loading && !error && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-500">
                    <strong className="text-gray-800">{products.length}</strong> products available
                  </span>
                </div>
              )}

            </div>
          </div>

          {/* Search + filters */}
          {!error && (
            <div className="px-6 pb-5 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                <input
                  type="search"
                  placeholder="Search by name, category or product no…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl shadow-sm outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/10 transition-all"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all whitespace-nowrap shadow-sm ${
                      activeCategory === cat
                        ? "bg-[#3B5998] text-white border-[#3B5998] shadow-md"
                        : "bg-white text-gray-500 border-gray-200 hover:border-[#3B5998] hover:text-[#3B5998]"
                    }`}
                  >{cat}</button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-gray-400">
                <div className="w-10 h-10 border-[3px] border-gray-200 border-t-[#3B5998] rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading products…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="bg-white border border-red-100 rounded-2xl p-8 text-center max-w-sm shadow-sm">
                  <div className="text-4xl mb-3">⚠️</div>
                  <h3 className="text-sm font-bold text-gray-800 mb-1">Failed to load products</h3>
                  <p className="text-xs text-gray-500 mb-4 font-mono">{error}</p>
                  <button
                    onClick={load}
                    className="bg-[#3B5998] hover:bg-[#2d4578] text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors"
                  >Try again</button>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-gray-400">
                <div className="text-4xl">🔍</div>
                <p className="text-sm font-medium">No products match your search.</p>
                <button
                  onClick={() => { setSearch(""); setActiveCategory("All"); }}
                  className="text-xs text-[#3B5998] underline mt-1"
                >Clear filters</button>
              </div>
            ) : (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                {visible.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    index={i}
                    inCart={cart.find((c) => c.id === p.id)?.quantity ?? 0}
                    onAdd={addToCart}
                    onUpdate={updateCart}
                    onView={(prod, accent) => setViewProduct({ product: prod, accent })}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
        )} {/* end planActive ternary */}

        {/* Floating Cart Bar — shown regardless of plan status when items are in cart */}
        {cartCount > 0 && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150]"
            style={{ animation: "floatUp 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
          >
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-4 bg-[#3B5998] hover:bg-[#2d4578] text-white px-6 py-3.5 rounded-2xl shadow-2xl transition-colors"
              style={{ minWidth: "260px" }}
            >
              <span className="text-xl">🛒</span>
              <div className="flex flex-col items-start flex-1">
                <span className="text-xs font-semibold opacity-80">
                  {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
                </span>
                <span className="text-base font-bold">
                  ₹{cart.reduce((s, i) => s + i.dp * i.quantity, 0).toLocaleString("en-IN")}
                </span>
              </div>
              <span className="text-sm font-bold bg-white text-[#3B5998] px-3 py-1.5 rounded-xl">
                View →
              </span>
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes floatUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>

      {cartOpen && (
        <CartDrawer
          items={cart}
          onClose={() => setCartOpen(false)}
          onUpdate={updateCart}
          onCheckout={handleCheckout}
        />
      )}

      {viewProduct && (
        <ProductModal
          product={viewProduct.product}
          accent={viewProduct.accent}
          inCart={cart.find((c) => c.id === viewProduct.product.id)?.quantity ?? 0}
          onAdd={addToCart}
          onUpdate={updateCart}
          onClose={() => setViewProduct(null)}
          onViewCart={() => { setViewProduct(null); setCartOpen(true); }}
        />
      )}
    </div>
  );
}
