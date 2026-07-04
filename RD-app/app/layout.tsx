import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rajdhanvarsha.in"), // your real domain
  title: "Raj Dhan Varsha Marketing | Network Marketing & Wellness Products",
  description:
    "Empowering individuals to build wealth through a proven network marketing model combining innovation, support, and premium wellness products.",
  keywords: ["network marketing", "wellness products", "raj dhan varsha", "digestive drop", "business opportunity"],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/photos/web_logo.png",
  },
  openGraph: {
    title: "Raj Dhan Varsha Marketing",
    description:
      "Empowering individuals to build wealth through a proven network marketing model.",
    url: "https://rajdhanvarsha.in",
    siteName: "Raj Dhan Varsha Marketing",
    images: ["/photos/web_logo.png"],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raj Dhan Varsha Marketing",
    description: "Network marketing model with premium wellness products.",
    images: ["/photos/web_logo.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Raj Dhan Varsha Marketing",
  url: "https://rajdhanvarsha.in",
  logo: "https://rajdhanvarsha.in/photos/web_logo.png",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Gali No.3 Near Tailor Market, Azad Nagar",
    addressLocality: "Hisar",
    addressRegion: "Haryana",
    addressCountry: "IN",
  },
  telephone: "+91-7404526380",
  email: "info@rajdhanvarsha.in",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}