import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Button } from "@/components/ui";
import { CustomerSearch } from "./customer-search";

export const metadata = { title: "ลูกค้า — ร้านรับจำนำ POS" };

export default async function CustomersPage() {
  await requireAuth();

  const customers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { pawnContracts: { select: { status: true } } },
  });

  const total = customers.length;
  const withActive = customers.filter((c) =>
    c.pawnContracts.some((pc) => pc.status === "ACTIVE")
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">ลูกค้า</h1>
          <p className="text-sm text-zinc-500">
            ทั้งหมด {total} คน · มีสัญญา active อยู่ {withActive} คน
          </p>
        </div>
        <Link href="/pawn/new">
          <Button>
            <Plus className="h-4 w-4" /> รับจำนำใหม่
          </Button>
        </Link>
      </div>

      <CustomerSearch
        customers={customers.map((c) => ({
          id: c.id,
          nationalId: c.nationalId,
          fullName: c.fullName,
          phone: c.phone,
          createdAt: c.createdAt.toISOString(),
          contractCount: c.pawnContracts.length,
          activeCount: c.pawnContracts.filter(
            (pc) => pc.status === "ACTIVE"
          ).length,
        }))}
      />
    </div>
  );
}
