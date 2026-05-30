import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mirai Signal",
    template: "%s | Mirai Signal",
  },
  description: "海外AI・ロボティクス・半導体・宇宙などの最先端技術情報を毎日日本語で届ける情報インテリジェンスプラットフォーム。英語圏の一次情報をAIで収集・分析・翻訳。",
  keywords: ["AI", "ロボティクス", "半導体", "宇宙", "テクノロジー", "技術情報", "海外AI", "LLM", "AGI"],
  authors: [{ name: "Mirai Signal" }],
  creator: "Mirai Signal",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://mirai-signal-web-kzfb.vercel.app",
    siteName: "Mirai Signal",
    title: "Mirai Signal | 未来の兆候を、先に読む",
    description: "海外AI・ロボティクス・半導体・宇宙などの最先端技術情報を毎日日本語で届けるプラットフォーム。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mirai Signal | 未来の兆候を、先に読む",
    description: "海外AI・ロボティクス・半導体・宇宙などの最先端技術情報を毎日日本語で届ける。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      <GoogleAnalytics gaId="G-Q0Q9JC6RHS" />
    </html>
  );
}