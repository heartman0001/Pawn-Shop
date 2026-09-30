import type { ManualIncomeCategory, PawnStatus, PaymentMethod } from "@prisma/client";

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
export function formatDateOnly(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDate(date);
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

/** หมวดของรายรับที่บันทึกเอง (เก็บใน ManualIncome.category) */
export const INCOME_CATEGORIES = [
  "REPAIR",
  "SERVICE",
  "COMMISSION",
  "OTHER",
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const INCOME_CATEGORY_LABEL: Record<IncomeCategory, string> = {
  REPAIR: "ค่าซ่อม",
  SERVICE: "ค่าบริการ",
  COMMISSION: "คอมมิชชั่น",
  OTHER: "อื่นๆ",
};

export const MANUAL_INCOME_CATEGORY_LABEL: Record<ManualIncomeCategory, string> = {
  REPAIR: "ค่าซ่อม",
  SERVICE: "ค่าบริการ",
  COMMISSION: "คอมมิชชั่น",
  OTHER: "อื่นๆ",
};

export const MANUAL_INCOME_CATEGORY_TONE: Record<ManualIncomeCategory, BadgeTone> = {
  REPAIR: "teal",
  SERVICE: "sky",
  COMMISSION: "gold",
  OTHER: "green",
};

export const EXPENSE_CATEGORIES = [
  "PAWN_PRINCIPAL",
  "REPAIR_COST",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Record<string, string> — Expense.category เก็บเป็น string ใน DB จึง index ด้วย string ได้
export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  PAWN_PRINCIPAL: "เงินต้นรับจำนำ",
  REPAIR_COST: "ต้นทุนค่าซ่อม",
  OTHER: "อื่นๆ",
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "QR",
  "CARD",
  "TRANSFER",
];
