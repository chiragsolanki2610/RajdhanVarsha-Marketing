# Raj Dhan Varsha Marketing — Next.js

A modern marketing website built with **Next.js 14 (App Router)**, **TypeScript**, **React**, and **Tailwind CSS**.

## Stack

| Tool | Purpose |
|------|---------|
| Next.js 14 (App Router) | Routing, SSR, Image optimization |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Lucide React | Icons |

## Project Structure

```
├── app/
│   ├── layout.tsx           ← Root HTML layout + metadata
│   ├── page.tsx             ← Home page (hero, about, plan, products, contact)
│   ├── globals.css          ← Tailwind base + Google Fonts
│   └── products/
│       └── page.tsx         ← Products catalog page
├── components/
│   ├── Navbar.tsx           ← Fixed responsive navbar
│   ├── HeroSlider.tsx       ← Auto-sliding hero with framer-motion
│   ├── ProductCard.tsx      ← Individual product card
│   └── ProductModal.tsx     ← Product detail overlay modal
├── lib/
│   ├── products.ts          ← Product data & TypeScript types
│   └── utils.ts             ← cn() utility (clsx + tailwind-merge)
└── public/
    └── images/              ← Put your images here (see below)
```

## Getting Started

### 1. Install dependencies
```bash
npm install
# or
pnpm install
# or
yarn install
```

### 2. Add images
Copy these three images into `public/images/`:
- `hero-bg.png` — Hero slider slide 1 background
- `about-image.png` — About section & hero slide 2
- `digestive-drop.png` — Product image

### 3. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production
```bash
npm run build
npm run start
```

## Adding More Products

Edit `lib/products.ts`. Add a new object to the `products` array:

```ts
{
  id: 8,
  comingSoon: false,
  name: "New Product",
  tagline: "Type • Size",
  category: "Category Name",
  image: "/images/your-product.png",
  price: 499,
  priceLabel: "Member Price",
  rating: 4.5,
  reviews: 50,
  badge: "New",
  badgeClass: "bg-blue-500 text-white",
  description: "Product description...",
  benefits: ["Benefit 1", "Benefit 2"],
  highlights: [{ label: "Label 1" }, { label: "Label 2" }],
  stock: "In Stock",
  stockClass: "text-green-600",
}
```

## Deployment

Deploy to **Vercel** (recommended for Next.js):

```bash
npx vercel
```

Or deploy to any Node.js host that supports Next.js.
