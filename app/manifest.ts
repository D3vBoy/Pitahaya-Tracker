import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pitahaya Tracker",
    short_name: "Pitahaya",
    description: "Control de prospeccion comercial de Pitahaya Investments",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0612",
    theme_color: "#CF3790",
    orientation: "portrait",
    lang: "es-MX",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/api/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/pwa-icon/512?maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
