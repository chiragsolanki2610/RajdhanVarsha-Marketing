"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar"; 
import Footer from "@/components/Footer";

const PRODUCTS = [
  { 
    id: 1, 
    name: "Digestive drop", 
    price: 350, 
    category: "Bags", 
    image: "/photos/product_digestive_drop.jpg"
  },
  { 
    id: 2, 
    name: "Lady care syrup", 
    price: 349, 
    category: "Electronics", 
    image: "/photos/product_lady_care.jpg"
  },
  { 
    id: 3, 
    name: "Relax on oil", 
    price: 350, 
    category: "Electronics", 
    image: "/photos/product_relex_on.jpg"
  },
  { 
    id: 4, 
    name: "Anti radiation chip", 
    price: 500, 
    category: "Accessories", 
    image: "/photos/product_chip.jpg"
  },
  { 
    id: 5, 
    name: "Bottle Cover", 
    price: 1100, 
    category: "Furniture", 
    image: "/photos/product_bottle_cover.jpg"
  },
  { 
    id: 6, 
    name: "Hand Bracelet", 
    price: 900, 
    category: "Accessories", 
    image: "/photos/product_wrist_band.jpg"
  },
  { 
    id: 7, 
    name: "Mattress", 
    price: 15000, 
    category: "Electronics", 
    image: "/photos/product_bedSheat.jpg"
  },
];

const CATEGORIES = ["All", "Bags", "Electronics", "Accessories", "Furniture"];

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured");

  const filteredProducts = PRODUCTS.filter(
    (product) => selectedCategory === "All" || product.category === selectedCategory
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    return 0; 
  });

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-grow px-4 pt-24 pb-8 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Our Products</h1>
          <p className="mt-2 text-sm text-gray-500">Explore our curated collection of high-quality gear.</p>
        </div>

        <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <label htmlFor="sort" className="text-sm font-medium text-gray-500">Sort by:</label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-500">No products found in this category.</div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
            {sortedProducts.map((product) => (
              <div key={product.id} className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
                
                <div className="aspect-square w-full overflow-hidden bg-gray-200 group-hover:opacity-90 transition-opacity">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                  />
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{product.category}</span>
                  <h3 className="mt-1 text-sm font-semibold text-gray-700 line-clamp-2">
                    <a href="#">
                      <span aria-hidden="true" className="absolute inset-0" />
                      {product.name}
                    </a>
                  </h3>

                  <div className="mt-auto pt-6 flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">₹{product.price}</p>
                    <button className="relative z-10 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      <Footer scrollTo={() => {}} />
    </div>
  );
}