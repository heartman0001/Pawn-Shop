import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { IncomesClient, type IncomeRow } from "./incomes-client";

export const metadata = { title: "รายรับ — ร้านรับจำนำ POS" };

export const dynamic = "force-dynamic";

export default async function IncomesPage() {
  await requireAuth();

  // รายรับที่บันทึกเอง (เช่น ค่าซ่อมมือถือ) — เก็บใน Expense ด้วย kind = INCOME
  const incomes = await db.expense.findMany({
    where: { kind: "INCOME" },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows: IncomeRow[] = incomes.map((e) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    description: e.description,
    createdAt: e.createdAt.toISOString(),
  }));

  return <IncomesClient incomes={rows} />;
}
