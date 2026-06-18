'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { ShoppingCart, Plus, Minus, Trash2, X, Package, CheckCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  bv: number;
  sp: number;
  image: string;
  category: string;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

const DUMMY_PRODUCTS: Product[] = [
  {
    id: 'p001',
    name: 'Health Booster Kit',
    description: 'Premium wellness supplement pack for daily nutrition and immunity support.',
    price: 900,
    bv: 600,
    sp: 0,
    image: '🌿',
    category: 'Health',
    stock: 50,
  },
  {
    id: 'p002',
    name: 'Skin Glow Combo',
    description: 'Natural skincare combo with herbal extracts for radiant, healthy skin.',
    price: 1200,
    bv: 600,
    sp: 1,
    image: '✨',
    category: 'Skincare',
    stock: 30,
  },
  {
    id: 'p003',
    name: 'Energy Drink Pack',
    description: 'Power-packed energy drink for active lifestyles and daily performance.',
    price: 750,
    bv: 600,
    sp: 0,
    image: '⚡',
    category: 'Nutrition',
    stock: 100,
  },
  {
    id: 'p004',
    name: 'Detox Tea Bundle',
    description: '30-day detox tea program with natural herbs for body cleansing.',
    price: 650,
    bv: 600,
    sp: 0,
    image: '🍵',
    category: 'Health',
    stock: 75,
  },
  {
    id: 'p005',
    name: 'Pro Membership Kit',
    description: 'Complete activation kit with 1 Share Point to unlock binary earnings.',
    price: 3000,
    bv: 600,
    sp: 1,
    image: '🏆',
    category: 'Activation',
    stock: 20,
  },
  {
    id: 'p006',
    name: 'Leader Growth Pack',
    description: 'Premium leader kit with 2 Share Points for maximum binary placement.',
    price: 6000,
    bv: 1200,
    sp: 2,
    image: '👑',
    category: 'Activation',
    stock: 10,
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(DUMMY_PRODUCTS.map((p) => p.category)))];

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function DreamPlanShopPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userData, setUserData] = useState<{ name: string; memberId: string } | null>(null);

  useEffect(() => {
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        const p = JSON.parse(profile);
        setUserData({ name: p.name || 'Member', memberId: p.memberId || p.userId || 'RD0001' });
      }
    } catch {}
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
          .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalBV = cart.reduce((s, i) => s + i.bv * i.quantity, 0);

  const filtered = DUMMY_PRODUCTS.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handlePayment = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    const loaded = await loadRazorpay();
    if (!loaded) {
      alert('Failed to load payment gateway. Please check your internet connection.');
      setIsProcessing(false);
      return;
    }
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXXXXXXXX',
      amount: cartTotal * 100,
      currency: 'INR',
      name: 'Raj Dhanvarsha Marketing',
      description: `Dream Plan Activation — ${totalBV} B.V`,
      prefill: { name: userData?.name || '', contact: '', email: '' },
      theme: { color: '#3B5998' },
      handler: (response: any) => {
        console.log('Payment successful:', response);
        localStorage.removeItem('pendingActivationPlan');
        setCart([]);
        setCartOpen(false);
        setPaymentSuccess(true);
        setIsProcessing(false);
      },
      modal: { ondismiss: () => setIsProcessing(false) },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (paymentSuccess) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">Payment Successful!</h1>
            <p className="text-slate-500 text-sm mb-6">
              Your Dream Plan has been activated. Your B.V has been credited to your account.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { window.location.href = '/dashboard'; }}
                className="px-6 py-2.5 bg-[#3B5998] text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => setPaymentSuccess(false)}
                className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
              >
                Shop More
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">

        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-base font-black uppercase text-slate-800 tracking-tight">
              Dream Plan — Shop Products
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Purchase products to activate your 600 B.V milestone
            </p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-[#3B5998] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow"
          >
            <ShoppingCart size={15} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="p-6">

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400"
            />
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#3B5998] text-white shadow'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* BV Progress */}
          {totalBV > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Cart B.V Progress</span>
                <span className="text-xs font-black text-blue-800">{totalBV} / 600 B.V</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((totalBV / 600) * 100, 100)}%` }}
                />
              </div>
              {totalBV >= 600 && (
                <p className="text-[11px] text-green-700 font-bold mt-1.5">
                  ✓ You've reached the 600 B.V activation milestone!
                </p>
              )}
            </div>
          )}

          {/* Product Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((product) => {
                const inCart = cart.find((i) => i.id === product.id);
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="w-full h-28 bg-slate-50 rounded-xl flex items-center justify-center text-5xl mb-4">
                      {product.image}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                      {product.category}
                    </span>
                    <h3 className="font-black text-sm text-slate-800 mb-1">{product.name}</h3>
                    <p className="text-xs text-slate-500 mb-3 flex-1 leading-relaxed">{product.description}</p>
                    <div className="flex gap-2 mb-4">
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        {product.bv} B.V
                      </span>
                      {product.sp > 0 && (
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">
                          {product.sp} S.P
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg ml-auto">
                        Stock: {product.stock}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-slate-800">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(product.id, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-black w-5 text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => updateQty(product.id, 1)}
                            className="w-7 h-7 rounded-lg bg-[#3B5998] hover:bg-blue-700 text-white flex items-center justify-center transition"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="flex items-center gap-1.5 bg-[#3B5998] hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95"
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-black text-slate-800 uppercase tracking-tight">Your Cart ({cartCount})</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingCart size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl shrink-0 border border-slate-200">
                      {item.image}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-blue-600 font-bold">{item.bv} B.V</p>
                      <p className="text-xs font-black text-slate-700 mt-1">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 size={13} />
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 rounded-md bg-[#3B5998] text-white flex items-center justify-center hover:bg-blue-700 transition"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-slate-200 px-5 py-4 space-y-3">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total B.V</span>
                  <span className="font-black text-blue-700">{totalBV} B.V</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-slate-700">Total Amount</span>
                  <span className="font-black text-slate-800">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                {totalBV < 600 && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">
                    ⚠️ Add more products to reach 600 B.V activation milestone
                  </p>
                )}
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full py-3 bg-[#3B5998] hover:bg-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                >
                  {isProcessing ? 'Opening Payment...' : `Pay ₹${cartTotal.toLocaleString('en-IN')}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}