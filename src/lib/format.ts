import type { PawnStatus, PaymentMethod } from "@prisma/client";

/** ข้อความบอกเงื่อนไขการแนบรูปสินค้า (ใช้หน้าเพิ่มสินค้า) */
export const PRODUCT_IMAGE_UPLOAD_HINT =
  "รองรับไฟล์ JPG / PNG / WEBP / GIF ขนาดไม่เกิน 5MB";

const bahtFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});

/** ฿1,250 */
export function formatBaht(amount: number): string {
  return `฿${bahtFormatter.format(amount)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 04-09-2026 (วัน-เดือน-ปี) */
export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/** 04-09-2026 14:30 */
export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const PAWN_STATUS_LABEL: Record<PawnStatus, string> = {
  ACTIVE: "จำนำอยู่",
  REDEEMED: "ไถ่ถอนแล้ว",
  FORFEITED: "หลุดจำนำ",
  SOLD: "ขายแล้ว",
};

export const PAWN_STATUS_TONE: Record<PawnStatus, BadgeTone> = {
  ACTIVE: "teal", // อยู่ระหว่างสัญญา = สถานะหลัก (teal)
  REDEEMED: "sky", // ไถ่ถอนแล้ว = ข้อมูล/สำเร็จ (sky)
  FORFEITED: "coral", // หลุดจำนำ = ต้องจัดการ (coral)
  SOLD: "gray", // ขายแล้ว = จบ
};

type BadgeTone = "gray" | "teal" | "gold" | "coral" | "green" | "sky" | "red";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  QR: "QR / PromptPay",
  CARD: "บัตร",
  TRANSFER: "โอนเงิน",
};

/** ป้ายชื่อหมวดรายจ่าย */
export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  PAWN_PRINCIPAL: "จ่ายเงินต้นรับจำนำ",
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "QR",
  "CARD",
  "TRANSFER",
];
