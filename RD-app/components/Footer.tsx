"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, PhoneCall, Mail } from "lucide-react";
import { useState, useEffect } from "react";

interface FooterProps {
  scrollTo: (id: string) => void;
}

export default function Footer({ scrollTo }: FooterProps) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <footer className="bg-[#0a1628] text-white pt-16 pb-6">
        <div className="container mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

            {/* Brand Column */}
            <div className="flex flex-col gap-4">
              <Image
                src="/photos/web_logo.jpg"
                alt="Raj Dhanvarsha Logo"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="text-white/60 text-sm leading-relaxed max-w-[220px]">
                Our mission is to empower individuals to achieve financial independence.
              </p>
              {/* Social Icons */}
              <div className="flex items-center gap-4 mt-2">
                <a href="#" aria-label="Facebook" className="text-white/60 hover:text-white transition-colors text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="#" aria-label="Twitter" className="text-white/60 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                </a>
                <a href="#" aria-label="Instagram" className="text-white/60 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="#" aria-label="YouTube" className="text-white/60 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="#0a1628" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-extrabold text-base mb-5 tracking-wide">Quick Links</h4>
              <ul className="flex flex-col gap-3 text-sm text-white/65">
                {[
                  { label: "Home", action: () => scrollTo("home") },
                  { label: "Overview", href: "/overview" },
                  { label: "Our Team", action: () => scrollTo("about") },
                  { label: "Legal Documents", action: () => scrollTo("about") },
                  { label: "Our Products", href: "/products" },
                ].map((item, i) =>
                  item.href ? (
                    <li key={i}><Link href={item.href} className="hover:text-white transition-colors">{item.label}</Link></li>
                  ) : (
                    <li key={i}><button onClick={item.action} className="hover:text-white transition-colors">{item.label}</button></li>
                  )
                )}
              </ul>
            </div>

            {/* Useful Links */}
            <div>
              <h4 className="font-extrabold text-base mb-5 tracking-wide">Useful Links</h4>
              <ul className="flex flex-col gap-3 text-sm text-white/65">
                {[
                  { label: "Our Plan", action: () => scrollTo("plan") },
                  { label: "Delivery Center", href: "#" },
                  { label: "Contact Us", action: () => scrollTo("contact") },
                  { label: "Login", href: "#" },
                  { label: "Register", href: "#" },
                ].map((item, i) =>
                  item.href ? (
                    <li key={i}><Link href={item.href} className="hover:text-white transition-colors">{item.label}</Link></li>
                  ) : (
                    <li key={i}><button onClick={item.action} className="hover:text-white transition-colors">{item.label}</button></li>
                  )
                )}
              </ul>
            </div>

            {/* Office Address */}
            <div>
              <h4 className="font-extrabold text-base mb-5 tracking-wide">Office Address</h4>
              <ul className="flex flex-col gap-4 text-sm text-white/65">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-white/80" />
                  <span>Gali No.3 Near Tailor Market, Azad Nagar, Hisar</span>
                </li>
                <li className="flex items-center gap-3">
                  <PhoneCall className="w-5 h-5 shrink-0 text-white/80" />
                  <a href="tel:+917404526380" className="hover:text-white transition-colors">+91-7404526380</a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 shrink-0 text-white/80" />
                  <a href="mailto:info@rajdhanvarsha.in" className="hover:text-white transition-colors">info@rajdhanvarsha.in</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 pt-6 text-center text-sm text-white/40">
            © 2026 RAJ DHANVARSHA. All rights reserved
          </div>
        </div>
      </footer>

      {/* Scroll to top button */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-all"
          aria-label="Scroll to top"
        >
          ▲
        </button>
      )}
    </>
  );
}