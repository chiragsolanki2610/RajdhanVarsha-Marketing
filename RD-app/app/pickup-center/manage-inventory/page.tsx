"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
  Loader2,
  CheckCircle2,
  XCircle,
  Boxes,
  ClipboardList,
  CreditCard,
  ArrowLeft,
  Package,
  AlertTriangle,
  QrCode,
  Copy,
  UploadCloud,
  Check,
} from "lucide-react";
import PickupCenterSidebar from "@/components/pickup_centersidebar";
import PickupCenterTopbar from "@/components/pickup_centertopbar";

const API_BASE = "https://rd-api-j7zj.onrender.com";

// Minimum cart value (₹) required before a pickup center can proceed to payment
const MIN_ORDER_VALUE = 15000;

// Static company UPI details for Scan & Pay (replace with real values / fetch from API)
const COMPANY_UPI_ID = "QR917404526380-0195@UNIONBANKOFINDIA";
const COMPANY_UPI_NAME = "Raj Dhanvarsha Marketing";

interface PucInfo {
  pucId: string;
  username: string;
  fullName: string;
  centerName: string;
  token: string;
}

interface Product {
  id: number;
  productNo: string;
  productName: string;
  category: string;
  mrp: number;
  dp: number;
  bv: number;
  imageUrl: string | null;
  isActive: boolean;
}

interface PucStockItem {
  productId: number;
  productNo: string;
  productName: string;
  imageUrl: string | null;
  stockAtCenter: number;
}

interface OrderCartItem extends Product {
  orderQty: number;
}

type Step = "browse" | "review" | "payment" | "success";

function mapProduct(p: any): Product {
  return {
    id: p.id ?? p.Id,
    productNo: p.productNo ?? p.ProductNo ?? "",
    productName: p.productName ?? p.ProductName ?? "Unnamed Product",
    category: p.category ?? p.Category ?? "",
    mrp: Number(p.mrp ?? p.Mrp ?? 0),
    dp: Number(p.dp ?? p.Dp ?? 0),
    bv: Number(p.bv ?? p.Bv ?? 0),
    imageUrl: p.imageUrl ?? p.ImageUrl ?? null,
    isActive: p.isActive ?? p.IsActive ?? true,
  };
}

// Maps the response from GET /api/PickupCenter/inventory
// (server shape: ProductId, ProductNo, ProductName, ImageUrl, Quantity)
function mapPucStock(s: any): PucStockItem {
  return {
    productId: s.productId ?? s.ProductId,
    productNo: s.productNo ?? s.ProductNo ?? "",
    productName: s.productName ?? s.ProductName ?? "Unnamed Product",
    imageUrl: s.imageUrl ?? s.ImageUrl ?? null,
    stockAtCenter: Number(
      s.quantity ?? s.Quantity ?? s.stockAtCenter ?? s.StockAtCenter ?? 0
    ),
  };
}

/** Small 3-stage progress tracker used across review / payment / success steps */
function OrderStepper({ step }: { step: Step }) {
  const stages: { key: Step; label: string }[] = [
    { key: "review", label: "Review Order" },
    { key: "payment", label: "Make Payment" },
    { key: "success", label: "Confirmation" },
  ];
  const order: Step[] = ["review", "payment", "success"];
  const currentIdx = order.indexOf(step);

  return (
    <div className="mb-6 flex items-center justify-center">
      {stages.map((s, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isDone ? <Check size={16} /> : idx + 1}
              </div>
              <span
                className={`mt-1 text-[11px] font-medium ${
                  isDone
                    ? "text-green-600"
                    : isCurrent
                    ? "text-blue-700"
                    : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div
                className={`mx-3 mb-4 h-0.5 w-16 sm:w-24 ${
                  isDone ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ManageInventoryPage() {
  const router = useRouter();
  const [puc, setPuc] = useState<PucInfo | null>(null);
  const [checking, setChecking] = useState(true);

  const [activeTab, setActiveTab] = useState<"stock" | "buy">("stock");
  const [step, setStep] = useState<Step>("browse");

  // Center stock
  const [pucStock, setPucStock] = useState<PucStockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  // Company products (to buy)
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Order cart
  const [orderCart, setOrderCart] = useState<OrderCartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastOrderId, setLastOrderId] = useState<string>("");

  // Payment step fields
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");
  const [utrNumber, setUtrNumber] = useState("");
  const [copied, setCopied] = useState(false);

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
    fetchPucStock();
    fetchProducts();
  }, [puc]);

  // GET /api/PickupCenter/inventory
  // NOTE: the PUC is identified server-side from the JWT (CurrentPucId) —
  // do NOT put the pucId in the path here.
  const fetchPucStock = async () => {
    setLoadingStock(true);
    setStockError("");
    try {
      const res = await fetch(`${API_BASE}/api/PickupCenter/inventory`, {
        headers: { Authorization: `Bearer ${puc?.token}` },
      });

      if (!res.ok) {
        setStockError("Failed to load your inventory.");
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.items || data.data || [];
      setPucStock(list.map(mapPucStock));
    } catch (err) {
      console.warn("Failed to load PUC inventory", err);
      setStockError("Failed to load your inventory.");
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductError("");
    try {
      const res = await fetch(`${API_BASE}/api/Products`, {
        headers: { Authorization: `Bearer ${puc?.token}` },
      });

      if (!res.ok) {
        setProductError("Failed to load products.");
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.products || data.data || [];
      setProducts(list.map(mapProduct).filter((p: Product) => p.isActive));
    } catch (err) {
      console.warn("Failed to load products", err);
      setProductError("Failed to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddToOrder = (product: Product) => {
    setOrderCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, orderQty: item.orderQty + 1 }
            : item
        );
      }
      return [...prev, { ...product, orderQty: 1 }];
    });
  };

  const handleQtyChange = (id: number, delta: number) => {
    setOrderCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = item.orderQty + delta;
          if (newQty <= 0) return null;
          return { ...item, orderQty: newQty };
        })
        .filter(Boolean) as OrderCartItem[]
    );
  };

  const handleRemoveFromOrder = (id: number) => {
    setOrderCart((prev) => prev.filter((item) => item.id !== id));
  };

  const getQtyInCart = (id: number) =>
    orderCart.find((item) => item.id === id)?.orderQty ?? 0;

  const totalOrderQty = orderCart.reduce((sum, i) => sum + i.orderQty, 0);
  const totalOrderCost = orderCart.reduce(
    (sum, i) => sum + i.dp * i.orderQty,
    0
  );
  const totalOrderBV = orderCart.reduce(
    (sum, i) => sum + i.bv * i.orderQty,
    0
  );

  const amountRemainingForMin = Math.max(0, MIN_ORDER_VALUE - totalOrderCost);
  const meetsMinimum = totalOrderCost >= MIN_ORDER_VALUE;
  const minProgressPct = Math.min(
    100,
    (totalOrderCost / MIN_ORDER_VALUE) * 100
  );

  const filteredProducts = products.filter((p) =>
    (p.productName || "").toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredStock = pucStock.filter((s) =>
    (s.productName || "").toLowerCase().includes(stockSearch.toLowerCase())
  );

  const handleGoToReview = () => {
    setErrorMsg("");
    if (orderCart.length === 0) {
      setErrorMsg("Add at least one product before proceeding to payment.");
      return;
    }
    if (!meetsMinimum) {
      setErrorMsg(
        `Minimum order value is ₹${MIN_ORDER_VALUE.toLocaleString()}. Add ₹${amountRemainingForMin.toFixed(
          2
        )} more to unlock payment.`
      );
      return;
    }
    setStep("review");
  };

  const handleGoToPayment = () => {
    setStep("payment");
  };

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(COMPANY_UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available, ignore
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(
    COMPANY_UPI_ID
  )}&pn=${encodeURIComponent(
    COMPANY_UPI_NAME
  )}&am=${totalOrderCost.toFixed(2)}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiIntentUrl
  )}`;

  // POST /api/PickupCenter/orders
  // Backend binds this to [FromForm] SubmitPickupCenterOrderFormDto:
  //   Utr (string), Screenshot (IFormFile), Items (JSON string), TotalAmount (string)
  // Items JSON must deserialize into List<PickupCenterOrderItemSubmissionDto>:
  //   { ProductId: number, Quantity: number }  — nothing else is read server-side.
  // The PUC itself, totals, BV and status are all derived/computed server-side —
  // do not send pucId / totalQuantity / totalBV / status, the API ignores them.
  const handleSubmitPayment = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!meetsMinimum) {
      setErrorMsg(
        `Minimum order value is ₹${MIN_ORDER_VALUE.toLocaleString()}.`
      );
      return;
    }
    if (!utrNumber.trim()) {
      setErrorMsg("Please enter the UPI transaction / UTR number.");
      return;
    }
    if (!screenshotFile) {
      setErrorMsg("Please upload the payment screenshot.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("Utr", utrNumber.trim());
      formData.append("TotalAmount", String(totalOrderCost));
      formData.append(
        "Items",
        JSON.stringify(
          orderCart.map((item) => ({
            productId: item.id,
            quantity: item.orderQty,
          }))
        )
      );
      formData.append("Screenshot", screenshotFile);

      const res = await fetch(`${API_BASE}/api/PickupCenter/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${puc?.token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to submit purchase request");
      }

      const data = await res.json().catch(() => null);
      setLastOrderId(data?.id ?? data?.orderId ?? "");
      setSuccessMsg(
        `Your payment is under review. You'll be notified once it's verified by our team.`
      );
      setOrderCart([]);
      setScreenshotFile(null);
      setScreenshotPreview("");
      setUtrNumber("");
      setStep("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNewOrder = () => {
    setStep("browse");
    setSuccessMsg("");
    setErrorMsg("");
    fetchPucStock();
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
        <PickupCenterTopbar title="Manage Inventory" operatorName={puc.fullName} />

        <main className="mx-auto max-w-6xl space-y-6 p-6">
          {/* Tabs */}
          <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
            <button
              onClick={() => {
                setActiveTab("stock");
                setStep("browse");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "stock"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Boxes size={16} />
              My Stock
            </button>
            <button
              onClick={() => {
                setActiveTab("buy");
                setStep("browse");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "buy"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <PackagePlus size={16} />
              Buy from Company
            </button>
          </div>

          {/* ── Tab: My Stock ── */}
          {activeTab === "stock" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <Boxes size={18} className="text-blue-600" />
                Current Stock at Your Center
              </h2>

              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search your stock..."
                className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              {loadingStock ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Loading your inventory...
                </div>
              ) : stockError ? (
                <p className="py-10 text-center text-sm text-red-500">
                  {stockError}
                </p>
              ) : filteredStock.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  No stock recorded yet. Buy products from the company to get
                  started.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Product No</th>
                        <th className="px-4 py-3 text-right">
                          Available Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStock.map((item) => (
                        <tr key={item.productId}>
                          <td className="flex items-center gap-3 px-4 py-3">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-9 w-9 rounded-lg object-cover"
                              />
                            )}
                            <span className="font-medium text-gray-900">
                              {item.productName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {item.productNo}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                item.stockAtCenter === 0
                                  ? "bg-red-100 text-red-700"
                                  : item.stockAtCenter < 10
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {item.stockAtCenter} units
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Buy from Company ── */}
          {activeTab === "buy" && (
            <>
              {/* Alerts */}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <XCircle size={16} />
                  {errorMsg}
                </div>
              )}

              {/* STEP 1: Browse & build cart — grid catalog */}
              {step === "browse" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                        <PackagePlus size={18} className="text-blue-600" />
                        Company Product Catalogue
                      </h2>
                      {!loadingProducts && !productError && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {filteredProducts.length} products available
                        </span>
                      )}
                    </div>

                    <div className="relative mb-5">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search by name, category or product no..."
                        className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

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
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredProducts.map((product) => {
                          const qtyInCart = getQtyInCart(product.id);
                          return (
                            <div
                              key={product.id}
                              className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 transition-shadow hover:shadow-md"
                            >
                              {/* Category badge + image */}
                              <div className="relative h-32 w-full bg-gray-50">
                                {product.category && (
                                  <span className="absolute left-2 top-2 z-10 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 shadow-sm">
                                    {product.category}
                                  </span>
                                )}
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.productName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Package size={28} className="text-gray-300" />
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex flex-1 flex-col p-3">
                                <p className="text-[10px] uppercase text-gray-400">
                                  {product.productNo}
                                </p>
                                <p className="truncate text-sm font-bold text-gray-900">
                                  {product.productName}
                                </p>
                                <p className="mb-2 truncate text-xs text-gray-500">
                                  {product.category}
                                </p>

                                <div className="mt-auto flex items-end justify-between">
                                  <div>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-sm font-bold text-gray-900">
                                        ₹{product.dp.toFixed(0)}
                                      </span>
                                      {product.mrp > product.dp && (
                                        <span className="text-xs text-gray-400 line-through">
                                          ₹{product.mrp.toFixed(0)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                      BV {product.bv}
                                    </span>
                                  </div>

                                  {qtyInCart === 0 ? (
                                    <button
                                      onClick={() => handleAddToOrder(product)}
                                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                    >
                                      Add to cart
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2 rounded-lg bg-blue-600 px-1.5 py-1">
                                      <button
                                        onClick={() =>
                                          handleQtyChange(product.id, -1)
                                        }
                                        className="flex h-5 w-5 items-center justify-center rounded text-white hover:bg-blue-700"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="w-4 text-center text-xs font-bold text-white">
                                        {qtyInCart}
                                      </span>
                                      <button
                                        onClick={() => handleAddToOrder(product)}
                                        className="flex h-5 w-5 items-center justify-center rounded text-white hover:bg-blue-700"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Cart */}
                  <div className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                      <ClipboardList size={18} className="text-blue-600" />
                      Purchase Cart ({totalOrderQty})
                    </h2>

                    {orderCart.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-400">
                        No products added yet.
                      </p>
                    ) : (
                      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                        {orderCart.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-xl border border-gray-200 p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {item.productName}
                              </p>
                              <p className="text-xs text-gray-500">
                                ₹{item.dp.toFixed(2)} x {item.orderQty} = ₹
                                {(item.dp * item.orderQty).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleQtyChange(item.id, -1)}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-4 text-center text-xs font-semibold">
                                {item.orderQty}
                              </span>
                              <button
                                onClick={() => handleQtyChange(item.id, 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                              >
                                <Plus size={12} />
                              </button>
                              <button
                                onClick={() => handleRemoveFromOrder(item.id)}
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
                        <span className="font-semibold">{totalOrderBV} BV</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-gray-900">
                        <span>Total Cost</span>
                        <span>₹{totalOrderCost.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Minimum order progress */}
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-600">
                          Min. order: ₹{MIN_ORDER_VALUE.toLocaleString()}
                        </span>
                        <span
                          className={`font-semibold ${
                            meetsMinimum ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {meetsMinimum
                            ? "Unlocked"
                            : `${minProgressPct.toFixed(0)}%`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            meetsMinimum ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${minProgressPct}%` }}
                        />
                      </div>
                      {!meetsMinimum && (
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-700">
                          <AlertTriangle size={12} />
                          Add ₹{amountRemainingForMin.toFixed(2)} more to
                          unlock payment.
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleGoToReview}
                      disabled={orderCart.length === 0 || !meetsMinimum}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <CreditCard size={16} />
                      Proceed to Payment
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Review Order */}
              {step === "review" && (
                <div className="mx-auto max-w-xl">
                  <button
                    onClick={() => setStep("browse")}
                    className="mb-4 flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft size={14} />
                    Back to Shop
                  </button>

                  <OrderStepper step="review" />

                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                        <ClipboardList size={18} className="text-blue-600" />
                        Order Summary
                      </h2>
                      <span className="text-xs font-medium text-gray-400">
                        {orderCart.length} item{orderCart.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="space-y-3 border-b border-gray-100 pb-4">
                      {orderCart.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package size={16} className="text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] uppercase text-gray-400">
                              {item.productNo}
                            </p>
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {item.productName}
                            </p>
                            <p className="text-xs text-gray-500">
                              ₹{item.dp.toFixed(2)} &middot; BV {item.bv}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              x{item.orderQty}
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              ₹{(item.dp * item.orderQty).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Total BV</span>
                        <span className="font-semibold text-green-600">
                          {totalOrderBV} BV
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-gray-900">
                        <span>Total Amount</span>
                        <span>₹{totalOrderCost.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleGoToPayment}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      Proceed to Pay ₹{totalOrderCost.toFixed(2)}
                      <ArrowLeft size={16} className="rotate-180" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Scan & Pay */}
              {step === "payment" && (
                <div className="mx-auto max-w-xl">
                  <button
                    onClick={() => setStep("review")}
                    className="mb-4 flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft size={14} />
                    Back to Shop
                  </button>

                  <OrderStepper step="payment" />

                  {/* Scan & Pay card */}
                  <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
                      <QrCode size={18} className="text-blue-600" />
                      Scan & Pay
                    </h2>
                    <p className="mb-4 text-xs text-gray-500">
                      Use any UPI app — GPay, PhonePe, Paytm, BHIM
                    </p>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="flex flex-col items-center">
                        <img
                          src={qrImageUrl}
                          alt="UPI QR code"
                          className="h-44 w-44 rounded-xl border border-gray-200 p-2"
                        />
                        <p className="mt-2 text-[11px] text-gray-400">
                          Scan with any UPI app
                        </p>
                      </div>

                      <div className="flex flex-col justify-center gap-3">
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">
                            UPI ID
                          </p>
                          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
                            <span className="truncate text-xs font-medium text-gray-800">
                              {COMPANY_UPI_ID}
                            </span>
                            <button
                              onClick={handleCopyUpi}
                              className="flex shrink-0 items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200"
                            >
                              <Copy size={12} />
                              {copied ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">
                            Amount to Pay
                          </p>
                          <div className="rounded-lg border border-gray-200 px-3 py-2 text-base font-bold text-blue-700">
                            ₹{totalOrderCost.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                          Pay the exact amount shown. After payment, upload
                          the screenshot and enter the UTR number below.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confirm payment card */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-1 text-base font-bold text-gray-900">
                      Confirm Your Payment
                    </h2>
                    <p className="mb-4 text-xs text-gray-500">
                      Upload screenshot and enter transaction ID
                    </p>

                    <p className="mb-1.5 text-[10px] font-semibold uppercase text-gray-400">
                      Payment Screenshot <span className="text-red-500">*</span>
                    </p>
                    <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50/30">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleScreenshotChange}
                      />
                      {screenshotPreview ? (
                        <img
                          src={screenshotPreview}
                          alt="Payment screenshot preview"
                          className="mb-2 h-28 rounded-lg object-contain"
                        />
                      ) : (
                        <UploadCloud size={22} className="mb-2 text-gray-400" />
                      )}
                      <p className="text-xs font-medium text-gray-600">
                        {screenshotFile
                          ? screenshotFile.name
                          : "Click to upload screenshot"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                    </label>

                    <p className="mb-1.5 text-[10px] font-semibold uppercase text-gray-400">
                      UTR / Transaction ID <span className="text-red-500">*</span>
                    </p>
                    <input
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. 425612345678"
                      className="mb-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mb-5 text-[11px] text-gray-400">
                      Find this in your UPI app under transaction details
                      (12-digit number)
                    </p>

                    <button
                      onClick={handleSubmitPayment}
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Submit Payment
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Confirmation */}
              {step === "success" && (
                <div className="mx-auto max-w-xl">
                  <OrderStepper step="success" />

                  <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <CheckCircle2
                      size={40}
                      className="mx-auto mb-3 text-green-600"
                    />
                    <h2 className="mb-1 text-lg font-bold text-gray-900">
                      Payment Submitted!
                    </h2>
                    <p className="mb-6 text-sm text-gray-600">{successMsg}</p>

                    <div className="mb-6 space-y-2 rounded-xl border border-gray-200 p-4 text-left text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order ID</span>
                        <span className="font-semibold text-gray-900">
                          #{lastOrderId || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Amount Paid</span>
                        <span className="font-semibold text-blue-700">
                          ₹{totalOrderCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total BV</span>
                        <span className="font-semibold text-green-600">
                          {totalOrderBV} BV
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          Pending Verification
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center gap-3">
                      <button
                        onClick={handleStartNewOrder}
                        className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Continue Shopping
                      </button>
                      <button
                        onClick={() => router.push("/pickup-center/orders")}
                        className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        View Orders
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}