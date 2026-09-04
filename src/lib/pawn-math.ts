/** อายุสัญญาแบบ fix = ทุกๆ 10 วัน (ทั้งตอนเปิดสัญญาและต่อดอกเบี้ย) */
export const PAWN_TERM_DAYS = 10;

/** แปลง "2026-09-04" → Date ตามเวลาท้องถิ่น */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * ดอกเบี้ย 1 งวด (10 วัน) = เงินต้น × (อัตรา% ต่อ 10 วัน) ÷ 100 — ปัดเป็นจำนวนเต็มบาท
 * ใช้ร่วมกันทั้ง Server Action และหน้าจอแสดงตัวอย่างก่อนบันทึก
 */
export function calcPeriodInterest(
  principalAmount: number,
  interestRatePercent: number
): number {
  return Math.round((principalAmount * interestRatePercent) / 100);
}

/** จำนวนรอบ (10 วัน) ที่เกินกำหนดไปแล้ว — 0 ถ้ายังไม่เกินกำหนด */
export function calcOverdueRounds(dueDate: Date, at: Date): number {
  const overdueDays = Math.floor(
    (at.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (overdueDays <= 0) return 0;
  // นับรอบที่เริ่มไปแล้ว (เกิน 1 วันก็ถือว่าขึ้นรอบใหม่)
  return Math.ceil(overdueDays / PAWN_TERM_DAYS);
}

/** ดอกเบี้ยค้างชำระกรณีไถ่ถอน (ดอกเบี้ยต่องวด × จำนวนรอบที่เกินกำหนด) */
export function calcOverdueInterest(
  principalAmount: number,
  interestRatePercent: number,
  dueDate: Date,
  at: Date
): number {
  return (
    calcOverdueRounds(dueDate, at) *
    calcPeriodInterest(principalAmount, interestRatePercent)
  );
}
