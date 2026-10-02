import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { InstallAppProvider } from "@/components/pwa/install-app";

import "./globals.css";

const nunito = Nunito_Sans({
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  preload: true,
  subsets: ["latin", "vietnamese"],
  variable: "--font-nunito-sans",
});

export const metadata: Metadata = {
  applicationName: "Akiha",
  title: "Akiha",
  description: "Nhật ký ảnh hằng ngày riêng tư của Thu và Vinh.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Akiha",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6AFC2",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${nunito.className} ${nunito.variable} antialiased`}>
        <InstallAppProvider>
          {children}
          <ServiceWorkerRegistration />
        </InstallAppProvider>
      </body>
    </html>
  );
}
