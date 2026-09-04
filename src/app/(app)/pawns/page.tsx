import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Button } from "@/components/ui";
import type { PawnContractDto } from "@/lib/dto";
import { PawnContractsClient } from "./contracts-client";

export const metadata = { title: "รับจำนำ — ร้านรับจำนำ POS" };

export default async function PawnsPage() {
  await requireAuth();

  const contracts = await db.pawnContract.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { customer: true },
  });

  const dtos: PawnContractDto[] = contracts.map((c) => ({
    id: c.id,
    contractNumber: c.contractNumber,
    itemName: c.itemName,
    serialNumber: c.serialNumber,
    storageBox: c.storageBox,
    principalAmount: c.principalAmount,
    interestRatePercent: c.interestRatePercent,
    customerName: c.customer.fullName,
    customerPhone: c.customer.phone,
    image: c.image,
    startDate: c.startDate.toISOString(),
    dueDate: c.dueDate.toISOString(),
    status: c.status,
    renewalCount: c.renewalCount,
    lastRenewedAt: c.lastRenewedAt?.toISOString() ?? null,
    forfeitPrice: c.forfeitPrice,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">รับจำนำ</h1>
          <p className="text-sm text-zinc-500">
            สัญญาจำนำทั้งหมด — ต่อดอกเบี้ย / ตัดหลุด / ไถ่ถอน
          </p>
        </div>
        <Link href="/pawn/new">
          <Button>
            <Plus className="h-4 w-4" /> สัญญาใหม่
          </Button>
        </Link>
      </div>

      <PawnContractsClient contracts={dtos} />
    </div>
  );
}
