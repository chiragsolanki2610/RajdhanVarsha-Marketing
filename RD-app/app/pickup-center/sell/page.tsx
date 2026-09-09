"use client";

import { useEffect, useState } from "react";
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

export default function SellPage() {
  const router = useRouter();
  const [puc, setPuc] = useState<PucInfo | null>(null);
  const [checking, setChecking] = useState(true);

  // Customer lookup
  const [userIdInput, setUserIdInput] = useState("");
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [customerError, setCustomerError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

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
    if (!userIdInput.trim()) {
      setCustomerError("Please enter a User ID");
      return;
    }

    setLookingUp(true);
    try {
      const res = await fetch(`${API_BASE}/api/Auth/${userIdInput.trim()}`, {
        headers: {
          Authorization: `Bearer ${puc?.token}`,
        },
      });

      if (!res.ok) {
        setCustomerError("No user found with this ID");
        return;
      }

      const data = await res.json();
      setCustomer({
        userId: userIdInput.trim(),
        name: data.name || data.Name || "Unknown",
        phone: data.phone || data.mobileNumber || data.Phone || "-",
        role: data.role || data.Role || "User",
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

  const filteredProducts = products.filter((p) =>
    (p.productName || "").toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleCheckout = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!customer) {
      setErrorMsg("Please verify a user before checkout.");
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
        `Sale completed successfully for ${customerName} (₹${finalAmount.toFixed(
          2
        )})`
      );
      setCart([]);
      setCustomer(null);
      setUserIdInput("");
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PickupCenterSidebar />

      <div className="flex-1">
        <PickupCenterTopbar title="Sell" operatorName={puc.fullName} />

        <main className="mx-auto max-w-6xl space-y-6 p-6">
          {/* Alerts */}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle size={16} />
              {errorMsg}
            </div>
          )}

          {/* Step 1: Find Customer */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
              <User size={18} className="text-blue-600" />
              Step 1: Find Customer
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookupUser()}
                placeholder="Enter User ID (e.g. RD0001)"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleLookupUser}
                disabled={lookingUp}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
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

            {customer && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    ID: {customer.userId} &middot; {customer.phone}
                  </p>
                </div>
                <span className="rounded-full bg-green-600 px-3 py-1 text-[11px] font-semibold text-white">
                  Verified
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Products + Cart */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Product list */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <ShoppingCart size={18} className="text-blue-600" />
                Step 2: Add Products
              </h2>

              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              {loadingProducts ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Loading products...
                </div>
              ) : productError ? (
                <p className="py-10 text-center text-sm text-red-500">
                  {productError}
                </p>
              ) : filteredProducts.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  No products found.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((c) => c.id === product.id);
                    const outOfStock = product.quantity === 0;
                    const maxedOut = inCart ? inCart.qty >= product.quantity : false;

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                      >
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {product.productName}
                          </p>
                          <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-gray-500">
                            <span className="font-semibold text-gray-900">
                              ₹{product.dp.toFixed(2)}
                            </span>
                            <span className="text-gray-400 line-through">
                              ₹{product.mrp.toFixed(2)}
                            </span>
                            <span>&middot; {product.bv} BV</span>
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {product.productNo} &middot; Stock: {product.quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={outOfStock || maxedOut}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-gray-900">
                Cart ({totalItems})
              </h2>

              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No items added yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {item.productName}
                        </p>
                        <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-gray-500">
                          <span className="text-gray-400 line-through">
                            ₹{item.mrp.toFixed(2)}
                          </span>
                          <span>
                            ₹{item.dp.toFixed(2)} x {item.qty} = ₹
                            {(item.dp * item.qty).toFixed(2)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-4 text-center text-xs font-semibold">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-2 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total BV</span>
                  <span className="font-semibold">{totalBV} BV</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>Total Amount</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
                  Payment Method
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium ${
                      paymentMethod === "cash"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Banknote size={16} />
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod("upi")}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium ${
                      paymentMethod === "upi"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <CreditCard size={16} />
                    UPI
                  </button>
                  <button
                    onClick={() => setPaymentMethod("wallet")}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium ${
                      paymentMethod === "wallet"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Wallet size={16} />
                    Wallet
                  </button>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={submitting || !customer || cart.length === 0}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Complete Sale
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}