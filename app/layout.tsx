import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raj Dhan Varsha Marketing",
  description:
    "Empowering individuals to build wealth through a proven network marketing model combining innovation, support, and premium wellness products.",
  keywords: ["network marketing", "wellness products", "raj dhan varsha", "digestive drop", "business opportunity"],
  icons: {
    icon: "/photos/web_logo.png",
    
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}