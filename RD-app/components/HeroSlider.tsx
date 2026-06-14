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
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: 560 }}
    >
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
          {/* Background image */}
          <Image
            src={slides[current].src}
            alt={slides[current].title}
            fill
            className="object-cover"
            priority={current === 0}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 group">
            <div className="absolute inset-0 flex items-center justify-end px-6 md:px-12">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="w-full max-w-xl md:w-[42%] text-right transition-all duration-500 opacity-100 visible md:opacity-0 md:invisible md:group-hover:opacity-100 md:group-hover:visible md:translate-x-8 md:group-hover:translate-x-0"
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
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2.5 items-center">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`transition-all duration-300 rounded-full ${
              i === current ? "w-8 h-2.5 bg-[#2E4CA2]" : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute bottom-8 right-6 z-20 text-white/60 text-sm font-medium tabular-nums">
        {current + 1} / {slides.length}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
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