import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ExpensesClient, type ExpenseRow } from "./expenses-client";

export const metadata = { title: "รายจ่าย — ร้านรับจำนำ POS" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requireAuth();

  const expenses = await db.expense.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      contract: { select: { contractNumber: true, itemName: true } },
    },
  });

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    description: e.description,
    createdAt: e.createdAt.toISOString(),
    contractNumber: e.contract?.contractNumber ?? null,
    itemName: e.contract?.itemName ?? null,
    contractId: e.contractId ?? null,
  }));

  return <ExpensesClient expenses={rows} />;
}
