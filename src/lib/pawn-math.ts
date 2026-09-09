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
 * ดอกเบี้ย 1 งวด = เงินต้น × (อัตรา% ต่องวด) ÷ 100 — ปัดเป็นจำนวนเต็มบาท
 * ใช้ร่วมกันทั้ง Server Action และหน้าจอแสดงตัวอย่างก่อนบันทึก
 */
export function calcPeriodInterest(
  principalAmount: number,
  interestRatePercent: number
): number {
  return Math.round((principalAmount * interestRatePercent) / 100);
}

/**
 * จำนวน "วันปฏิทิน" ระหว่างสองวัน — ตัดเศษเวลา (ชั่วโมง/นาที) ออก
 * ตัดทั้งสองฝั่งเป็นเที่ยงคืนท้องถิ่นก่อนคำนวณ
 * เช่น รับจำนำ 14:30 ไถ่ 11:00 วันถัดไป = 1 วัน (ไม่ใช่ 0.85)
 */
export function diffCalendarDays(from: Date, to: Date): number {
  const a = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  ).getTime();
  const b = new Date(
    to.getFullYear(),
    to.getMonth(),
    to.getDate()
  ).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export interface RedemptionCalc {
  /** จำนวนวันที่จำนำมาแล้ว (แบบวันปฏิทิน, น้อยสุด 0 — ไถ่วันเดียวกัน = 0) */
  daysElapsed: number;
  /** งวดทั้งหมดตามอายุสัญญา = max(1, ceil(daysElapsed / cycleDays)) */
  totalCycles: number;
  /** งวดที่ชำระไปแล้วตอน "ต่อดอกเบี้ย" (renewalCount) */
  paidCycles: number;
  /** งวดที่ต้องชำระตอนไถ่ = max(0, totalCycles − paidCycles) */
  dueCycles: number;
  /** ดอกเบี้ยต่องวด (บาท, ปัดเป็นจำนวนเต็ม) */
  interestPerCycle: number;
  /** ดอกเบี้ยรวมที่ต้องชำระ (บาท) = interestPerCycle × dueCycles */
  totalInterest: number;
  /** ยอดไถ่ถอนรวม (บาท) = เงินต้น + ดอกเบี้ยรวม */
  totalAmount: number;
}

/**
 * คำนวณยอดเงินไถ่ถอนแบบ "เหมาเป็นงวด (Fixed Cycle)":
 *
 * - จำนวนงวด = max(1, ceil(daysElapsed / cycleDays)) — อยู่งวดไหนก็จ่ายเต็มงวด
 *   (ไถ่วันที่ 1-10 = 1 งวด, วันที่ 11-20 = 2 งวด, ...)
 * - ไถ่วันเดียวกับวันรับจำนำ (daysElapsed = 0) นับเป็น 1 งวด
 * - ดอกเบี้ยต่องวด = เงินต้น × (rate / 100) ปัดเป็นจำนวนเต็มบาท
 * - งวดที่จ่ายไปแล้วตอนต่อดอก (paidCycles) ถูกหักออก เพื่อไม่เก็บซ้ำ
 *   → สัญญาที่ไม่เคยต่อดอก (paidCycles = 0) จะคิดขั้นต่ำ 1 งวดเสมอ
 */
export function calcRedemption({
  principal,
  interestRatePercent,
  cycleDays,
  startDate,
  redemptionDate,
  paidCycles = 0,
}: {
  principal: number;
  interestRatePercent: number;
  cycleDays: number;
  startDate: Date;
  redemptionDate: Date;
  /** จำนวนงวดที่ชำระไปแล้วตอนต่อดอกเบี้ย (default 0) */
  paidCycles?: number;
}): RedemptionCalc {
  const safeCycleDays = Math.max(1, cycleDays);
  const daysElapsed = Math.max(0, diffCalendarDays(startDate, redemptionDate));

  const totalCycles = Math.max(1, Math.ceil(daysElapsed / safeCycleDays));
  const dueCycles = Math.max(0, totalCycles - Math.max(0, paidCycles));

  const interestPerCycle = calcPeriodInterest(principal, interestRatePercent);
  const totalInterest = interestPerCycle * dueCycles;
  const totalAmount = principal + totalInterest;

  return {
    daysElapsed,
    totalCycles,
    paidCycles: Math.max(0, paidCycles),
    dueCycles,
    interestPerCycle,
    totalInterest,
    totalAmount,
  };
}
