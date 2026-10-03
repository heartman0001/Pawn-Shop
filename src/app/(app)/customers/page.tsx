import Link from "next/link";
import { cookies } from "next/headers";
import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { PAGE_SIZE_COOKIE, parsePageSize } from "@/lib/page-size";
import { Button } from "@/components/ui";
import { CustomerSearch } from "./customer-search";

export const metadata = { title: "ลูกค้า — ร้านรับจำนำ POS" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAuth();

  const { q } = await searchParams;

  // จำนวนต่อหน้า: อ่านจาก cookie ร่วมกับหน้าอื่น
  const cookieStore = await cookies();
  const initialPageSize = parsePageSize(
    cookieStore.get(PAGE_SIZE_COOKIE)?.value
  );

  const customers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      pawnContracts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          contractNumber: true,
          itemName: true,
          image: true,
          serialNumber: true,
          storageBox: true,
          principalAmount: true,
          interestRatePercent: true,
          status: true,
          startDate: true,
          dueDate: true,
          createdAt: true,
        },
      },
    },
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
      </div>
      <Link href="/pawn/new">
          <Button className="mb-4">
            <Plus className="h-4 w-4" /> รับจำนำใหม่
          </Button>
        </Link>

      <CustomerSearch
        initialQuery={q ?? ""}
        initialPageSize={initialPageSize}
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
          contracts: c.pawnContracts.map((pc) => ({
            id: pc.id,
            contractNumber: pc.contractNumber,
            itemName: pc.itemName,
            image: pc.image,
            serialNumber: pc.serialNumber,
            storageBox: pc.storageBox,
            principalAmount: pc.principalAmount,
            interestRatePercent: pc.interestRatePercent,
            status: pc.status,
            startDate: pc.startDate.toISOString(),
            dueDate: pc.dueDate.toISOString(),
            createdAt: pc.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
