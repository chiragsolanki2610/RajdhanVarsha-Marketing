"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, Star } from "lucide-react";
import type { Product } from "@/lib/products";

interface Props {
  product: Product;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image */}
          <div className="bg-gradient-to-br from-primary-50 to-gray-50 p-10 flex items-center justify-center rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none min-h-64">
            {product.image && (
              <Image
                src={product.image}
                alt={product.name}
                width={200}
                height={220}
                className="object-contain drop-shadow-2xl max-h-56"
              />
            )}
          </div>

          {/* Details */}
          <div className="p-8 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{product.category}</p>
                <h2 className="text-2xl font-black text-gray-900 mt-1">{product.name}</h2>
                <p className="text-sm text-primary-600 font-semibold mt-0.5">{product.tagline}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="font-bold text-sm">{product.rating}</span>
              <span className="text-xs text-gray-400">({product.reviews} reviews)</span>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>

            {/* Benefits */}
            <div>
              <p className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-2 mb-3">Key Benefits</p>
              <ul className="flex flex-col gap-2">
                {product.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-primary-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Highlights */}
            <div className="flex flex-wrap gap-1.5">
              {product.highlights.map((h) => (
                <span
                  key={h.label}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 border border-primary-100"
                >
                  {h.label}
                </span>
              ))}
            </div>

            {/* Price box */}
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 flex items-center justify-between gap-4 mt-auto">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{product.priceLabel}</p>
                <p className="text-2xl font-black text-gray-900">₹{product.price}/-</p>
              </div>
              <button
                onClick={onClose}
                className="bg-primary-600 hover:bg-primary-700 text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
