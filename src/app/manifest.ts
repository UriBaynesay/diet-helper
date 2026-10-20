import type { MetadataRoute } from "next";
import { strings } from "@/lib/strings";

// The installable-app description. Served at /manifest.webmanifest, so src/proxy.ts must
// let that path through without a login (a signed-out browser has to be able to read it).
// Colours are the app's own tokens (globals.css): --background and --primary, in hex.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: strings.common.appName,
    short_name: strings.common.appName,
    description: "יומן תזונה אישי: מוצרים, מתכונים, ארוחות ויעדים.",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf9f6",
    theme_color: "#fdf9f6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
