import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Road to FIRE - 積立シミュレーター",
  description: "目標金額達成のための積立計算ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
