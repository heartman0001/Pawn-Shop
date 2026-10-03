import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { PAGE_SIZE_COOKIE, parsePageSize } from "@/lib/page-size";
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

  // จำนวนต่อหน้า: อ่านจาก cookie ร่วมกับหน้าอื่น
  const cookieStore = await cookies();
  const initialPageSize = parsePageSize(
    cookieStore.get(PAGE_SIZE_COOKIE)?.value
  );

  return (
    <div className="space-y-6">
      <IncomesClient
        incomes={incomeRows}
        initialPageSize={initialPageSize}
      />
    </div>
  );
}
