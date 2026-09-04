import type { Prisma } from "@prisma/client";

const pad = (n: number, len = 4) => String(n).padStart(len, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;

/**
 * สร้างเลขสัญญา / ใบเสร็จแบบ PC-20260904-001 (ต่อจากรายการของวันนั้น)
 * เรียกภายใน transaction เพื่อให้เลขไม่ซ้ำกับตัวที่เพิ่งสร้าง
 */
export async function nextSequentialNumber(
  tx: Prisma.TransactionClient,
  prefix: "PC" | "R",
  date = new Date()
): Promise<string> {
  const todayPrefix = `${prefix}-${ymd(date)}-`;
  const count = await tx.$queryRaw<{ c: number }[]>`
    SELECT COUNT(*) as c FROM (
      SELECT contractNumber AS n FROM "PawnContract" WHERE contractNumber LIKE ${`${todayPrefix}%`}
      UNION ALL
      SELECT receiptNumber AS n FROM "SaleOrder" WHERE receiptNumber LIKE ${`${todayPrefix}%`}
    )
  `;
  const seq = Number(count[0]?.c ?? 0) + 1;
  return `${todayPrefix}${pad(seq, 3)}`;
}
