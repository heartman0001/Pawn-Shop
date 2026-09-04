import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
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
      <div>
        <Link
          href="/pawns"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" /> กลับหน้ารายการสัญญา
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">สัญญาจำนำใหม่</h1>
        <p className="text-sm text-zinc-500">
          ค้นหา/สร้างลูกค้า และบันทึกสัญญาในหน้าเดียว
        </p>
      </div>

      <NewPawnForm customers={customers} />
    </div>
  );
}
