export interface ProductHighlight {
  label: string;
}

export interface Product {
  id: number;
  comingSoon: boolean;
  name: string;
  tagline: string;
  category: string;
  image: string | null;
  price: number;
  priceLabel: string;
  rating: number;
  reviews: number;
  badge: string;
  badgeClass: string;
  description: string;
  benefits: string[];
  highlights: ProductHighlight[];
  stock: string;
  stockClass: string;
}

export const products: Product[] = [
  {
    id: 1,
    comingSoon: false,
    name: "Digestive Drop",
    tagline: "Dietary Supplement • 30ml",
    category: "Health & Wellness",
    image: "/photos/product_digestive_drop.jpg",
    price: 599,
    priceLabel: "First Purchase Price",
    rating: 4.8,
    reviews: 214,
    badge: "Bestseller",
    badgeClass: "bg-green-600 text-white",
    description:
      "A powerful herbal formula crafted to improve digestive health, boost immunity, and restore gut balance. Suitable for all age groups.",
    benefits: [
      "Boosts Appetite naturally and safely",
      "Relieves Regular Digestive Problems",
      "Improves the overall Immune System",
      "Makes stomach less susceptible to indigestion",
      "Reduces gas and flatulence discomfort",
    ],
    highlights: [
      { label: "100% Herbal" },
      { label: "Lab Tested" },
      { label: "Safe & Certified" },
    ],
    stock: "In Stock",
    stockClass: "text-green-600",
  },
  {
    id: 2,
    comingSoon: false,
    name: "Immunity Booster",
    tagline: "Herbal Capsules • 60 Capsules",
    category: "Immunity",
    image: "/photos/product_digestive_drop.jpg",
    price: 799,
    priceLabel: "Member Price",
    rating: 4.6,
    reviews: 138,
    badge: "New",
    badgeClass: "bg-blue-500 text-white",
    description:
      "A potent blend of Ashwagandha, Tulsi, and Giloy that strengthens your body's natural defenses, reduces stress, and fights seasonal infections.",
    benefits: [
      "Strengthens immune response",
      "Rich in antioxidants & adaptogens",
      "Reduces stress and fatigue",
      "Fights cold, cough & seasonal flu",
      "Safe for daily long-term use",
    ],
    highlights: [
      { label: "Ayurvedic" },
      { label: "Lab Tested" },
      { label: "GMP Certified" },
    ],
    stock: "In Stock",
    stockClass: "text-green-600",
  },
  {
    id: 3,
    comingSoon: false,
    name: "Energy Boost Plus",
    tagline: "Effervescent Tablets • 20 Tablets",
    category: "Energy & Fitness",
    image: "/photos/product_digestive_drop.jpg",
    price: 449,
    priceLabel: "Member Price",
    rating: 4.5,
    reviews: 97,
    badge: "Popular",
    badgeClass: "bg-orange-500 text-white",
    description:
      "Instant energy tablets packed with B-vitamins, natural caffeine, and electrolytes. Dissolve in water for a refreshing energy drink anytime.",
    benefits: [
      "Instant energy within 15 minutes",
      "Improves mental focus & clarity",
      "Zero sugar, zero calories",
      "Replenishes lost electrolytes",
      "Great taste — available in lemon",
    ],
    highlights: [
      { label: "Natural Caffeine" },
      { label: "Lab Tested" },
      { label: "FSSAI Approved" },
    ],
    stock: "In Stock",
    stockClass: "text-green-600",
  },
  {
    id: 4,
    comingSoon: false,
    name: "Skin Glow Serum",
    tagline: "Face Serum • 30ml",
    category: "Beauty & Skin",
    image: "/photos/product_digestive_drop.jpg",
    price: 999,
    priceLabel: "Member Price",
    rating: 4.7,
    reviews: 182,
    badge: "Top Rated",
    badgeClass: "bg-pink-500 text-white",
    description:
      "Advanced brightening serum with Vitamin C, Niacinamide, and Hyaluronic Acid. Reduces dark spots, hydrates deeply, and gives a natural glow.",
    benefits: [
      "Fades dark spots & pigmentation",
      "Intense skin hydration for 24 hrs",
      "Reduces fine lines & wrinkles",
      "Suitable for all skin types",
      "Dermatologically tested",
    ],
    highlights: [
      { label: "Vegan Formula" },
      { label: "Derma Tested" },
      { label: "Paraben Free" },
    ],
    stock: "In Stock",
    stockClass: "text-green-600",
  },
  {
    id: 5,
    comingSoon: false,
    name: "Joint Care Oil",
    tagline: "Massage Oil • 100ml",
    category: "Pain Relief",
    image: "/photos/product_digestive_drop.jpg",
    price: 649,
    priceLabel: "Member Price",
    rating: 4.4,
    reviews: 74,
    badge: "Herbal",
    badgeClass: "bg-emerald-600 text-white",
    description:
      "A warming herbal oil with Mahanarayan, Nirgundi, and Eucalyptus that provides fast relief from joint pain, back ache, and muscle stiffness.",
    benefits: [
      "Fast-acting pain relief",
      "Reduces joint inflammation",
      "Improves mobility & flexibility",
      "Effective for back & neck pain",
      "No side effects with regular use",
    ],
    highlights: [
      { label: "100% Herbal" },
      { label: "Clinically Tested" },
      { label: "Safe & Natural" },
    ],
    stock: "Limited Stock",
    stockClass: "text-amber-600",
  },
  {
    id: 6,
    comingSoon: false,
    name: "Detox Green Tea",
    tagline: "Herbal Tea Bags • 30 Bags",
    category: "Detox & Cleanse",
    image: "/photos/product_digestive_drop.jpg",
    price: 349,
    priceLabel: "Member Price",
    rating: 4.3,
    reviews: 61,
    badge: "Organic",
    badgeClass: "bg-green-600 text-white",
    description:
      "A refreshing blend of Green Tea, Senna, and Ginger that gently cleanses the body, supports weight management, and boosts metabolism.",
    benefits: [
      "Gentle daily detox & cleanse",
      "Supports healthy weight loss",
      "Boosts metabolism naturally",
      "Improves gut health",
      "Rich in antioxidants",
    ],
    highlights: [
      { label: "Organic Blend" },
      { label: "Lab Tested" },
      { label: "No Chemicals" },
    ],
    stock: "In Stock",
    stockClass: "text-green-600",
  },
  {
    id: 7,
    comingSoon: false,
    name: "Hair Growth Oil",
    tagline: "Scalp Oil • 100ml",
    category: "Hair Care",
    image: "/photos/product_digestive_drop.jpg",
    price: 549,
    priceLabel: "Member Price",
    rating: 4.6,
    reviews: 109,
    badge: "Bestseller",
    badgeClass: "bg-green-600 text-white",
    description:
      "A powerful blend of Bhringraj, Brahmi, and Coconut oil that stimulates hair follicles, reduces hair fall, and promotes thick, lustrous hair.",
    benefits: [
      "Reduces hair fall significantly",
      "Stimulates new hair growth",
      "Nourishes scalp & strengthens roots",
      "Controls dandruff & dryness",
      "Suitable for all hair types",
    ],
    highlights: [
      { label: "Pure Herbal" },
      { label: "Lab Tested" },
      { label: "Sulphate Free" },
    ],
    stock: "In Stock",
    stockClass: "text-green-600",
  },
];

export const categories = [
  "All",
  ...Array.from(new Set(products.map((p) => p.category))),
];
