import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Gavel,
  HandCoins,
  Package,
  Phone,
  User,
  Wallet,
} from "lucide-react";
import { ContractActions } from "./contract-actions";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  formatBaht,
  formatDate,
  formatDateTime,
  PAWN_STATUS_LABEL,
  PAWN_STATUS_TONE,
  PAYMENT_METHOD_LABEL,
} from "@/lib/format";
import { calcRedemption, PAWN_TERM_DAYS } from "@/lib/pawn-math";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "รายละเอียดสัญญาจำนำ — ร้านรับจำนำ POS" };

export default async function PawnContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;

  const contract = await db.pawnContract.findUnique({
    where: { id },
    include: {
      customer: true,
      renewals: { orderBy: { roundNumber: "asc" } },
      redemption: true,
      expense: true,
      saleItems: { include: { saleOrder: true } },
    },
  });

  if (!contract) notFound();

  const overdue =
    contract.status === "ACTIVE" && contract.dueDate < new Date();

  // ยอดไถ่ถอนตามเวลาปัจจุบัน (เฉพาะสัญญาที่ยัง active)
  const redemptionNow =
    contract.status === "ACTIVE"
      ? calcRedemption({
          principal: contract.principalAmount,
          interestRatePercent: contract.interestRatePercent,
          cycleDays: PAWN_TERM_DAYS,
          startDate: contract.startDate,
          redemptionDate: new Date(),
          paidCycles: contract.renewalCount,
        })
      : null;

  const soldItem = contract.saleItems[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div>
        <Link
          href="/pawns"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" /> กลับหน้ารายการสัญญา
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-primary-dark">
              <HandCoins className="h-6 w-6 text-primary" />
              {contract.contractNumber}
            </h1>
            <p className="text-sm text-zinc-500">
              เปิดสัญญาเมื่อ {formatDateTime(contract.createdAt)}
            </p>
          </div>
          <Badge
            tone={overdue ? "coral" : PAWN_STATUS_TONE[contract.status]}
            className="px-3 py-1.5 text-sm"
          >
            {PAWN_STATUS_LABEL[contract.status]}
            {overdue ? " · เลยกำหนด" : ""}
          </Badge>
        </div>
      </div>

      {/* สิ่งของ */}
      <Card className="overflow-hidden">
        <SectionTitle icon={<Package className="h-4 w-4" />}>
          สิ่งของที่รับจำนำ
        </SectionTitle>
        <div className="flex flex-wrap items-start gap-4 p-5">
          {contract.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- รูปอัปโหลดจากเครื่อง/Supabase public URL
            <img
              src={contract.image}
              alt={contract.itemName}
              className="h-28 w-28 shrink-0 rounded-2xl border-2 border-primary/15 object-cover"
            />
          ) : (
            <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary/50">
              <Package className="h-8 w-8" />
            </span>
          )}
          <dl className="min-w-[220px] flex-1 space-y-2 text-sm">
            <InfoLine label="รายละเอียด">{contract.itemName}</InfoLine>
            <InfoLine label="หมายเลขซีเรียล">
              {contract.serialNumber || "—"}
            </InfoLine>
            <InfoLine label="จุดเก็บ">{contract.storageBox || "—"}</InfoLine>
          </dl>
        </div>
      </Card>

      {/* ลูกค้า */}
      <Card className="overflow-hidden">
        <SectionTitle icon={<User className="h-4 w-4" />}>
          ข้อมูลลูกค้า
        </SectionTitle>
        <dl className="space-y-2 p-5 text-sm">
          <InfoLine label="ชื่อ-นามสกุล">{contract.customer.fullName}</InfoLine>
          <InfoLine label="เลขบัตรประชาชน">
            {contract.customer.nationalId}
          </InfoLine>
          <InfoLine label="โทรศัพท์">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-zinc-400" />
              {contract.customer.phone || "—"}
            </span>
          </InfoLine>
        </dl>
        <div className="border-t-2 border-dashed border-primary/20 px-5 py-3">
          <Link
            href={`/customers?q=${encodeURIComponent(
              contract.customer.nationalId
            )}`}
            className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            ดูสัญญาอื่นของลูกค้าคนนี้
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>

      {/* การเงิน */}
      <Card className="overflow-hidden">
        <SectionTitle icon={<Wallet className="h-4 w-4" />}>
          ข้อมูลสัญญา
        </SectionTitle>
        <dl className="grid gap-2 p-5 text-sm sm:grid-cols-2">
          <InfoLine label="เงินต้น">{formatBaht(contract.principalAmount)}</InfoLine>
          <InfoLine label="ดอกเบี้ย">
            {contract.interestRatePercent}% / {PAWN_TERM_DAYS} วัน
          </InfoLine>
          <InfoLine label="วันเริ่มสัญญา">
            {formatDate(contract.startDate)}
          </InfoLine>
          <InfoLine label="ครบกำหนด">{formatDate(contract.dueDate)}</InfoLine>
          <InfoLine label="ต่อดอกแล้ว">{contract.renewalCount} ครั้ง</InfoLine>
          <InfoLine label="ต่อดอกล่าสุด">
            {contract.lastRenewedAt
              ? formatDateTime(contract.lastRenewedAt)
              : "—"}
          </InfoLine>
        </dl>

        {/* ยอดไถ่ถอนปัจจุบัน (เฉพาะ active) */}
        {redemptionNow && (
          <div className="border-t-2 border-dashed border-primary/20 bg-cream px-5 py-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary/70">
              <CalendarClock className="h-4 w-4" />
              ยอดไถ่ถอน ณ วันนี้
            </p>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <InfoLine label="ผ่านมา">
                {redemptionNow.daysElapsed} วัน
              </InfoLine>
              <InfoLine label={`ดอกเบี้ยค้าง (${redemptionNow.dueCycles} รอบ)`}>
                {formatBaht(redemptionNow.totalInterest)}
              </InfoLine>
              <InfoLine label="ยอดที่ต้องชำระ">
                <b className="text-accent-dark">
                  {formatBaht(redemptionNow.totalAmount)}
                </b>
              </InfoLine>
            </div>
          </div>
        )}
      </Card>

      {/* ดำเนินการ (เฉพาะสัญญาที่ยัง active) */}
      {contract.status === "ACTIVE" && (
        <Card className="overflow-hidden">
          <SectionTitle icon={<Gavel className="h-4 w-4" />}>
            ดำเนินการกับสัญญา
          </SectionTitle>
          <ContractActions
            contract={{
              id: contract.id,
              contractNumber: contract.contractNumber,
              itemName: contract.itemName,
              serialNumber: contract.serialNumber,
              storageBox: contract.storageBox,
              principalAmount: contract.principalAmount,
              interestRatePercent: contract.interestRatePercent,
              customerName: contract.customer.fullName,
              customerPhone: contract.customer.phone,
              image: contract.image,
              startDate: contract.startDate.toISOString(),
              dueDate: contract.dueDate.toISOString(),
              status: contract.status,
              renewalCount: contract.renewalCount,
              lastRenewedAt: contract.lastRenewedAt?.toISOString() ?? null,
              forfeitPrice: contract.forfeitPrice,
              createdAt: contract.createdAt.toISOString(),
            }}
          />
        </Card>
      )}

      {/* ไถ่ถอนแล้ว */}
      {contract.redemption && (
        <Card className="overflow-hidden">
          <SectionTitle icon={<HandCoins className="h-4 w-4" />}>
            ประวัติการไถ่ถอน
          </SectionTitle>
          <dl className="space-y-2 p-5 text-sm">
            <InfoLine label="วันที่ไถ่ถอน">
              {formatDateTime(contract.redemption.createdAt)}
            </InfoLine>
            <InfoLine label="เงินต้น">
              {formatBaht(contract.redemption.principal)}
            </InfoLine>
            <InfoLine label="ดอกเบี้ย">
              {formatBaht(contract.redemption.interest)}
            </InfoLine>
            <InfoLine label="ยอดรวม">
              <b>{formatBaht(contract.redemption.total)}</b>
            </InfoLine>
            <InfoLine label="วิธีชำระ">
              {PAYMENT_METHOD_LABEL[contract.redemption.paymentMethod]}
            </InfoLine>
            {contract.redemption.receivedAmount !== null && (
              <InfoLine label="รับเงิน">
                {formatBaht(contract.redemption.receivedAmount)}
              </InfoLine>
            )}
            {contract.redemption.changeAmount !== null && (
              <InfoLine label="เงินทอน">
                {formatBaht(contract.redemption.changeAmount)}
              </InfoLine>
            )}
          </dl>
        </Card>
      )}

      {/* หลุดจำนำ / ขายแล้ว */}
      {(contract.status === "FORFEITED" || contract.status === "SOLD") && (
        <Card className="overflow-hidden">
          <SectionTitle icon={<Package className="h-4 w-4" />}>
            ข้อมูลหลุดจำนำ / การขาย
          </SectionTitle>
          <dl className="space-y-2 p-5 text-sm">
            <InfoLine label="ราคาตั้งขาย">
              {contract.forfeitPrice !== null
                ? formatBaht(contract.forfeitPrice)
                : "—"}
            </InfoLine>
            <InfoLine label="วันที่ตัดหลุด">
              {contract.forfeitedAt
                ? formatDateTime(contract.forfeitedAt)
                : "—"}
            </InfoLine>
            {soldItem && (
              <>
                <InfoLine label="บิลขาย">
                  {soldItem.saleOrder.receiptNumber}
                </InfoLine>
                <InfoLine label="วันที่ขาย">
                  {formatDateTime(soldItem.saleOrder.createdAt)}
                </InfoLine>
                <InfoLine label="ราคาที่ขาย">
                  {formatBaht(soldItem.unitPrice * soldItem.quantity)}
                </InfoLine>
                <InfoLine label="วิธีชำระ">
                  {PAYMENT_METHOD_LABEL[soldItem.saleOrder.paymentMethod]}
                </InfoLine>
              </>
            )}
          </dl>
        </Card>
      )}

      {/* ประวัติการต่อดอก */}
      {contract.renewals.length > 0 && (
        <Card className="overflow-hidden">
          <SectionTitle icon={<CalendarClock className="h-4 w-4" />}>
            ประวัติการต่อดอกเบี้ย ({contract.renewals.length} ครั้ง)
          </SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                  <th className="px-4 py-2.5 font-medium">รอบที่</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    ดอกเบี้ย
                  </th>
                  <th className="px-4 py-2.5 font-medium">ครบกำหนดเดิม</th>
                  <th className="px-4 py-2.5 font-medium">ครบกำหนดใหม่</th>
                  <th className="px-4 py-2.5 font-medium">ชำระเมื่อ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {contract.renewals.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 font-bold text-zinc-700">
                      {r.roundNumber}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-700">
                      {formatBaht(r.interestAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">
                      {formatDate(r.dueDateBefore)}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">
                      {formatDate(r.dueDateAfter)}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">
                      {formatDateTime(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* รายการเงินต้นที่จ่ายออก */}
      {contract.expense && (
        <Card className="overflow-hidden">
          <SectionTitle icon={<Wallet className="h-4 w-4" />}>
            รายการเงินออก
          </SectionTitle>
          <dl className="space-y-2 p-5 text-sm">
            <InfoLine label="รายละเอียด">
              {contract.expense.description}
            </InfoLine>
            <InfoLine label="จำนวนเงิน">
              {formatBaht(contract.expense.amount)}
            </InfoLine>
            <InfoLine label="บันทึกเมื่อ">
              {formatDateTime(contract.expense.createdAt)}
            </InfoLine>
          </dl>
        </Card>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-dashed border-primary/25 px-5 py-3">
      <span className="text-primary">{icon}</span>
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-dark">
        {children}
      </h2>
    </div>
  );
}

function InfoLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-right text-zinc-700">{children}</dd>
    </div>
  );
}
