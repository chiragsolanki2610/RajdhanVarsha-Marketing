import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/wallet", "/profile"],
    },
    sitemap: "https://rajdhanvarsha.in/sitemap.xml",
  };
}