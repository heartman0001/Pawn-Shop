import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ร้านรับจำนำ — ระบบจัดการ & POS",
  description: "ระบบจัดการร้านจำนำและขายสินค้าหน้าร้าน (Single-User)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="light"
    >
      <head>
        <meta name="theme-color" content="#eff8f7" />
      </head>
      <body className="min-h-full bg-surface-base text-zinc-800">
        {children}
      </body>
    </html>
  );
}
