"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  XCircle,
  CreditCard,
  Wallet,
  Banknote,
  X,
  ChevronUp,
  Package,
  BadgeCheck,
  Pencil,
} from "lucide-react";
import PickupCenterSidebar from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";

const API_BASE = "https://rd-api-j7zj.onrender.com";

interface PucInfo {
  pucId: string;
  username: string;
  fullName: string;
  centerName: string;
  token: string;
}

interface CustomerInfo {
  userId: string;
  name: string;
  phone: string;
  role: string;
  dreamPlanActive: boolean;
}

interface Product {
  id: number;
  productNo: string;
  productName: string;
  category: string;
  description: string;
  mrp: number;
  gst: number;
  dp: number;
  bv: number;
  imageUrl: string | null;
  isActive: boolean;
  quantity: number; // stock available (this PUC's own stock)
}

interface CartItem extends Product {
  qty: number; // quantity being sold
}

type PaymentMethod = "cash" | "upi" | "wallet";

function mapProduct(p: any): Product {
  return {
    id: p.id ?? p.Id,
    productNo: p.productNo ?? p.ProductNo ?? "",
    productName: p.productName ?? p.ProductName ?? "Unnamed Product",
    category: p.category ?? p.Category ?? "",
    description: p.description ?? p.Description ?? "",
    mrp: Number(p.mrp ?? p.Mrp ?? 0),
    gst: Number(p.gst ?? p.Gst ?? 0),
    dp: Number(p.dp ?? p.Dp ?? 0),
    bv: Number(p.bv ?? p.Bv ?? 0),
    imageUrl: p.imageUrl ?? p.ImageUrl ?? null,
    isActive: p.isActive ?? p.IsActive ?? true,
    quantity: 0, // real stock is merged in from PUC inventory, not from here
  };
}

// Maps GET /api/PickupCenter/inventory items (ProductId, Quantity, etc.)
function mapPucStockQty(list: any[]): Record<number, number> {
  const map: Record<number, number> = {};
  for (const s of list) {
    const id = s.productId ?? s.ProductId;
    const qty = Number(s.quantity ?? s.Quantity ?? 0);
    if (id != null) map[id] = qty;
  }
  return map;
}

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Image with a clean fallback (no more broken-image alt text)
function ProductImage({
  src,
  name,
  className = "",
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 text-lg font-bold text-blue-500 ${className}`}
      >
        {name.trim().charAt(0).toUpperCase() || <Package size={18} />}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className={`shrink-0 bg-gray-100 object-cover ${className}`}
    />
  );
}

export default function SellPage() {
  const router = useRouter();
  const [puc, setPuc] = useState<PucInfo | null>(null);
  const [checking, setChecking] = useState(true);

  // Customer lookup
  const [userIdInput, setUserIdInput] = useState("");
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [customerError, setCustomerError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [inactiveUserId, setInactiveUserId] = useState("");

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false); // mobile bottom sheet

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("pucInfo");
    const token = localStorage.getItem("pucToken");

    if (!raw || !token) {
      router.replace("/pickup-center");
      return;
    }

    try {
      setPuc(JSON.parse(raw));
    } catch {
      router.replace("/pickup-center");
      return;
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    if (!puc) return;
    fetchProducts();
  }, [puc]);

  // Lock body scroll while the cart sheet is open
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  // Auto-dismiss the success banner
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 6000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductError("");
    try {
      const [productsRes, stockRes] = await Promise.all([
        fetch(`${API_BASE}/api/Products`, {
          headers: { Authorization: `Bearer ${puc?.token}` },
        }),
        fetch(`${API_BASE}/api/PickupCenter/inventory`, {
          headers: { Authorization: `Bearer ${puc?.token}` },
        }),
      ]);

      if (!productsRes.ok) {
        setProductError("Failed to load products.");
        return;
      }

      const productsData = await productsRes.json();
      const productList = Array.isArray(productsData)
        ? productsData
        : productsData.products || productsData.data || [];
      const mappedProducts = productList
        .map(mapProduct)
        .filter((p: Product) => p.isActive);

      // Stock endpoint is separate — degrade gracefully if it fails
      let stockMap: Record<number, number> = {};
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        const stockList = Array.isArray(stockData)
          ? stockData
          : stockData.items || stockData.data || [];
        stockMap = mapPucStockQty(stockList);
      } else {
        console.warn("Failed to load PUC inventory for stock counts");
      }

      const merged = mappedProducts.map((p: Product) => ({
        ...p,
        quantity: stockMap[p.id] ?? 0,
      }));

      setProducts(merged);
    } catch (err) {
      console.warn("Failed to load products", err);
      setProductError("Failed to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleLookupUser = async () => {
    setCustomerError("");
    setCustomer(null);
    setShowActivateModal(false);
    if (!userIdInput.trim()) {
      setCustomerError("Please enter a User ID");
      return;
    }

    setLookingUp(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/PickupCenter/plan-manager/lookup/${encodeURIComponent(
          userIdInput.trim()
        )}?planType=${encodeURIComponent("Dream Plan")}`,
        {
          headers: {
            Authorization: `Bearer ${puc?.token}`,
          },
        }
      );

      if (!res.ok) {
        setCustomerError("No user found with this ID");
        return;
      }

      const data = await res.json();

      if (!data.alreadyActiveForPlan) {
        setInactiveUserId(data.userId || userIdInput.trim());
        setShowActivateModal(true);
        return;
      }

      setCustomer({
        userId: data.userId || userIdInput.trim(),
        name: data.name || "Unknown",
        phone: data.mobileNo || "-",
        role: "User",
        dreamPlanActive: true,
      });
    } catch (err) {
      setCustomerError("Unable to verify user. Please try again.");
    } finally {
      setLookingUp(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.quantity) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleQuantityChange = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (newQty > item.quantity) return item;
          return { ...item, qty: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Selling price is DP, not MRP — MRP is only shown struck-through for reference.
  const totalAmount = cart.reduce((sum, item) => sum + item.dp * item.qty, 0);
  const totalBV = cart.reduce((sum, item) => sum + item.bv * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["All", ...Array.from(set)];
  }, [products]);

  const filteredProducts = products.filter(
    (p) =>
      (p.productName || "")
        .toLowerCase()
        .includes(productSearch.toLowerCase()) &&
      (activeCategory === "All" || p.category === activeCategory)
  );

  const handleCheckout = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!customer) {
      setErrorMsg("Please verify a user before checkout.");
      setCartOpen(false);
      return;
    }
    if (cart.length === 0) {
      setErrorMsg("Cart is empty. Add at least one product.");
      return;
    }

    setSubmitting(true);
    try {
      // NOTE: pucId is derived server-side from the JWT — don't send it.
      // price/bv/totalAmount/totalBv are recomputed server-side from the DB —
      // the server never trusts numbers sent from the browser.
      const res = await fetch(`${API_BASE}/api/PickupCenter/Sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${puc?.token}`,
        },
        body: JSON.stringify({
          userId: customer.userId,
          paymentMethod,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.qty,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to complete sale");
      }

      const result = await res.json();
      const customerName = result.customerName ?? customer.name;
      const finalAmount = Number(result.totalAmount ?? totalAmount);

      setSuccessMsg(
        `Sale completed for ${customerName} (${inr(finalAmount)})`
      );
      setCart([]);
      setCustomer(null);
      setUserIdInput("");
      setCartOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      fetchProducts(); // refresh stock counts
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking || !puc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  const paymentOptions: {
    value: PaymentMethod;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "cash", label: "Cash", icon: <Banknote size={18} /> },
    { value: "upi", label: "UPI", icon: <CreditCard size={18} /> },
    { value: "wallet", label: "Wallet", icon: <Wallet size={18} /> },
  ];

  // Shared cart contents — used in the mobile sheet and the desktop side panel
  const cartContents = (
    <>
      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
          <ShoppingCart size={28} />
          <p className="text-sm">Your cart is empty</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {cart.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <ProductImage
                src={item.imageUrl}
                name={item.productName}
                className="h-12 w-12 rounded-xl text-base"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {item.productName}
                </p>
                <p className="text-xs text-gray-500">
                  {inr(item.dp)} × {item.qty} ={" "}
                  <span className="font-semibold text-gray-800">
                    {inr(item.dp * item.qty)}
                  </span>
                </p>
                <div className="mt-1.5 inline-flex items-center rounded-full border border-gray-200 bg-gray-50">
                  <button
                    onClick={() => handleQuantityChange(item.id, -1)}
                    aria-label="Decrease quantity"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 active:bg-gray-200"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-gray-900">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.id, 1)}
                    disabled={item.qty >= item.quantity}
                    aria-label="Increase quantity"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 active:bg-gray-200 disabled:opacity-30"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleRemoveFromCart(item.id)}
                aria-label="Remove item"
                className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 active:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Payment method */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Payment Method
        </p>
        <div className="grid grid-cols-3 gap-2">
          {paymentOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPaymentMethod(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-semibold transition ${
                paymentMethod === opt.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-500 active:bg-gray-50"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="mt-4 space-y-1.5 rounded-xl bg-gray-50 p-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Items</span>
          <span className="font-semibold">{totalItems}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total BV</span>
          <span className="font-semibold">{totalBV} BV</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
          <span>Total</span>
          <span>{inr(totalAmount)}</span>
        </div>
      </div>

      {!customer && cart.length > 0 && (
        <p className="mt-3 text-center text-xs font-medium text-amber-600">
          Verify a customer to complete the sale
        </p>
      )}

      <button
        onClick={handleCheckout}
        disabled={submitting || !customer || cart.length === 0}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm active:bg-green-700 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <CheckCircle2 size={16} />
        )}
        Complete Sale · {inr(totalAmount)}
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PickupCenterSidebar />

      <div className="min-w-0 flex-1">
        <PickupCenterTopbar title="Sell" operatorName={puc.fullName} />

        {/* extra bottom padding so content clears the sticky cart bar + bottom nav on mobile */}
        <main className="mx-auto max-w-6xl space-y-4 px-4 pb-44 pt-4 lg:p-6 lg:pb-6">
          {/* Alerts */}
          {successMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1">{successMsg}</span>
              <button onClick={() => setSuccessMsg("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
              <button onClick={() => setErrorMsg("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            {/* LEFT: customer + products */}
            <div className="space-y-4 lg:col-span-2">
              {/* Step 1: Customer */}
              <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    1
                  </span>
                  <h2 className="text-sm font-bold text-gray-900">Customer</h2>
                </div>

                {customer ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                      <User size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-bold text-gray-900">
                        {customer.name}
                        <BadgeCheck
                          size={15}
                          className="shrink-0 text-green-600"
                        />
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {customer.userId} &middot; {customer.phone}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCustomer(null);
                        setUserIdInput("");
                      }}
                      className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm active:bg-gray-100"
                    >
                      <Pencil size={12} />
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <User
                          size={16}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          inputMode="text"
                          autoCapitalize="characters"
                          value={userIdInput}
                          onChange={(e) => setUserIdInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleLookupUser()
                          }
                          placeholder="User ID (e.g. RD0001)"
                          className="w-full rounded-2xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <button
                        onClick={handleLookupUser}
                        disabled={lookingUp}
                        className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white active:bg-blue-700 disabled:opacity-60"
                      >
                        {lookingUp ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Search size={16} />
                        )}
                        Verify
                      </button>
                    </div>
                    {customerError && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {customerError}
                      </p>
                    )}
                  </>
                )}
              </section>

              {/* Step 2: Products */}
              <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-gray-900">Products</h2>
                  <span className="ml-auto text-xs text-gray-400">
                    {filteredProducts.length} items
                  </span>
                </div>

                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {categories.length > 2 && (
                  <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          activeCategory === cat
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 active:bg-gray-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  {loadingProducts ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-24 animate-pulse rounded-2xl bg-gray-100"
                        />
                      ))}
                    </div>
                  ) : productError ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-red-500">{productError}</p>
                      <button
                        onClick={fetchProducts}
                        className="mt-3 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                      >
                        Retry
                      </button>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">
                      No products found.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredProducts.map((product) => {
                        const inCart = cart.find((c) => c.id === product.id);
                        const outOfStock = product.quantity === 0;
                        const maxedOut = inCart
                          ? inCart.qty >= product.quantity
                          : false;
                        const lowStock =
                          !outOfStock && product.quantity <= 3;

                        return (
                          <div
                            key={product.id}
                            className={`rounded-2xl border p-3 transition ${
                              inCart
                                ? "border-blue-300 bg-blue-50/40"
                                : "border-gray-200 bg-white"
                            } ${outOfStock ? "opacity-60" : ""}`}
                          >
                            <div className="flex gap-3">
                              <div className="relative">
                                <ProductImage
                                  src={product.imageUrl}
                                  name={product.productName}
                                  className="h-20 w-20 rounded-xl text-2xl"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
                                  {product.productName}
                                </p>
                                <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                                  <span className="text-base font-bold text-gray-900">
                                    {inr(product.dp)}
                                  </span>
                                  {product.mrp > product.dp && (
                                    <span className="text-xs text-gray-400 line-through">
                                      {inr(product.mrp)}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                                    {product.bv} BV
                                  </span>
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                      outOfStock
                                        ? "bg-red-50 text-red-600"
                                        : lowStock
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {outOfStock
                                      ? "Out of stock"
                                      : `Stock: ${product.quantity}`}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {product.productNo}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action row */}
                            <div className="mt-3">
                              {inCart ? (
                                <div className="flex items-center justify-between rounded-xl bg-white px-1 py-1 ring-1 ring-blue-200">
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(product.id, -1)
                                    }
                                    aria-label="Decrease quantity"
                                    className="flex h-9 w-11 items-center justify-center rounded-lg text-blue-700 active:bg-blue-100"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="text-sm font-bold text-gray-900">
                                    {inCart.qty} in cart
                                  </span>
                                  <button
                                    onClick={() => handleAddToCart(product)}
                                    disabled={maxedOut}
                                    aria-label="Increase quantity"
                                    className="flex h-9 w-11 items-center justify-center rounded-lg text-blue-700 active:bg-blue-100 disabled:opacity-30"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddToCart(product)}
                                  disabled={outOfStock}
                                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white active:bg-blue-700 disabled:bg-gray-300"
                                >
                                  <Plus size={16} />
                                  Add to cart
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* RIGHT (desktop only): sticky cart panel */}
            <aside className="hidden lg:block">
              <div className="sticky top-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
                  <ShoppingCart size={18} className="text-blue-600" />
                  Cart ({totalItems})
                </h2>
                {cartContents}
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* MOBILE: sticky cart bar (sits above the bottom nav) */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 px-3 lg:hidden">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-xl active:bg-gray-800"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <ShoppingCart size={18} />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold">
                {totalItems}
              </span>
            </span>
            <span className="flex-1 text-left">
              <span className="block text-[11px] text-gray-300">
                {totalBV} BV &middot; View cart
              </span>
              <span className="block text-base font-bold leading-tight">
                {inr(totalAmount)}
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              Checkout
              <ChevronUp size={16} />
            </span>
          </button>
        </div>
      )}

      {/* MOBILE: cart bottom sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div className="mx-auto absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-300" />
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <ShoppingCart size={18} className="text-blue-600" />
                Your Cart ({totalItems})
              </h3>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {customer && (
              <div className="mx-5 mb-1 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
                <BadgeCheck size={14} />
                <span className="truncate font-semibold">{customer.name}</span>
                <span className="text-green-600">({customer.userId})</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {cartContents}
            </div>
          </div>
        </div>
      )}

      {/* Activate-plan modal */}
      {showActivateModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:px-4">
          <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <XCircle size={22} />
              </span>
              <h3 className="text-base font-bold text-gray-900">
                Dream Plan Not Active
              </h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              <span className="font-semibold text-gray-900">
                {inactiveUserId}
              </span>{" "}
              does not have an active Dream Plan. Please activate the Dream
              Plan for this user before making a sale.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowActivateModal(false)}
                className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push("/pickup-center/plan-manager")}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white active:bg-blue-700"
              >
                Activate Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
