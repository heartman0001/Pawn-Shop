import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { addDays, parseDateOnly } from "@/lib/pawn-math";
import {
  EXPENSE_CATEGORY_LABEL,
  formatBaht,
  formatDate,
  formatDateTime,
  PAYMENT_METHOD_LABEL,
} from "@/lib/format";
import type { PaymentMethod } from "@prisma/client";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { cn } from "@/components/ui";
import { SaleItemsAccordion, type SaleRow } from "./sale-items-accordion";
import { MANUAL_INCOME_CATEGORY_LABEL } from "@/lib/format";

export const metadata = { title: "รายงานรายรับ — ร้านรับจำนำ POS" };

type ReportSearchParams = {
  from?: string;
  to?: string;
  all?: string;
  // ตัวกรองประเภทรายการในรายการรวม: all | pos | redeem | renew | income | expense
  type?: string;
  // หน้าของรายการรวม (20 แถว/หน้า)
  p?: string;
};

// จำนวนแถวต่อหน้าของรายการรวม
const PAGE_SIZE = 20;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams>;
}) {
  await requireAuth();

  const sp = await searchParams;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ช่วงวันที่ที่เลือก (default = เดือนนี้)
  const isAll = sp.all === "1";
  let from = monthStart;
  let to = today;
  if (isAll) {
    from = new Date(2000, 0, 1);
  } else {
    if (sp.from && ISO_DATE.test(sp.from)) from = parseDateOnly(sp.from);
    if (sp.to && ISO_DATE.test(sp.to)) to = parseDateOnly(sp.to);
    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }
  }
  const range = { gte: from, lt: addDays(to, 1) };  // เงื่อนไข active สำหรับปุ่มลัด
  const selFrom = toISODate(from);
  const selTo = toISODate(to);
  const presetLink = (query: string) => `/reports?${query}`;

  // ------------------------------------------------------------------
  // ตัวกรองประเภท + pagination ของรายการรวม — state อยู่ใน URL
  // ------------------------------------------------------------------
  const activeType: ReportType =
    REPORT_TYPE_OPTIONS.find((opt) => opt.value === sp.type)?.value ?? "all";
  const requestedPage = Number(sp.p);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const reportHref = (type: ReportType, targetPage = 1) => {
    const q = new URLSearchParams();
    // คงค่าตัวกรองช่วงวันที่ไว้
    if (isAll) q.set("all", "1");
    else {
      if (sp.from) q.set("from", sp.from);
      if (sp.to) q.set("to", sp.to);
    }
    if (type !== "all") q.set("type", type);
    if (targetPage > 1) q.set("p", String(targetPage));
    const qs = q.toString();
    return qs ? `/reports?${qs}` : "/reports";
  };

  // ------------------------------------------------------------------
  // ดึงข้อมูล 3 ช่องทางรายรับ
  // ------------------------------------------------------------------
  const [sales, redeems, renewals, expenses, manualIncomes] = await Promise.all([
    db.saleOrder.findMany({
      where: { createdAt: range },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            productId: true,
            pawnContractId: true,
            quantity: true,
            unitPrice: true,
            product: { select: { name: true } },
            pawnContract: { select: { itemName: true } },
          },
        },
      },
    }),
    db.pawnRedemption.findMany({
      where: { createdAt: range },
      orderBy: { createdAt: "desc" },
      include: {
        contract: { select: { contractNumber: true, itemName: true } },
      },
    }),
    db.pawnRenewal.findMany({
      where: { createdAt: range },
      orderBy: { createdAt: "desc" },
      include: {
        contract: { select: { contractNumber: true, itemName: true } },
      },
    }),
    // รายจ่ายเท่านั้น (ไม่รวมรายรับที่บันทึกเอง — กันนับซ้ำในเงินคงเหลือ)
    db.expense.findMany({
      where: { createdAt: range, kind: "EXPENSE" },
      orderBy: { createdAt: "desc" },
      include: {
        contract: { select: { contractNumber: true, itemName: true } },
      },
    }),
    // รายรับที่บันทึกเอง (เช่น ค่าซ่อมมือถือ) — เก็บใน ManualIncome
    db.manualIncome.findMany({
      where: { createdAt: range },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // POS: แยกยอดขายสินค้าทั่วไป vs ของหลุดจำนำ (จาก SaleItem)
  let posTotal = 0;
  let posRetailTotal = 0;
  let posPawnTotal = 0;
  for (const s of sales) {
    for (const it of s.items) {
      const amt = it.unitPrice * it.quantity;
      if (it.productId) posRetailTotal += amt;
      else posPawnTotal += amt;
    }
    posTotal += s.totalAmount;
  }

  let redeemTotal = 0;
  let redeemPrincipal = 0;
  let redeemInterest = 0;
  for (const r of redeems) {
    redeemTotal += r.total;
    redeemPrincipal += r.principal;
    redeemInterest += r.interest;
  }

  let renewTotal = 0;
  for (const r of renewals) renewTotal += r.interestAmount;

  let expenseTotal = 0;
  for (const e of expenses) expenseTotal += e.amount;

  let manualIncomeTotal = 0;
  let manualIncomeCostTotal = 0;
  for (const e of manualIncomes) {
    manualIncomeTotal += e.amount;
    manualIncomeCostTotal += e.costPrice;
  }

  const grandTotal = posTotal + redeemTotal + renewTotal + manualIncomeTotal;
  const grossProfitFromManualIncomes = manualIncomeTotal - manualIncomeCostTotal;
  // เงินคงเหลือ (สุทธิ) = รายรับทั้งหมด − ต้นทุนของรายรับที่บันทึกเอง − รายจ่ายที่บันทึกไว้
  // ต้นทุน (costPrice) ของ ManualIncome ไม่ได้ถูกสร้างเป็น Expense ตอนบันทึก
  // จึงต้องหักที่นี่ ไม่งั้นยอดสุทธิจะสูงเกินจริงเท่ากับต้นทุนรวมของรายรับอื่น
  const netTotal = grandTotal - manualIncomeCostTotal - expenseTotal;
  // ใช้สตริงชุดเดียวกันทั้งยอดใหญ่และสมการ กันเครื่องหมายลบแสดงไม่ตรงกัน
  const netTotalLabel =
    netTotal < 0 ? `−${formatBaht(Math.abs(netTotal))}` : formatBaht(netTotal);

  // ------------------------------------------------------------------
  // รวมทุกประเภทธุรกรรมเป็นรายการเดียว เรียงตามเวลา
  // ยอดรวมด้านบนยังคิดจาก "ทั้งหมด" ไม่ใช่เฉพาะแถวที่แสดง
  // ------------------------------------------------------------------
  const records: ReportRecord[] = [
    ...sales.map<ReportRecord>((s) => ({
      id: `pos-${s.receiptNumber}`,
      kind: "pos",
      createdAt: s.createdAt,
      reference: s.receiptNumber,
      title: describeSale(s) || "ขายสินค้าหน้าร้าน",
      method: s.paymentMethod,
      amount: s.totalAmount,
      direction: "in",
      sale: s,
    })),
    ...redeems.map<ReportRecord>((r) => ({
      id: `redeem-${r.id}`,
      kind: "redeem",
      createdAt: r.createdAt,
      reference: r.contract.contractNumber,
      title: r.contract.itemName,
      detail: `เงินต้น ${formatBaht(r.principal)} · ดอกเบี้ย ${formatBaht(r.interest)}`,
      method: r.paymentMethod,
      amount: r.total,
      direction: "in",
    })),
    ...renewals.map<ReportRecord>((r) => ({
      id: `renew-${r.id}`,
      kind: "renew",
      createdAt: r.createdAt,
      reference: r.contract.contractNumber,
      title: r.contract.itemName,
      detail: `ต่อดอกเบี้ยครั้งที่ ${r.roundNumber}`,
      method: r.paymentMethod,
      amount: r.interestAmount,
      direction: "in",
    })),
    ...manualIncomes.map<ReportRecord>((r) => ({
      id: `income-${r.id}`,
      kind: "income",
      createdAt: r.createdAt,
      reference: MANUAL_INCOME_CATEGORY_LABEL[r.category] ?? r.category,
      title: r.description,
      detail: `ต้นทุน ${formatBaht(r.costPrice)} · กำไร ${formatBaht(r.amount - r.costPrice)}`,
      amount: r.amount,
      direction: "in",
    })),
    ...expenses.map<ReportRecord>((r) => ({
      id: `expense-${r.id}`,
      kind: "expense",
      createdAt: r.createdAt,
      reference:
        r.contract?.contractNumber ??
        EXPENSE_CATEGORY_LABEL[r.category] ??
        r.category,
      title: r.contract?.itemName ?? r.description,
      detail: r.contract ? r.description : undefined,
      amount: r.amount,
      direction: "out",
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const countByType: Record<ReportType, number> = {
    all: records.length,
    pos: sales.length,
    redeem: redeems.length,
    renew: renewals.length,
    income: manualIncomes.length,
    expense: expenses.length,
  };

  const filtered =
    activeType === "all" ? records : records.filter((r) => r.kind === activeType);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      <PageHeader
        title="รายงานรายรับ"
        description="เงินเข้าทุกช่องทาง — ขายหน้าร้าน · ไถ่ถอน · ต่อดอกเบี้ย · รายรับอื่น หักด้วยรายจ่ายที่บันทึกไว้"
      />

      {/* ตัวกรองช่วงวันที่ */}
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <div className="flex items-center gap-2 text-primary-dark">
          <CalendarRange className="h-5 w-5 text-primary" />
          <span className="text-sm font-extrabold">
            {isAll ? "ทั้งหมด" : `${formatDate(from)} — ${formatDate(to)}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "วันนี้", q: `from=${toISODate(today)}&to=${toISODate(today)}`, active: selFrom === toISODate(today) && selTo === toISODate(today) && !isAll },
            { label: "7 วันล่าสุด", q: `from=${toISODate(addDays(today, -6))}&to=${toISODate(today)}`, active: !isAll && selTo === toISODate(today) && selFrom === toISODate(addDays(today, -6)) },
            { label: "เดือนนี้", q: `from=${toISODate(monthStart)}&to=${toISODate(today)}`, active: !isAll && selFrom === toISODate(monthStart) && selTo === toISODate(today) },
            { label: "ทั้งหมด", q: "all=1", active: isAll },
          ].map((p) => (
            <Link
              key={p.label}
              href={presetLink(p.q)}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-bold transition-colors",
                p.active
                  ? "bg-primary-dark text-white shadow-card"
                  : "border-2 border-primary/20 bg-white text-zinc-700 hover:border-primary/40 hover:bg-primary/10 hover:text-primary-dark"
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form
          className="flex w-full flex-wrap items-end gap-2 xl:ml-auto xl:w-auto xl:flex-nowrap"
          action="/reports"
          method="get"
        >
          <label className="flex min-w-0 flex-1 basis-36 flex-col gap-1 text-xs font-semibold text-zinc-600 xl:flex-none">
            ตั้งแต่
            <Input
              type="date"
              name="from"
              defaultValue={isAll ? "" : selFrom}
              className="w-full sm:h-10 xl:w-40"
            />
          </label>
          <label className="flex min-w-0 flex-1 basis-36 flex-col gap-1 text-xs font-semibold text-zinc-600 xl:flex-none">
            ถึง
            <Input
              type="date"
              name="to"
              defaultValue={isAll ? "" : selTo}
              className="w-full sm:h-10 xl:w-40"
            />
          </label>
          <Button
            type="submit"
            variant="secondary"
            className="w-full sm:w-auto sm:h-10"
          >
            <Filter className="h-4 w-4" /> กรอง
          </Button>
        </form>
      </Card>

      {/* สรุปปิดยอด — ตัวเลขที่ต้องการคือบรรทัดปิดท้ายของการคำนวณที่มาของมันเอง */}
      <Card className="p-5">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-dark">
          สรุปปิดยอด
        </h2>
        <dl className="mt-2 text-sm">
          <LedgerRow
            label="ขายหน้าร้าน (POS)"
            sub={`${sales.length} บิล · ทั่วไป ${formatBaht(posRetailTotal)} · หลุดจำนำ ${formatBaht(posPawnTotal)}`}
            value={formatBaht(posTotal)}
          />
          <LedgerRow
            label="ไถ่ถอน"
            sub={`${redeems.length} ครั้ง · เงินต้นคืน ${formatBaht(redeemPrincipal)} · ดอกเบี้ย ${formatBaht(redeemInterest)}`}
            value={formatBaht(redeemTotal)}
          />
          <LedgerRow
            label="ต่อดอกเบี้ย"
            sub={`${renewals.length} ครั้ง`}
            value={formatBaht(renewTotal)}
          />
          <LedgerRow
            label="รายรับอื่นๆ"
            sub={
              manualIncomes.length > 0
                ? `${manualIncomes.length} รายการ · กำไร ${formatBaht(grossProfitFromManualIncomes)} · ต้นทุน ${formatBaht(manualIncomeCostTotal)}`
                : "ไม่มีรายการ"
            }
            value={formatBaht(manualIncomeTotal)}
          />
          <LedgerRow
            label="รวมรายรับ"
            value={formatBaht(grandTotal)}
            emphasis
          />
          {manualIncomeCostTotal > 0 && (
            <LedgerRow
              label="หักต้นทุนรายรับอื่น"
              sub="ต้นทุนของรายรับที่บันทึกเอง (ไม่ได้อยู่ในรายจ่าย)"
              value={`−${formatBaht(manualIncomeCostTotal)}`}
            />
          )}
          <LedgerRow
            label="หักรายจ่ายที่บันทึกไว้"
            sub={`${expenses.length} ครั้ง · เงินต้นรับจำนำ ค่าซ่อม และอื่นๆ`}
            value={`−${formatBaht(expenseTotal)}`}
          />
        </dl>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t-2 border-dashed border-primary/25 pt-4">
          <div>
            <p className="text-sm font-bold text-zinc-600">เงินคงเหลือ (สุทธิ)</p>
            <p className="mt-0.5 text-xs font-medium text-zinc-500">
              {netTotal < 0
                ? "ติดลบ — รายจ่ายมากกว่ารายรับในช่วงที่เลือก"
                : "เงินจริงที่เหลือในร้าน หลังหักเงินต้นรับจำนำและต้นทุน"}
            </p>
          </div>
          <p
            className={cn(
              "shrink-0 text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl",
              netTotal < 0 ? "text-error" : "text-zinc-900"
            )}
          >
            {netTotalLabel}
          </p>
        </div>
      </Card>

      {/* ===== รายการในช่วงที่เลือก (ทุกประเภท เรียงตามเวลา) ===== */}
      <Card className="overflow-hidden">
        <div className="border-b-2 border-dashed border-primary/25 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-dark">
              รายการในช่วงที่เลือก
            </h2>
            <span className="text-xs font-semibold text-zinc-600">
              {filtered.length} รายการ
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {REPORT_TYPE_OPTIONS.map((opt) => {
              const active = opt.value === activeType;
              return (
                <Link
                  key={opt.value}
                  href={reportHref(opt.value)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-bold transition-colors",
                    active
                      ? "bg-primary-dark text-white shadow-card"
                      : "border-2 border-primary/20 bg-white text-zinc-700 hover:border-primary/40 hover:bg-primary/10 hover:text-primary-dark"
                  )}
                >
                  {opt.label}
                  <span
                    className={cn(
                      "ml-1.5 text-xs font-semibold tabular-nums",
                      active ? "text-white" : "text-zinc-500"
                    )}
                  >
                    {countByType[opt.value]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-bold text-zinc-700">
              ไม่มีรายการในช่วงเวลานี้
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              ลองขยายช่วงวันที่ด้านบน หรือเปลี่ยนตัวกรองประเภท
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: ตารางเดียวทุกประเภท */}
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-primary/15 bg-primary/[0.04] text-left text-xs text-zinc-600">
                    <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">วัน/เวลา</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">เลขที่ / อ้างอิง</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">รายการ</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">ประเภท</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">ชำระ</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold uppercase tracking-wide">จำนวน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((record) => (
                    <ReportTableRow key={record.id} record={record} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: การ์ดต่อรายการ */}
            <div className="grid gap-3 p-3 sm:grid-cols-2 xl:hidden">
              {rows.map((record) => (
                <ReportMobileCard key={record.id} record={record} />
              ))}
            </div>
          </>
        )}

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          hrefFor={(p) => reportHref(activeType, p)}
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ส่วนประกอบย่อย
// ---------------------------------------------------------------------------

const REPORT_TYPE_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pos", label: "ขายหน้าร้าน" },
  { value: "redeem", label: "ไถ่ถอน" },
  { value: "renew", label: "ต่อดอกเบี้ย" },
  { value: "income", label: "รายรับอื่น" },
  { value: "expense", label: "รายจ่าย" },
] as const;

type ReportType = (typeof REPORT_TYPE_OPTIONS)[number]["value"];
type ReportRecordKind = Exclude<ReportType, "all">;

const REPORT_TYPE_LABEL: Record<ReportRecordKind, string> = {
  pos: "ขายหน้าร้าน",
  redeem: "ไถ่ถอน",
  renew: "ต่อดอกเบี้ย",
  income: "รายรับอื่น",
  expense: "รายจ่าย",
};

/** รายการเดียวที่รวมทุกประเภทธุรกรรมไว้ด้วยกัน (ใช้ทั้งตารางและ card มือถือ) */
type ReportRecord = {
  id: string;
  kind: ReportRecordKind;
  createdAt: Date;
  /** เลขที่ใบเสร็จ / เลขที่สัญญา / ชื่อหมวดของรายการที่ไม่มีเอกสาร */
  reference: string;
  title: string;
  detail?: string;
  method?: PaymentMethod;
  amount: number;
  direction: "in" | "out";
  sale?: SaleRow;
};

function ReportTableRow({ record }: { record: ReportRecord }) {
  return (
    <tr className="hover:bg-primary/5">
      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
        {formatDateTime(record.createdAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-bold text-zinc-800">
        {record.reference}
      </td>
      <td className="px-4 py-2.5">
        <p className="text-zinc-700">{record.title}</p>
        {record.detail && (
          <p className="text-xs font-medium text-zinc-500">{record.detail}</p>
        )}
        {record.sale && (
          <div className="mt-1">
            <SaleItemsAccordion sale={record.sale} />
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-zinc-500">
        {REPORT_TYPE_LABEL[record.kind]}
      </td>
      <td className="px-4 py-2.5">
        {record.method ? (
          <MethodBadge method={record.method} />
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-zinc-900">
        {record.direction === "out" ? "−" : "+"}
        {formatBaht(record.amount)}
      </td>
    </tr>
  );
}

function ReportMobileCard({ record }: { record: ReportRecord }) {
  return (
    <ReportCard>
      {/* ลำดับการอ่าน: ชื่อรายการ/สิ่งของก่อน แล้วจึงเลขอ้างอิง */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold leading-snug text-primary-dark">
            {record.title}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-zinc-500">
            {record.reference}
          </p>
        </div>
        <span className="shrink-0 font-extrabold tabular-nums text-zinc-900">
          {record.direction === "out" ? "−" : "+"}
          {formatBaht(record.amount)}
        </span>
      </div>
      {record.detail && (
        <p className="mt-1.5 text-xs font-medium text-zinc-500">
          {record.detail}
        </p>
      )}
      <dl className="mt-3 space-y-1.5 text-sm">
        <CardLine label="วัน/เวลา">{formatDateTime(record.createdAt)}</CardLine>
        <CardLine label="ประเภท">{REPORT_TYPE_LABEL[record.kind]}</CardLine>
        {record.method && (
          <CardLine label="ชำระ">
            <MethodBadge method={record.method} />
          </CardLine>
        )}
      </dl>
      {record.sale && (
        <div className="mt-2">
          <SaleItemsAccordion sale={record.sale} />
        </div>
      )}
    </ReportCard>
  );
}

function LedgerRow({
  label,
  sub,
  value,
  emphasis = false,
}: {
  label: string;
  sub?: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2",
        emphasis
          ? "mt-1 border-t-2 border-dashed border-primary/25 pt-3 font-bold text-zinc-800"
          : "text-zinc-700"
      )}
    >
      <div className="min-w-0">
        <dt className="font-semibold">{label}</dt>
        {sub && (
          <dd className="mt-0.5 text-xs font-medium text-zinc-500">{sub}</dd>
        )}
      </div>
      <dd className="shrink-0 font-bold tabular-nums">{value}</dd>
    </div>
  );
}

const METHOD_TONE: Record<PaymentMethod, "gray" | "gold" | "sky" | "teal"> = {
  CASH: "gray",
  QR: "gold",
  CARD: "sky",
  TRANSFER: "teal",
};

function MethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <Badge tone={METHOD_TONE[method]} className="whitespace-nowrap">
      {PAYMENT_METHOD_LABEL[method]}
    </Badge>
  );
}

// Pagination — pager ตัวเดียวของรายการรวม (state ใน URL)
function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-primary/25 px-4 py-2.5">
      <Link
        href={hrefFor(Math.max(page - 1, 1))}
        aria-label="หน้าก่อนหน้า"
        aria-disabled={page <= 1}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary/15 text-zinc-600 transition-colors hover:bg-primary/10 hover:text-primary-dark",
          page <= 1 && "pointer-events-none opacity-40"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="text-xs font-bold text-zinc-600">
        หน้า {page} / {totalPages} · {PAGE_SIZE} รายการ/หน้า
      </span>
      <Link
        href={hrefFor(Math.min(page + 1, totalPages))}
        aria-label="หน้าถัดไป"
        aria-disabled={page >= totalPages}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary/15 text-zinc-600 transition-colors hover:bg-primary/10 hover:text-primary-dark",
          page >= totalPages && "pointer-events-none opacity-40"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ReportCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-surface-card p-4 shadow-card">
      {children}
    </div>
  );
}

function CardLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-700">{children}</dd>
    </div>
  );
}

// ---- สรุปรายการของบิลขาย (ใช้เป็นชื่อรายการในตารางรวม) ----
function describeSale(r: {
  items: { productId: string | null; quantity: number }[];
}): string {
  let retailQty = 0;
  let pawnQty = 0;
  for (const it of r.items) {
    if (it.productId) retailQty += it.quantity;
    else pawnQty += it.quantity;
  }
  return [
    retailQty > 0 ? `สินค้าทั่วไป ${retailQty} ชิ้น` : "",
    pawnQty > 0 ? `ของหลุดจำนำ ${pawnQty} ชิ้น` : "",
  ]
    .filter(Boolean)
    .join(" + ");
}
