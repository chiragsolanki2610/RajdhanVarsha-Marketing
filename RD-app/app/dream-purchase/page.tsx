"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  bv: number;
  image: string;
  category: string;
  inStock: boolean;
}

interface CartItem extends Product {
  qty: number;
}

type PaymentStep = "cart" | "checkout" | "processing" | "success";

// ─── Mock Products ────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "RD Gold Wellness Kit",
    description: "Premium ayurvedic wellness supplement for daily health support.",
    price: 899,
    bv: 100,
    image: "🌿",
    category: "Wellness",
    inStock: true,
  },
  {
    id: 2,
    name: "RD Immunity Booster Pack",
    description: "Herbal immunity booster enriched with tulsi, giloy & ashwagandha.",
    price: 799,
    bv: 90,
    image: "💊",
    category: "Health",
    inStock: true,
  },
  {
    id: 3,
    name: "RD Skin Glow Serum",
    description: "Advanced skin brightening serum with natural extracts.",
    price: 999,
    bv: 110,
    image: "✨",
    category: "Skincare",
    inStock: true,
  },
  {
    id: 4,
    name: "RD Energy Drink Mix",
    description: "Natural energy blend with vitamins and electrolytes.",
    price: 699,
    bv: 80,
    image: "⚡",
    category: "Nutrition",
    inStock: true,
  },
  {
    id: 5,
    name: "RD Hair Care Bundle",
    description: "Complete hair care bundle with oil, shampoo & conditioner.",
    price: 1199,
    bv: 130,
    image: "💆",
    category: "Hair Care",
    inStock: true,
  },
  {
    id: 6,
    name: "RD Detox Tea Pack",
    description: "30-day detox green tea pack for cleansing and weight management.",
    price: 599,
    bv: 70,
    image: "🍵",
    category: "Wellness",
    inStock: false,
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];
const DREAM_PLAN_BV_TARGET = 600;

// ─── Component ────────────────────────────────────────────────────────────────
export default function DreamPurchasePage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [step, setStep] = useState<PaymentStep>("cart");
  const [showCart, setShowCart] = useState(false);

  // ── cart helpers
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  const updateQty = (id: number, qty: number) => {
    if (qty < 1) return removeFromCart(id);
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const totalBV = cart.reduce((sum, i) => sum + i.bv * i.qty, 0);
  const totalPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalWithGST = Math.round(totalPrice * 1.18);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const bvProgress = Math.min((totalBV / DREAM_PLAN_BV_TARGET) * 100, 100);
  const bvMet = totalBV >= DREAM_PLAN_BV_TARGET;

  // FIX: store orderId in state so it doesn't re-generate on re-render
  const [orderId] = useState(
    () => "RD-" + Date.now().toString().slice(-8)
  );

  const filteredProducts =
    selectedCategory === "All"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === selectedCategory);

  // ── payment handlers
  const handlePayNow = () => {
    setStep("processing");
    setTimeout(() => setStep("success"), 2500);
  };

  const handleReset = () => {
    setCart([]);
    setStep("cart");
    setShowCart(false);
    router.push("/plan");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div style={styles.overlay}>
        <div style={styles.overlayCard}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={styles.overlayTitle}>Payment Successful!</h2>
          <p style={styles.overlaySub}>Your Dream Plan order has been placed.</p>

          <div style={styles.detailRow}>
            <span>Amount Paid</span>
            <strong>₹{totalWithGST.toLocaleString("en-IN")}</strong>
          </div>
          <div style={styles.detailRow}>
            <span>Total B.V. Earned</span>
            <strong style={{ color: "#22c55e" }}>{totalBV} B.V.</strong>
          </div>
          <div style={styles.detailRow}>
            <span>Order ID</span>
            <strong>{orderId}</strong>
          </div>

          <div style={styles.successNote}>
            🎉 Your Dream Plan is now <strong>ACTIVE</strong>. You can now
            refer up to 10 direct joinings.
          </div>

          <button style={styles.primaryBtn} onClick={handleReset}>
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCESSING SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <>
        {/* FIX: keyframes must be in a global <style> tag, not inside JSX conditionally */}
        <style>{`
          @keyframes progressFill {
            from { width: 0% }
            to   { width: 100% }
          }
          .processing-bar {
            height: 100%;
            background: #1e3a8a;
            border-radius: 999px;
            animation: progressFill 2.5s ease forwards;
          }
        `}</style>
        <div style={styles.overlay}>
          <div style={styles.overlayCard}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
            <h2 style={styles.overlayTitle}>Processing Payment...</h2>
            <p style={styles.overlaySub}>
              Please wait, do not close this page.
            </p>
            <div style={styles.progressTrack}>
              <div className="processing-bar" />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECKOUT SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "checkout") {
    return (
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setStep("cart")}>
            ← Back
          </button>
          <div>
            <div style={styles.headerLabel}>DREAM PLAN — CHECKOUT</div>
            <div style={styles.headerSub}>
              Review your order and complete payment
            </div>
          </div>
        </div>

        <div style={styles.checkoutGrid}>
          {/* Order Summary */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Order Summary</h3>
            {cart.map((item) => (
              <div key={item.id} style={styles.checkoutItem}>
                <span style={{ fontSize: 28 }}>{item.image}</span>
                <div style={{ flex: 1 }}>
                  <div style={styles.checkoutItemName}>{item.name}</div>
                  <div style={styles.checkoutItemMeta}>
                    Qty: {item.qty} × ₹{item.price.toLocaleString("en-IN")}
                  </div>
                </div>
                <div style={styles.checkoutItemPrice}>
                  ₹{(item.price * item.qty).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
            <div style={styles.divider} />
            <div style={styles.summaryRow}>
              <span>Subtotal</span>
              <span>₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Shipping</span>
              <span style={{ color: "#22c55e" }}>FREE</span>
            </div>
            <div style={styles.summaryRow}>
              <span>GST (18%)</span>
              <span>
                ₹{Math.round(totalPrice * 0.18).toLocaleString("en-IN")}
              </span>
            </div>
            <div style={styles.divider} />
            <div
              style={{
                ...styles.summaryRow,
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              <span>Total Payable</span>
              <span style={{ color: "#1e3a8a" }}>
                ₹{totalWithGST.toLocaleString("en-IN")}
              </span>
            </div>
            <div style={styles.bvBadge}>
              🏆 You earn <strong>{totalBV} B.V.</strong> from this order
            </div>
          </div>

          {/* Payment */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Payment Method</h3>

            {/* FIX: radio buttons need name="paymentMethod" so they group correctly */}
            <div style={styles.paymentOption}>
              <input
                type="radio"
                name="paymentMethod"
                id="upi"
                defaultChecked
              />
              <label htmlFor="upi" style={{ marginLeft: 10, cursor: "pointer" }}>
                📱 UPI / PhonePe / GPay
              </label>
            </div>
            <div style={styles.paymentOption}>
              <input type="radio" name="paymentMethod" id="card" />
              <label
                htmlFor="card"
                style={{ marginLeft: 10, cursor: "pointer" }}
              >
                💳 Credit / Debit Card
              </label>
            </div>
            <div style={styles.paymentOption}>
              <input type="radio" name="paymentMethod" id="netbanking" />
              <label
                htmlFor="netbanking"
                style={{ marginLeft: 10, cursor: "pointer" }}
              >
                🏦 Net Banking
              </label>
            </div>

            <div style={{ margin: "16px 0" }}>
              <label style={styles.inputLabel}>Enter UPI ID</label>
              <input
                type="text"
                placeholder="yourname@upi"
                style={styles.textInput}
              />
            </div>

            <div style={styles.secureNote}>🔒 Payments secured by Razorpay</div>

            <button style={styles.primaryBtn} onClick={handlePayNow}>
              PAY ₹{totalWithGST.toLocaleString("en-IN")} NOW
            </button>

            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              * This is a demo payment — no real transaction will occur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN SHOP PAGE
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerLabel}>DREAM PLAN — SELECT PRODUCTS</div>
          <div style={styles.headerSub}>
            Add products worth at least {DREAM_PLAN_BV_TARGET} B.V. to activate
            your Dream Plan
          </div>
        </div>
        <button
          style={styles.cartBtn}
          onClick={() => setShowCart((v) => !v)}
        >
          🛒 Cart
          {cartCount > 0 && (
            <span style={styles.cartBadge}>{cartCount}</span>
          )}
        </button>
      </div>

      {/* BV Progress Bar */}
      <div style={styles.bvBar}>
        <div style={styles.bvBarHeader}>
          <span>B.V. Progress</span>
          <span
            style={{
              fontWeight: 700,
              color: bvMet ? "#22c55e" : "#1e3a8a",
            }}
          >
            {totalBV} / {DREAM_PLAN_BV_TARGET} B.V.{" "}
            {bvMet && "✅ Target Met!"}
          </span>
        </div>
        <div style={styles.bvTrack}>
          <div
            style={{
              height: "100%",
              borderRadius: 999,
              transition: "width 0.4s ease",
              width: `${bvProgress}%`,
              background: bvMet ? "#22c55e" : "#1e40af",
            }}
          />
        </div>
        {!bvMet && (
          <div style={styles.bvHint}>
            Add {DREAM_PLAN_BV_TARGET - totalBV} more B.V. to activate Dream
            Plan
          </div>
        )}
      </div>

      <div style={styles.mainLayout}>
        {/* Product Grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category Filter */}
          <div style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                style={{
                  ...styles.catBtn,
                  ...(selectedCategory === cat ? styles.catBtnActive : {}),
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products */}
          <div style={styles.productGrid}>
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.id === product.id);
              return (
                <div key={product.id} style={styles.productCard}>
                  <div style={{ fontSize: 40, marginBottom: 4 }}>
                    {product.image}
                  </div>
                  <div style={styles.productCategory}>{product.category}</div>
                  <div style={styles.productName}>{product.name}</div>
                  <div style={styles.productDesc}>{product.description}</div>
                  <div style={styles.productFooter}>
                    <div>
                      <div style={styles.productPrice}>
                        ₹{product.price.toLocaleString("en-IN")}
                      </div>
                      <div style={styles.productBV}>{product.bv} B.V.</div>
                    </div>
                    {!product.inStock ? (
                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                        Out of Stock
                      </span>
                    ) : inCart ? (
                      <div style={styles.qtyControl}>
                        <button
                          style={styles.qtyBtn}
                          onClick={() =>
                            updateQty(product.id, inCart.qty - 1)
                          }
                        >
                          −
                        </button>
                        <span style={styles.qtyNum}>{inCart.qty}</span>
                        <button
                          style={styles.qtyBtn}
                          onClick={() =>
                            updateQty(product.id, inCart.qty + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        style={styles.addBtn}
                        onClick={() => addToCart(product)}
                      >
                        Add +
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart Panel */}
        {showCart && (
          <div style={styles.cartPanel}>
            <h3 style={styles.sectionTitle}>🛒 Your Cart</h3>
            {cart.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>
                No items added yet.
              </p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} style={styles.cartItem}>
                    <span style={{ fontSize: 22 }}>{item.image}</span>
                    <div style={{ flex: 1, marginLeft: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {item.qty} × ₹{item.price.toLocaleString("en-IN")} = ₹
                        {(item.qty * item.price).toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize: 11, color: "#1e40af" }}>
                        {item.bv * item.qty} B.V.
                      </div>
                    </div>
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeFromCart(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div style={styles.divider} />
                <div style={styles.cartTotalRow}>
                  <span>Total</span>
                  <span style={{ fontWeight: 700 }}>
                    ₹{totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <div
                  style={{
                    ...styles.cartTotalRow,
                    color: "#1e40af",
                    fontSize: 13,
                  }}
                >
                  <span>B.V.</span>
                  <span style={{ fontWeight: 700 }}>{totalBV} B.V.</span>
                </div>
                <button
                  style={{
                    ...styles.primaryBtn,
                    marginTop: 12,
                    opacity: bvMet ? 1 : 0.5,
                    cursor: bvMet ? "pointer" : "not-allowed",
                  }}
                  disabled={!bvMet}
                  onClick={() => {
                    if (bvMet) {
                      setShowCart(false);
                      setStep("checkout");
                    }
                  }}
                >
                  {bvMet
                    ? "Proceed to Checkout →"
                    : `Need ${DREAM_PLAN_BV_TARGET - totalBV} more B.V.`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky Checkout Bar — shown when cart panel is hidden */}
      {cartCount > 0 && !showCart && (
        <div style={styles.stickyBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{ fontWeight: 600 }}>{cartCount} item(s)</span>
            <span style={{ margin: "0 12px", color: "#93c5fd" }}>|</span>
            <span>₹{totalPrice.toLocaleString("en-IN")}</span>
            <span style={{ margin: "0 12px", color: "#93c5fd" }}>|</span>
            <span style={{ color: bvMet ? "#86efac" : "#fbbf24" }}>
              {totalBV} B.V.
            </span>
          </div>
          <button
            style={{
              ...styles.stickyBtn,
              opacity: bvMet ? 1 : 0.6,
              cursor: bvMet ? "pointer" : "not-allowed",
            }}
            disabled={!bvMet}
            onClick={() => {
              if (bvMet) setStep("checkout");
            }}
          >
            {bvMet
              ? "Checkout →"
              : `Need ${DREAM_PLAN_BV_TARGET - totalBV} more B.V.`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Segoe UI', sans-serif",
    paddingBottom: 80,
  },

  // ── Header
  header: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#6b7280",
    marginBottom: 4,
  },
  headerSub: { fontSize: 14, color: "#374151" },
  backBtn: {
    background: "none",
    border: "1px solid #d1d5db",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    color: "#374151",
    marginRight: 16,
    whiteSpace: "nowrap",
  },
  cartBtn: {
    background: "#1e3a8a",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cartBadge: {
    background: "#ef4444",
    color: "#fff",
    borderRadius: "50%",
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
  },

  // ── BV Bar
  bvBar: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    padding: "14px 24px",
  },
  bvBarHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    marginBottom: 8,
    color: "#374151",
  },
  bvTrack: {
    height: 10,
    background: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
  },
  bvHint: { fontSize: 12, color: "#9ca3af", marginTop: 6 },

  // ── Layout
  mainLayout: {
    display: "flex",
    gap: 24,
    padding: 24,
    alignItems: "flex-start",
  },

  // ── Category Filter
  categoryRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  catBtn: {
    padding: "6px 14px",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    color: "#374151",
  },
  catBtnActive: {
    background: "#1e3a8a",
    color: "#fff",
    border: "1px solid #1e3a8a",
  },

  // ── Product Grid
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
  },
  productCard: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  productCategory: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  productName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.3,
  },
  productDesc: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.5,
    flex: 1,
  },
  productFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  productPrice: { fontWeight: 700, color: "#111827", fontSize: 16 },
  productBV: { fontSize: 11, color: "#1e40af", fontWeight: 600 },
  addBtn: {
    background: "#1e3a8a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  qtyControl: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f1f5f9",
    borderRadius: 8,
    padding: "4px 8px",
  },
  qtyBtn: {
    background: "#1e3a8a",
    color: "#fff",
    border: "none",
    width: 24,
    height: 24,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNum: {
    fontWeight: 700,
    fontSize: 14,
    minWidth: 20,
    textAlign: "center",
  },

  // ── Cart Panel
  cartPanel: {
    width: 300,
    flexShrink: 0,
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 20,
    position: "sticky",
    top: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  cartItem: {
    display: "flex",
    alignItems: "flex-start",
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: 14,
    padding: 4,
  },
  cartTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },

  // ── Sticky Bar
  stickyBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#1e3a8a",
    color: "#fff",
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
    boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
  },
  stickyBtn: {
    background: "#fff",
    color: "#1e3a8a",
    border: "none",
    padding: "10px 24px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },

  // ── Shared Card / Checkout
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #f3f4f6",
  },
  checkoutGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    padding: 24,
    maxWidth: 900,
    margin: "0 auto",
  },
  checkoutItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #f9fafb",
  },
  checkoutItemName: { fontSize: 14, fontWeight: 600, color: "#111827" },
  checkoutItemMeta: { fontSize: 12, color: "#6b7280" },
  checkoutItemPrice: { fontWeight: 700, color: "#111827", fontSize: 14 },
  divider: { borderTop: "1px solid #e5e7eb", margin: "12px 0" },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  bvBadge: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#1e40af",
    marginTop: 12,
  },
  paymentOption: {
    display: "flex",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
  },
  inputLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  textInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  secureNote: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    margin: "12px 0",
  },

  // ── Shared primary button
  primaryBtn: {
    width: "100%",
    background: "#1e3a8a",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },

  // ── Overlay (success / processing)
  overlay: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  overlayCard: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: 40,
    maxWidth: 420,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
    marginBottom: 8,
  },
  overlaySub: { color: "#6b7280", fontSize: 14, marginBottom: 24 },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#374151",
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  successNote: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    padding: 14,
    fontSize: 13,
    color: "#166534",
    margin: "20px 0",
    textAlign: "left",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    background: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
    margin: "24px 0",
  },
};