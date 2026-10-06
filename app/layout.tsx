import type { Metadata } from "next";
import { Syne } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import CloudSyncProvider from "@/components/CloudSyncProvider";
import SyncStatusBanner from "@/components/SyncStatusBanner";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Protly",
  description: "カロリーとタンパク質を記録する食事管理アプリ",
};

/**
 * ルートレイアウト
 *
 * Next.js の App Router では、app/layout.tsx が全ページ共通の「枠」になる。
 * ここにヘッダーやナビゲーションを置くと、全画面で表示される。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={syne.variable}>
      <body className="min-h-screen bg-slate-50 antialiased">
        <CloudSyncProvider>
          <SyncStatusBanner />
          <div className="mx-auto min-h-screen max-w-lg pb-20">{children}</div>
          <BottomNav />
        </CloudSyncProvider>
      </body>
    </html>
  );
}
