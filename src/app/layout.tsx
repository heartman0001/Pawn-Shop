import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

// ฟอนต์หลักของระบบ: Noto Sans Thai (มีหัว อ่านง่ายทั้งไทยและเลขละติน)
// ใช้ variable font ไฟล์เดียว ครอบน้ำหนัก 400–800 ที่ระบบใช้จริง
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

// ฟอนต์ตัวเลข/รหัสอ้างอิง (เลขสัญญา, เลขใบเสร็จ) — ความกว้างเท่ากันทุกตัว
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ร้านรับจำนำ — ระบบจัดการ & POS",
  description: "ระบบจัดการร้านจำนำและขายสินค้าหน้าร้าน (Single-User)",
};

// สำคัญ: ไม่มี meta viewport มือถือจะวัด layout กว้าง ~980px แล้วย่อภาพ
// ทำให้ responsive breakpoint (hidden/lg:*) คำนวณผิดทั้งหมด
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${geistMono.variable} h-full antialiased`}
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
