"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSlider from "@/components/HeroSlider";
import Footer from "@/components/Footer"; // Import your new component

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const productShowcase = [
  {
    id: 1,
    name: "Digestive drop",
    category: "HEALTHCARE",
    price: "₹ 350",
    image: "/photos/product_digestive_drop.jpg",
    tag: null,
    tagColor: "bg-emerald-500",
  },
  {
    id: 2,
    name: "Mattress",
    category: "WELLNESS",
    price: "₹ 15,000",
    image: "/photos/product_bedSheat.jpg",
    tag: null,
    tagColor: "bg-red-500",
  },
  {
    id: 3,
    name: "Anti radiation chip",
    category: "HEALTHCARE",
    price: "₹ 500",
    image: "/photos/product_chip.jpg",
    tag: null,
  },
  {
    id: 4,
    name: "Hand Bracelet",
    category: "OTHER",
    price: "₹ 900",
    image: "/photos/product_wrist_band.jpg",
    tag: null,
  },
];

const businessPlans = [
  {
    id: "starter",
    name: "Starter Plan",
    tagline: "Perfect for establishing your baseline independent network.",
    features: [
      "Access to standard high-quality healthcare products",
      "Retail margins up to 20% on product redistribution",
      "Direct referral commissions & incentives",
      "Basic business training and digital dashboard access",
    ],
    highlight: false,
  },
  {
    id: "premium",
    name: "Growth Master Plan",
    tagline: "Designed for leaders looking to scale multiple income pipelines.",
    features: [
      "Priority access to newly launched premium wellness products",
      "Enhanced binary and generation matching bonuses",
      "Eligibility for pin discounts (15 to 100 pin milestones)",
      "Exclusive leadership seminars & fast-track reward programs",
    ],
    highlight: true,
  },
];

export default function Home() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar transparent />

      <main className="flex-1 flex flex-col">
        {/* ── 1. Hero Slider ───────────────────────────────────────────── */}
        <HeroSlider />

        {/* ── 2. About ─────────────────────────────────────────────────── */}
        <section id="about" className="py-24 bg-gray-50 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="relative rounded-3xl overflow-hidden shadow-2xl lg:col-span-5"
              >
                <Image
                  src="/photos/all.jpg"
                  alt="About Raj Dhan Varsha"
                  width={600}
                  height={450}
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
                className="flex flex-col gap-6 lg:col-span-7"
              >
                <motion.div variants={fadeIn}>
                  <span className="inline-flex text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    WHO WE ARE
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-black tracking-tight mt-8 mb-6 lg:ml-4 leading-tight whitespace-nowrap">
                    <span className="text-red-600">RAJ </span>
                    <span style={{ color: "rgb(43, 64, 169)" }}>DHANVARSHA</span>{" "}
                    <span className="text-red-600">MARKETING</span>
                  </h2>
                </motion.div>

                <motion.p
                  variants={fadeIn}
                  className="text-lg text-gray-600 leading-relaxed border-l-4 border-blue-600 pl-6 py-2"
                >
                  At Raj Dhanvarsha, our mission is to empower individuals to achieve financial
                  independence and personal growth through a proven business model that combines
                  innovation, support, and high-quality products. We are dedicated to providing our
                  members with the tools, training, and inspiration they need to build a successful
                  business and improve their lives.
                </motion.p>

                <motion.div variants={fadeIn} className="mt-4 lg:ml-4">
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <h4 className="text-xl font-black tracking-wide">Ready to start your journey?</h4>
                      <p className="text-white/80 text-sm mt-1 max-w-md leading-relaxed">
                        Join our fast-growing network today and open up multiple streams of income with premium wellness products.
                      </p>
                    </div>
                    <button
                      onClick={() => scrollTo("contact")}
                      className="whitespace-nowrap flex items-center gap-2 bg-white text-blue-700 hover:bg-red-600 hover:text-white rounded-xl px-6 py-3.5 font-bold text-sm transition-all duration-300 shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <UserPlus className="w-4 h-4" /> Join Now
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── 3. Product Display Grid Section ─────────────────────────── */}
        <section id="products" className="py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                Marketing
              </span>
              <h2 className="text-3xl md:text-5xl font-black mt-4 text-gray-900">
                Our <span className="text-blue-600">Exclusive</span> Products
              </h2>
              <p className="mt-4 text-gray-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                Explore our high-quality range of premium products curated to foster personal health, well-being, and business growth.
              </p>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={stagger}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {productShowcase.map((product) => (
                <motion.div
                  key={product.id}
                  variants={fadeIn}
                  className="group border border-gray-200/80 rounded-2xl p-5 bg-white transition-all duration-300 flex flex-col relative overflow-hidden hover:border-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.4)]"
                >
                  <div className="bg-[#f8fafc] rounded-xl p-6 flex items-center justify-center min-h-[220px] max-h-[220px] border border-gray-100 relative overflow-hidden mb-5 transition-colors duration-300 group-hover:bg-blue-50/30">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 scale-70 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 rounded-xl pointer-events-none" />

                    {product.tag && (
                      <span className={`absolute top-2 left-2 text-[10px] font-black tracking-wider text-white px-2 py-0.5 rounded shadow-sm z-20 ${product.tagColor}`}>
                        {product.tag}
                      </span>
                    )}

                    <Image
                      src={product.image}
                      alt={product.name}
                      width={160}
                      height={180}
                      className="object-contain max-h-[160px] group-hover:scale-105 transition-transform duration-300 drop-shadow-md relative z-10"
                    />
                  </div>

                  <div className="flex flex-col flex-1 text-center">
                    <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-1">
                      {product.category}
                    </span>
                    <h4 className="text-base font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h4>

                    <div className="mt-4 mb-5">
                      <span className="text-red-600 font-extrabold text-base tracking-tight">
                        {product.price}
                      </span>
                    </div>

                    <Link
                      href={`/products/${product.id}`}
                      className="mt-auto w-full py-2.5 bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors shadow-sm tracking-wide uppercase group-hover:bg-blue-600"
                    >
                      View Details
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="text-center mt-14">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white rounded-full px-8 py-3 font-bold text-sm tracking-wide transition-all shadow-md transform hover:-translate-y-0.5"
              >
                See All Products
              </Link>
            </div>
          </div>
        </section>

        {/* ── 4. Business Plan Presentation Section ─────────────────── */}
        <section id="plan" className="py-24 bg-gray-50 border-t border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                Earnings Model
              </span>
              <h2 className="text-3xl md:text-5xl font-black mt-4 text-gray-900">
                Our Business <span className="text-red-600">Plans</span>
              </h2>
              <p className="mt-4 text-gray-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                Choose a structured compensation layout constructed to fast-track your path to financial stability and team management.
              </p>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
            >
              {businessPlans.map((plan) => (
                <motion.div
                  key={plan.id}
                  variants={fadeIn}
                  className={`rounded-3xl p-8 sm:p-10 flex flex-col bg-white border transition-all duration-300 relative overflow-hidden group ${plan.highlight
                      ? "border-blue-500 shadow-[0_10px_30px_rgba(37,99,235,0.12)] md:-translate-y-2"
                      : "border-gray-200/80 shadow-sm hover:border-gray-300"
                    }`}
                >
                  {plan.highlight && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-indigo-600 text-white font-black tracking-widest text-[9px] uppercase px-5 py-1.5 rounded-bl-xl shadow-sm">
                      Most Popular
                    </div>
                  )}

                  <h3 className="text-2xl font-black text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-8">{plan.tagline}</p>

                  <div className="w-full h-px bg-gray-100 mb-8" />

                  <ul className="flex flex-col gap-4 mb-10 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3.5 text-sm text-gray-600 leading-relaxed">
                        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-blue-600" : "text-emerald-500"}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => scrollTo("contact")}
                    className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all tracking-wide flex items-center justify-center gap-2 ${plan.highlight
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/10"
                        : "bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/60"
                      }`}
                  >
                    Select Plan <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </motion.div>

            <div className="text-center mt-14">
              <Link
                href="/plan"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#2E4CA2] to-[#E31E24] hover:opacity-95 text-white rounded-full px-8 py-3 font-bold text-sm tracking-wide transition-all shadow-md transform hover:-translate-y-0.5"
              >
                See More Plans
              </Link>
            </div>
          </div>
        </section>

        {/* ── 5. Address Layout Section ── */}
        <section className="py-24 bg-transparent relative overflow-hidden flex items-center justify-center min-h-[450px]">
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <svg
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[320px] min-w-[1200px]"
              viewBox="0 0 1440 320"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M-100,240 C300,60 600,420 1000,160 C1200,40 1400,180 1600,200"
                stroke="#E31E24"
                strokeWidth="6"
                strokeLinecap="round"
                className="opacity-70"
              />
              <path
                d="M-100,270 C280,100 620,440 980,200 C1180,90 1380,210 1600,220"
                stroke="#2E4CA2"
                strokeWidth="6"
                strokeLinecap="round"
                className="opacity-70"
              />
            </svg>
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-5xl w-full">
            <motion.div
              initial="rest"
              whileHover="hover"
              animate="rest"
              variants={{
                rest: {
                  y: 0,
                  background: "#ffffff",
                  boxShadow: "0px 15px 45px rgba(0,0,0,0.04)",
                },
                hover: {
                  y: -6,
                  background: "linear-gradient(to right, #2E4CA2, #E31E24)",
                  boxShadow: "0px 30px 60px rgba(227, 30, 36, 0.25)",
                },
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="border border-gray-100/80 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-stretch gap-8 min-h-[300px] cursor-pointer"
            >
              <motion.div
                variants={{
                  rest: { backgroundColor: "#2E4CA2" },
                  hover: { backgroundColor: "#ffffff" }
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="md:w-[32%] flex flex-col justify-center items-center text-center py-10 px-6 shrink-0 rounded-2xl shadow-sm"
              >
                <motion.span
                  variants={{
                    rest: { color: "rgba(255, 255, 255, 0.8)" },
                    hover: { color: "#2E4CA2" }
                  }}
                  transition={{ duration: 0.4 }}
                  className="text-xs font-bold tracking-[0.2em] uppercase mb-2"
                >
                  OFFICE
                </motion.span>
                <motion.h3
                  variants={{
                    rest: { color: "#ffffff" },
                    hover: { color: "#2E4CA2" }
                  }}
                  transition={{ duration: 0.4 }}
                  className="text-3xl md:text-4xl font-black tracking-wide uppercase leading-none"
                >
                  ADDRESS
                </motion.h3>
              </motion.div>

              <div className="p-2 flex flex-col justify-center flex-1">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-5 font-bold text-base md:text-lg">
                  <motion.a
                    href="tel:+917404526380"
                    variants={{
                      rest: { color: "#1d3557" },
                      hover: { color: "#ffffff" }
                    }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="text-xl">📱</span>
                    <span>+91-7404526380</span>
                  </motion.a>

                  <motion.a
                    href="mailto:info@rajdhanvarsha.in"
                    variants={{
                      rest: { color: "#1d3557" },
                      hover: { color: "#ffffff" }
                    }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="text-xl">✉️</span>
                    <span>info@rajdhanvarsha.in</span>
                  </motion.a>
                </div>

                <motion.h4
                  variants={{
                    rest: { color: "#0c1a30" },
                    hover: { color: "#ffffff" }
                  }}
                  transition={{ duration: 0.4 }}
                  className="text-xl md:text-2xl font-black tracking-tight mb-4 leading-snug"
                >
                  Gali No.3 Near Tailor Market, Azad Nagar, Hisar
                </motion.h4>

                <motion.p
                  variants={{
                    rest: { color: "#6b7280" },
                    hover: { color: "rgba(255, 255, 255, 0.9)" }
                  }}
                  transition={{ duration: 0.4 }}
                  className="text-sm md:text-base leading-relaxed max-w-2xl font-medium"
                >
                  We can make money by selling products directly to customers or by recruiting new distributors and earning commissions on their sales.
                </motion.p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Render the extracted separate Footer and pass smooth scroll layout function handler */}
      <Footer scrollTo={scrollTo} />
    </div>
  );
}