import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "아이들 주간 계획",
  description: "병원과 어린이집 일정을 모아 주간 계획 이미지로 저장하세요.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
