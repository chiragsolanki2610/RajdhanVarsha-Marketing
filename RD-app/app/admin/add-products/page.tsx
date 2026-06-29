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
  ChevronDown,
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
  sgst: string;
  cgst: string;
  dp: string;
  bv: string;
}

const INITIAL_FORM: FormState = {
  productNo: '',
  productName: '',
  category: '',
  description: '',
  mrp: '',
  sgst: '',
  cgst: '',
  dp: '',
  bv: '',
};

// ─── Category Combobox Component ──────────────────────────────────────────────
function CategoryCombobox({
  value,
  onChange,
  dbCategories,
  isLoadingCategories,
}: {
  value: string;
  onChange: (val: string) => void;
  dbCategories: string[];
  isLoadingCategories: boolean;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = inputValue.trim()
    ? dbCategories.filter((c) =>
        c.toLowerCase().includes(inputValue.toLowerCase())
      )
    : dbCategories;

  const isCustomInput =
    inputValue.trim() !== '' &&
    !dbCategories.some(
      (c) => c.toLowerCase() === inputValue.trim().toLowerCase()
    );

  const handleSelect = (cat: string) => {
    setInputValue(cat);
    onChange(cat);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleUseCustom = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center border rounded-lg px-3 py-2.5 bg-white transition-all ${
          isOpen
            ? 'border-gray-400 ring-1 ring-gray-300'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Select or type a category..."
          className="flex-1 text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
        />
        {isLoadingCategories ? (
          <Loader2 size={12} className="text-gray-300 animate-spin shrink-0" />
        ) : (
          <ChevronDown
            size={12}
            className={`text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {isLoadingCategories && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Loading categories...
            </div>
          )}

          {!isLoadingCategories && isCustomInput && (
            <button
              type="button"
              onClick={handleUseCustom}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#3B5998] hover:bg-blue-50 transition border-b border-gray-100"
            >
              <Plus size={13} className="shrink-0" />
              <span>
                Use{' '}
                <span className="font-semibold">"{inputValue.trim()}"</span>{' '}
                as category
              </span>
            </button>
          )}

          {!isLoadingCategories && filtered.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Categories
              </p>
              {filtered.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={`w-full text-left px-3 py-2 text-sm transition ${
                    value === cat
                      ? 'bg-blue-50 text-[#3B5998] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {!isLoadingCategories && filtered.length === 0 && !isCustomInput && (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">
              No categories found. Keep typing to use a custom one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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

  // ─── DB Categories ───────────────────────────────────────────────────────────
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:56188';
        const savedToken = localStorage.getItem('token');
        const res = await fetch(`${BASE_URL}/api/Products`, {
          headers: savedToken ? { 'Authorization': `Bearer ${savedToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const products: any[] = Array.isArray(data)
            ? data
            : data.items ?? data.data ?? data.products ?? data.value ?? [];
          const unique = Array.from(
            new Set(
              products
                .map((p: any) =>
                  p.category ?? p.Category ?? p.categoryName ?? p.CategoryName ?? p.CATEGORY ?? ''
                )
                .filter(Boolean)
            )
          ) as string[];
          setDbCategories(unique);
        }
      } catch (err) {
        console.error('[Categories Debug] Fetch error:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
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

  // ─── Computed total GST (SGST + CGST) ───────────────────────────────────────
  const totalGst =
    (parseFloat(form.sgst) || 0) + (parseFloat(form.cgst) || 0);

  // ─── Form Submission ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validate required fields
    const requiredFields: (keyof FormState)[] = [
      'productNo', 'productName', 'category', 'description',
      'mrp', 'sgst', 'cgst', 'dp', 'bv',
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
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:56188';
      const savedToken = localStorage.getItem('token');

      if (!savedToken) {
        setErrorMsg('You are not logged in. Please log in and try again.');
        setIsSubmitting(false);
        return;
      }

      // ✅ FIX: Combine SGST + CGST into a single `gst` value for the backend
      const combinedGst = (parseFloat(form.sgst) || 0) + (parseFloat(form.cgst) || 0);

      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('productNo', form.productNo);
      formData.append('productName', form.productName);
      formData.append('category', form.category);
      formData.append('description', form.description);
      formData.append('mrp', parseFloat(form.mrp).toString());
      formData.append('gst', combinedGst.toString()); // ✅ single gst field (sgst + cgst)
      formData.append('dp', parseFloat(form.dp).toString());
      formData.append('bv', parseFloat(form.bv).toString());

      const res = await fetch(`${BASE_URL}/api/Products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${savedToken}` },
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
          // Fallback
        }
        throw new Error(errMessage);
      }

      setSuccessMsg(`"${form.productName}" added successfully!`);
      setShowSuccessPopup(true);
      resetForm();

    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading State ───────────────────────────────────────────────────────────
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

  // ─── Access Denied ───────────────────────────────────────────────────────────
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
            <p className="text-sm text-gray-500 max-w-xs">Only admins can add products.</p>
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

        {/* Page Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 bg-[#f5f6f8]">
          <div>
            <h1 className="text-[15px] font-bold text-gray-800 leading-tight">Add New Product</h1>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the details below to add a new product to the catalog</p>
          </div>
          <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            ⚑ Admin Only
          </span>
        </div>

        {/* Status Banners */}
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

        {/* Form */}
        <form
          id="add-product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto pb-24 px-6 space-y-4"
        >
          {/* Row 1: Image + Product Info */}
          <div className="flex gap-4 items-stretch">

            {/* Image Upload */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col w-[300px] shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Product Image <span className="text-red-500">*</span>
              </p>

              {imagePreview ? (
                <div className="relative flex-1 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 min-h-[260px]">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
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

            {/* Product Info Fields */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1 flex flex-col gap-4">
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

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <CategoryCombobox
                  value={form.category}
                  onChange={(val) => {
                    setForm((prev) => ({ ...prev, category: val }));
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  dbCategories={dbCategories}
                  isLoadingCategories={isLoadingCategories}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Description */}
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

          {/* Row 3: Pricing Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Pricing Details
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

              {/* MRP */}
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

              {/* SGST */}
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="h-0.5 bg-blue-500 w-full" />
                <div className="px-3 pt-3 pb-3">
                  <p className="text-[11px] font-bold text-gray-700">SGST</p>
                  <p className="text-[10px] text-gray-400 mb-2">State GST (%)</p>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-md px-2 py-1.5">
                    <span className="text-xs text-gray-400">%</span>
                    <input
                      type="number"
                      name="sgst"
                      value={form.sgst}
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

              {/* CGST */}
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="h-0.5 bg-indigo-500 w-full" />
                <div className="px-3 pt-3 pb-3">
                  <p className="text-[11px] font-bold text-gray-700">CGST</p>
                  <p className="text-[10px] text-gray-400 mb-2">Central GST (%)</p>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-md px-2 py-1.5">
                    <span className="text-xs text-gray-400">%</span>
                    <input
                      type="number"
                      name="cgst"
                      value={form.cgst}
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

              {/* DP */}
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

              {/* BV */}
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

            {/* Live Total GST indicator */}
            {(form.sgst || form.cgst) && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 border-t border-gray-100 pt-3">
                <span>Total GST sent to backend</span>
                <span className="text-gray-300">=</span>
                <span>SGST ({form.sgst || '0'}%)</span>
                <span className="text-gray-300">+</span>
                <span>CGST ({form.cgst || '0'}%)</span>
                <span className="text-gray-300">=</span>
                <span className="font-bold text-gray-600">{totalGst.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </form>

        {/* Sticky Footer Actions */}
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

        {/* Success Popup */}
        {showSuccessPopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSuccessPopup(false)}
          >
            <div
              className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 w-[340px] text-center mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={36} className="text-green-500" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-base font-bold text-gray-800">Product Added!</h2>
                <p className="text-xs text-gray-500 leading-relaxed">{successMsg}</p>
              </div>

              <div className="w-full h-px bg-gray-100" />

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessPopup(false);
                    router.push('/admin/products');
                  }}
                  className="flex-1 text-xs font-semibold text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition"
                >
                  View Products
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuccessPopup(false)}
                  className="flex-1 text-xs font-bold text-white bg-[#1a2e5a] hover:bg-[#0f1f3d] px-4 py-2.5 rounded-xl transition"
                >
                  Add Another
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}