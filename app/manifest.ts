import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Akiha",
    short_name: "Akiha",
    description: "Nhật ký ảnh hằng ngày riêng tư của Thu và Vinh.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF7FA",
    theme_color: "#F6AFC2",
    orientation: "portrait-primary",
    categories: ["lifestyle"],
    shortcuts: [
      { name: "Gửi khoảnh khắc", short_name: "Gửi ảnh", url: "/#camera", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Mở lịch ảnh", short_name: "Lịch", url: "/calendar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Trò chuyện với Akiha AI", short_name: "Akiha AI", url: "/chat", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
