import { MetadataRoute } from "next";

const BASE_URL = "https://mirai-signal-web-kzfb.vercel.app";

const DOMAINS = [
  "ai",
  "robotics",
  "biotech",
  "semiconductor",
  "energy",
  "space",
  "defense",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const domainPages = DOMAINS.map((domain) => ({
    url: `${BASE_URL}/domain/${domain}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const archivePages = DOMAINS.map((domain) => ({
    url: `${BASE_URL}/domain/${domain}/archive`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...domainPages,
    ...archivePages,
  ];
}