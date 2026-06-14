"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import type { Product } from "@/lib/products";

interface Props {
  product: Product;
  onDetails: (product: Product) => void;
}

export default function ProductCard({ product, onDetails }: Props) {
  return (
    <div className="group border border-gray-200 hover:border-primary-300 hover:shadow-xl hover:shadow-primary-600/10 transition-all duration-300 rounded-2xl overflow-hidden bg-white flex flex-col">
      {/* Image */}
      <div className="relative bg-gradient-to-br from-primary-50 via-gray-50 to-transparent p-8 flex justify-center items-center min-h-[220px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-50/60 via-transparent to-transparent" />
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            width={200}
            height={176}
            className="h-44 w-auto object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500 relative z-10"
          />
        )}
        <span
          className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full ${product.badgeClass}`}
        >
          {product.badge}
        </span>
        <span className={`absolute top-4 right-4 text-xs font-semibold ${product.stockClass}`}>
          ● {product.stock}
        </span>
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col gap-3 flex-1">
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
            {product.category}
          </p>
          <h3 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h3>
          <p className="text-sm text-primary-600 font-medium mt-0.5">{product.tagline}</p>
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
          <span className="text-sm font-bold text-gray-800">{product.rating}</span>
          <span className="text-xs text-gray-400">({product.reviews})</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{product.description}</p>

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

        {/* Price + Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
          <div>
            <p className="text-xs text-gray-400 font-medium">{product.priceLabel}</p>
            <p className="text-2xl font-black text-gray-900">₹{product.price}/-</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onDetails(product)}
              className="px-3 py-2 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors"
            >
              Details
            </button>
            <button className="px-3 py-2 rounded-full text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors">
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
