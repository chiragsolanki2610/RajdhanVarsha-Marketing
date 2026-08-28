import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://rajdhanvarsha.in";
  const routes = [
    "", "/products", "/our-plan", "/our-team", "/plan",
    "/delivery-center", "/register", "/login", "/legal-documents",
  ];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}