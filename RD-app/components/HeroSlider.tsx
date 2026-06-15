"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const slides = [
  {
    src: "/photos/slider_digestive_drop.jpg",
    badge: "RAJ DHAN VARSHA MARKETING",
    title: "Digestive drop",
    sub: "Join a proven business model combining innovation, support, and high-quality wellness products.",
    cta: { label: "Join Us Now", href: "#contact" },
    cta2: { label: "Learn More", href: "#about" },
  },
  {
    src: "/photos/slider_lady_care.jpg",
    badge: "FINANCIAL FREEDOM",
    title: "Lady care syrup",
    sub: "Unlock multiple income streams and grow your network across India.",
    cta: { label: "Join Us Now", href: "#plan" },
    cta2: { label: "Learn More", href: "#about" },
  },
  {
    src: "/photos/slider_relex_on.jpg",
    badge: "PREMIUM PRODUCTS",
    title: "Relax on oil",
    sub: "Digestive Drop — your flagship health supplement at ₹599/- Only.",
    cta: { label: "Join Us Now", href: "/products" },
    cta2: { label: "Learn More", href: "#products" },
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback(
    (index: number, dir?: number) => {
      setDirection(dir ?? (index > current ? 1 : -1));
      setCurrent(index);
    },
    [current]
  );

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const t = setInterval(next, 4500);
    return () => clearInterval(t);
  }, [next]);

  const scrollToAnchor = (href: string) => {
    if (href.startsWith("#")) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden bg-white md:bg-transparent group"
    >
      {/* ========================================== */}
      {/* DESKTOP VIEW (md and up)                   */}
      {/* ========================================== */}
      <div className="hidden md:block relative w-full h-[100vh]" style={{ minHeight: 560 }}>
        <div className="absolute top-0 left-0 right-0 h-[80px] bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />

        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={slides[current].src}
              alt={slides[current].title}
              fill
              className="object-cover"
              priority={current === 0}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="absolute inset-0 flex items-center justify-end px-6 md:px-12">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="w-full max-w-xl md:w-[42%] text-right transition-all duration-500 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-x-8 group-hover:translate-x-0"
              >
                <span className="inline-flex mb-4 text-xs font-bold px-3 py-1.5 rounded-full bg-[#2E4CA2]/90 text-white shadow-sm">
                  {slides[current].badge}
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
                  {slides[current].title}
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
                  {slides[current].sub}
                </p>
                <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                  {slides[current].cta.href.startsWith("/") ? (
                    <Link
                      href={slides[current].cta.href}
                      className="inline-flex items-center gap-2 bg-[#2E4CA2] hover:bg-[#1E3573] text-white rounded-full px-8 py-3.5 text-base font-semibold shadow-xl shadow-blue-900/30 transition-all hover:-translate-y-0.5"
                    >
                      {slides[current].cta.label} →
                    </Link>
                  ) : (
                    <button
                      onClick={() => scrollToAnchor(slides[current].cta.href)}
                      className="inline-flex items-center gap-2 bg-[#2E4CA2] hover:bg-[#1E3573] text-white rounded-full px-8 py-3.5 text-base font-semibold shadow-xl shadow-blue-900/30 transition-all hover:-translate-y-0.5"
                    >
                      {slides[current].cta.label} →
                    </button>
                  )}
                  <button
                    onClick={() => scrollToAnchor(slides[current].cta2.href)}
                    className="inline-flex items-center border-2 border-white/60 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full px-8 py-3.5 text-base font-semibold transition-all"
                  >
                    {slides[current].cta2.label}
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ========================================== */}
      {/* MOBILE & TABLET VIEW (Under md)            */}
      {/* ========================================== */}
      <div className="block md:hidden w-full">

        <div className="relative w-full bg-[#F97316] pt-[72px]">

          <div className="relative w-full">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slides[current].src}
                  alt={slides[current].title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </motion.div>
            </AnimatePresence>

            {/* Ghost image — sets natural container height */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slides[current].src}
              alt=""
              aria-hidden="true"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "280px",
                objectFit: "contain",
                visibility: "hidden",
                display: "block",
              }}
            />
          </div>

          {/* ✅ Left Arrow — shifted down with top-[65%] for mobile only */}
          <button
            onClick={prev}
            className="absolute left-3 top-[65%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 text-orange-600 flex items-center justify-center shadow-md active:scale-90 transition-transform"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* ✅ Right Arrow — shifted down with top-[65%] for mobile only */}
          <button
            onClick={next}
            className="absolute right-3 top-[65%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 text-orange-600 flex items-center justify-center shadow-md active:scale-90 transition-transform"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Dots pagination */}
        <div className="flex gap-2 items-center justify-center mt-4 mb-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`transition-all duration-300 ${
                i === current
                  ? "w-7 h-2 rounded-full bg-[#E05915]"
                  : "w-2.5 h-2 rounded-full bg-orange-600/30"
              }`}
            />
          ))}
        </div>

        {/* Text block */}
        <div className="px-6 pb-10 text-center max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-[#002B6B] mb-2.5">
            {slides[current].title}
          </h2>
          <p className="text-sm text-gray-500 font-normal leading-relaxed mb-6 px-2">
            {slides[current].sub}
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4">
            {slides[current].cta.href.startsWith("/") ? (
              <Link
                href={slides[current].cta.href}
                className="inline-flex items-center bg-[#F15A24] text-white rounded-full px-6 py-3 text-sm font-bold shadow-md active:scale-95 transition-transform"
              >
                {slides[current].cta.label} →
              </Link>
            ) : (
              <button
                onClick={() => scrollToAnchor(slides[current].cta.href)}
                className="inline-flex items-center bg-[#F15A24] text-white rounded-full px-6 py-3 text-sm font-bold shadow-md active:scale-95 transition-transform"
              >
                {slides[current].cta.label} →
              </button>
            )}
            <button
              onClick={() => scrollToAnchor(slides[current].cta2.href)}
              className="inline-flex items-center border border-gray-300 text-gray-700 bg-white rounded-full px-6 py-3 text-sm font-semibold shadow-sm"
            >
              {slides[current].cta2.label}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* DESKTOP GLOBAL ELEMENTS                    */}
      {/* ========================================== */}
      <button
        onClick={prev}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white items-center justify-center border border-white/20 transition-all hover:scale-110"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white items-center justify-center border border-white/20 transition-all hover:scale-110"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-20 gap-2.5 items-center">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === current
                ? "w-8 h-2.5 bg-[#2E4CA2]"
                : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      <div className="hidden md:block absolute bottom-8 right-6 z-20 text-white/60 text-sm font-medium tabular-nums">
        {current + 1} / {slides.length}
      </div>

      <div className="hidden md:block absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
        <motion.div
          key={current}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 4.5, ease: "linear" }}
          className="h-full bg-[#2E4CA2]"
        />
      </div>
    </section>
  );
}
