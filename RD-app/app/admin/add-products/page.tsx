'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  X,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Plus,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import LoginTopbar from '@/components/loginTopbar';

// ─── Admin Guard ──────────────────────────────────────────────────────────────
const ADMIN_MEMBER_IDS = ['RD0001'];

interface FormState {
  productNo: string;
  productName: string;
  category: string;
  description: string;
  mrp: string;
  gst: string;
  dp: string;
  bv: string;
}

const CATEGORIES = [
  'Health & Wellness',
  'Beauty & Skincare',
  'Nutrition',
  'Home & Living',
  'Agriculture',
  'Other',
];

const INITIAL_FORM: FormState = {
  productNo: '',
  productName: '',
  category: '',
  description: '',
  mrp: '',
  gst: '',
  dp: '',
  bv: '',
};

export default function AddProductsPage() {
  const router = useRouter();

  // ─── Auth Check ─────────────────────────────────────────────────────────────
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const profileString = localStorage.getItem('userProfile');
      const profile = profileString ? JSON.parse(profileString) : null;
      const memberId = profile?.memberId || profile?.userId || '';
      const role = profile?.role || '';
      setIsAdmin(role === 'Admin' || ADMIN_MEMBER_IDS.includes(memberId));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size must be under 10 MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    removeImage();
    setErrorMsg('');
    setSuccessMsg('');
  };

  // ─── Form Submission Handling ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validate required fields
    const requiredFields: (keyof FormState)[] = [
      'productNo', 'productName', 'category', 'description',
      'mrp', 'gst', 'dp', 'bv',
    ];
    
    for (const field of requiredFields) {
      if (!form[field].trim()) {
        setErrorMsg(`Please fill in the "${field}" field.`);
        return;
      }
    }
    
    if (!imageFile) {
      setErrorMsg('Please upload a product image.');
      return;
    }

    setIsSubmitting(true);
    try {
      // FIX 1: Explicit target URL configured to your local backend endpoint domain
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:56187';

      const savedToken = localStorage.getItem('token');
      if (!savedToken) {
        setErrorMsg('You are not logged in. Please log in and try again.');
        setIsSubmitting(false);
        return;
      }

      // FIX 2: Constructed FormData safely converting numeric strings to valid numbers
      const formData = new FormData();
      
      // NOTE: Set the key below matching your API exact naming ('file', 'productImage', etc.)
      formData.append('image', imageFile); 
      
      formData.append('productNo', form.productNo);
      formData.append('productName', form.productName);
      formData.append('category', form.category);
      formData.append('description', form.description);
      
      // Ensuring numeric formats map cleanly to typical .NET Decimal backend fields
      formData.append('mrp', parseFloat(form.mrp).toString());
      formData.append('gst', parseFloat(form.gst).toString());
      formData.append('dp', parseFloat(form.dp).toString());
      formData.append('bv', parseFloat(form.bv).toString());

      // FIX 3: Isolated path cleanly prevents URL duplication nesting
      const res = await fetch(`${BASE_URL}/api/Products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${savedToken}`,
          // Content-Type is omitted completely so the browser automatically computes boundary markers
        },
        body: formData,
      });

      if (!res.ok) {
        let errMessage = `Server error: ${res.status}`;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const err = await res.json();
            errMessage = err?.message || err?.title || errMessage;
          } else {
            const text = await res.text();
            if (text) errMessage = text;
          }
        } catch {
          // Fallback parsing failure catches
        }
        throw new Error(errMessage);
      }

      setSuccessMsg(`"${form.productName}" added successfully!`);
      resetForm();

    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading State UI ────────────────────────────────────────────────────────
  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <LoginTopbar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-[#3B5998]" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Access Denied State UI ────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <LoginTopbar />
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Only admins can add products.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-2 px-5 py-2.5 bg-[#3B5998] text-white text-sm font-semibold rounded-xl hover:bg-[#2d4577] transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Interface ───────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f5f6f8]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <LoginTopbar />

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 bg-[#f5f6f8]">
          <div>
            <h1 className="text-[15px] font-bold text-gray-800 leading-tight">Add New Product</h1>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the details below to add a new product to the catalog</p>
          </div>
          <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            ⚑ Admin Only
          </span>
        </div>

        {/* ── Status Feedback Banners ── */}
        {(errorMsg || successMsg) && (
          <div className="px-6 pb-2">
            {errorMsg && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                <X size={14} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <p className="text-xs text-green-700 font-medium">{successMsg}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Main Input Form Workspace ── */}
        <form
          id="add-product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto pb-24 px-6 space-y-4"
        >
          {/* Row 1: Media Studio (Left) + General Information Details (Right) */}
          <div className="flex gap-4 items-stretch">

            {/* Product Image Component Wrapper */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col w-[300px] shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Product Image <span className="text-red-500">*</span>
              </p>

              {imagePreview ? (
                <div className="relative flex-1 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 min-h-[260px]">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition shadow"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 min-h-[260px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#3B5998] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                    <Upload size={18} className="text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Drop image or{' '}
                    <span className="text-[#3B5998] font-semibold underline underline-offset-2">browse</span>
                  </p>
                  <p className="text-[10px] text-gray-300 mt-1">PNG, JPG, WEBP · max 10 MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Main Product Info Fields Metadata */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1 flex flex-col gap-4">
              {/* Product Reference Number Input */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Product No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="productNo"
                  value={form.productNo}
                  onChange={handleChange}
                  placeholder="e.g. RD-0001"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition bg-white"
                />
              </div>

              {/* Product Title Label Name */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="productName"
                  value={form.productName}
                  onChange={handleChange}
                  placeholder="e.g. Digestive drop"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition bg-white"
                />
              </div>

              {/* Category Collection Selection Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition bg-white appearance-none pr-8"
                  >
                    <option value="" disabled>Select a category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Comprehensive Text Area Description Block */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Product Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Write a clear, detailed product description..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition resize-none bg-white"
            />
          </div>

          {/* Row 3: Financial Pricing and Accounting Metrics Matrix Grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Pricing Details
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* MRP Field Element */}
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="h-0.5 bg-amber-400 w-full" />
                <div className="px-3 pt-3 pb-3">
                  <p className="text-[11px] font-bold text-gray-700">MRP</p>
                  <p className="text-[10px] text-gray-400 mb-2">Max Retail Price</p>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-md px-2 py-1.5">
                    <span className="text-xs text-gray-400">₹</span>
                    <input
                      type="number"
                      name="mrp"
                      value={form.mrp}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* GST Field Element */}
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="h-0.5 bg-blue-500 w-full" />
                <div className="px-3 pt-3 pb-3">
                  <p className="text-[11px] font-bold text-gray-700">GST</p>
                  <p className="text-[10px] text-gray-400 mb-2">Tax Rate (%)</p>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-md px-2 py-1.5">
                    <span className="text-xs text-gray-400">%</span>
                    <input
                      type="number"
                      name="gst"
                      value={form.gst}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* DP Field Element */}
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="h-0.5 bg-purple-500 w-full" />
                <div className="px-3 pt-3 pb-3">
                  <p className="text-[11px] font-bold text-gray-700">DP</p>
                  <p className="text-[10px] text-gray-400 mb-2">Distribution Price</p>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-md px-2 py-1.5">
                    <span className="text-xs text-gray-400">₹</span>
                    <input
                      type="number"
                      name="dp"
                      value={form.dp}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* BV Field Element */}
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="h-0.5 bg-emerald-500 w-full" />
                <div className="px-3 pt-3 pb-3">
                  <p className="text-[11px] font-bold text-gray-700">BV</p>
                  <p className="text-[10px] text-gray-400 mb-2">Business Volume</p>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-md px-2 py-1.5">
                    <span className="text-xs text-gray-400">#</span>
                    <input
                      type="number"
                      name="bv"
                      value={form.bv}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </form>

        {/* ── Sticky Desktop Footer Layout Actions Bar ── */}
        <div className="fixed bottom-0 right-0 left-0 md:left-64 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between z-30">
          <button
            type="button"
            onClick={resetForm}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Reset
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              form="add-product-form"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#1a2e5a] hover:bg-[#0f1f3d] px-5 py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}