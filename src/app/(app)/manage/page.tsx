import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ManageClient } from "./manage-client";

export const metadata = { title: "จัดการข้อมูล — ร้านรับจำนำ POS" };

export default async function ManagePage() {
  await requireAuth();

  const [customers, contracts] = await Promise.all([
    db.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { _count: { select: { pawnContracts: true } } },
    }),
    db.pawnContract.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { customer: { select: { fullName: true, phone: true } } },
    }),
  ]);

  return (
    <ManageClient
      customers={customers.map((c) => ({
        id: c.id,
        nationalId: c.nationalId,
        fullName: c.fullName,
        phone: c.phone,
        contractCount: c._count.pawnContracts,
        createdAt: c.createdAt.toISOString(),
      }))}
      contracts={contracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        itemName: c.itemName,
        serialNumber: c.serialNumber,
        storageBox: c.storageBox,
        principalAmount: c.principalAmount,
        interestRatePercent: c.interestRatePercent,
        status: c.status,
        image: c.image,
        customerId: c.customerId,
        customerName: c.customer.fullName,
        customerPhone: c.customer.phone,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
