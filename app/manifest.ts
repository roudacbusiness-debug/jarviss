import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jarvis — Planning de révision",
    short_name: "Jarvis",
    description: "Planning de révision et bibliothèque de PDF pour la Terminale.",
    lang: "fr",
    start_url: "/planning",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b10",
    theme_color: "#0a0b10",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Planning", url: "/planning", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Bibliothèque", url: "/bibliotheque", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
