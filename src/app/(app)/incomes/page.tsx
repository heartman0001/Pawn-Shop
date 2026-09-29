import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { IncomesClient, type IncomeRow } from "./incomes-client";

export const metadata = { title: "รายรับ — ร้านรับจำนำ POS" };

export const dynamic = "force-dynamic";

export default async function IncomesPage() {
  await requireAuth();

  const manualIncomes = await db.manualIncome.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const incomeRows: IncomeRow[] = manualIncomes.map((e) => ({
    id: e.id,
    amount: e.amount,
    costPrice: e.costPrice,
    category: e.category,
    description: e.description,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <IncomesClient incomes={incomeRows} />
    </div>
  );
}
