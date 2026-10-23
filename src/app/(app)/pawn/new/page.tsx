import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { NewPawnForm } from "./new-pawn-form";

export const metadata = { title: "สัญญาจำนำใหม่ — ร้านรับจำนำ POS" };

export default async function NewPawnPage() {
  await requireAuth();

  const customers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, nationalId: true, fullName: true, phone: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        back={{ href: "/pawns", label: "กลับหน้ารายการสัญญา" }}
        title="สัญญาจำนำใหม่"
        description="ค้นหา/สร้างลูกค้า และบันทึกสัญญาในหน้าเดียว"
      />

      <NewPawnForm customers={customers} />
    </div>
  );
}
