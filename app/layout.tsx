import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "the-one-life.local";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;
  const title = "The One Life · 像素生活工作台";
  const description = "集任务、习惯、财务、健康、学习、AI 总结与成长画像于一体的像素风个人生活工作台。";
  return {
    title,
    description,
    manifest: "/manifest.webmanifest",
    applicationName: "The One Life",
    appleWebApp: { capable: true, title: "The One Life", statusBarStyle: "black-translucent" },
    icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
    openGraph: { title, description, type: "website", images: [{ url: imageUrl, width: 1733, height: 909, alt: "The One Life 像素生活工作台" }] },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export const viewport: Viewport = { themeColor: "#5f8256", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" data-theme="forest"><body>{children}</body></html>;
}
