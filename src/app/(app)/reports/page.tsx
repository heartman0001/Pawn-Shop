import Link from "next/link";
import { CalendarRange, Filter } from "lucide-react";
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
import { Badge, Button, Card, Input } from "@/components/ui";
import { cn } from "@/components/ui";
import { SaleItemsAccordion, type SaleItemRow } from "./sale-items-accordion";

export const metadata = { title: "รายงานรายรับ — ร้านรับจำนำ POS" };

type ReportSearchParams = { from?: string; to?: string; all?: string };

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
  // ดึงข้อมูล 3 ช่องทางรายรับ
  // ------------------------------------------------------------------
  const [sales, redeems, renewals, expenses] = await Promise.all([
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
    db.expense.findMany({
      where: { createdAt: range },
      orderBy: { createdAt: "desc" },
      include: {
        contract: { select: { contractNumber: true, itemName: true } },
      },
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

  const grandTotal = posTotal + redeemTotal + renewTotal;
  const netTotal = grandTotal - expenseTotal;

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">
          รายงานรายรับ
        </h1>
        <p className="text-sm text-zinc-500">
          เงินเข้าทุกช่องทาง: ขายหน้าร้าน (POS) · ไถ่ถอน · ต่อดอกเบี้ย — หักรายจ่าย
          (เงินต้นที่จ่ายออกเมื่อรับจำนำ)
          <span className="text-xs text-zinc-400">
            {" "}
            (เงินต้นที่คืนตอนไถ่ถอนคือเงินคืนทุน และเงินต้นที่จ่ายตอนรับจำนำนับเป็นรายจ่าย —
            ตัวเลข “คงเหลือ” คือเงินจริงที่เหลือในร้าน)
          </span>
        </p>
      </div>

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
                "rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors",
                p.active
                  ? "bg-gradient-to-b from-primary-light to-primary text-white shadow-glow-teal"
                  : "border-2 border-primary/15 bg-white text-zinc-600 hover:bg-primary/10 hover:text-primary-dark"
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form
          className="ml-auto flex flex-wrap items-end gap-2"
          action="/reports"
          method="get"
        >
          <label className="text-xs font-semibold text-zinc-500">
            ตั้งแต่
            <Input
              type="date"
              name="from"
              defaultValue={isAll ? "" : selFrom}
              className="mt-0.5 h-9 w-36"
            />
          </label>
          <label className="text-xs font-semibold text-zinc-500">
            ถึง
            <Input
              type="date"
              name="to"
              defaultValue={isAll ? "" : selTo}
              className="mt-0.5 h-9 w-36"
            />
          </label>
          <Button type="submit" variant="secondary" className="h-9">
            <Filter className="h-4 w-4" /> กรอง
          </Button>
        </form>
      </Card>

      {/* การ์ดสรุป */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="รายรับรวม"
          value={formatBaht(grandTotal)}
          sub={`${sales.length} บิลขาย · ${redeems.length} ครั้งไถ่ถอน · ${renewals.length} ครั้งต่อดอก`}
          accent="gold"
        />
        <SummaryCard
          label="ขายหน้าร้าน (POS)"
          value={formatBaht(posTotal)}
          sub={`ทั่วไป ${formatBaht(posRetailTotal)} · หลุดจำนำ ${formatBaht(posPawnTotal)}`}
          accent="teal"
        />
        <SummaryCard
          label="ไถ่ถอน"
          value={formatBaht(redeemTotal)}
          sub={`เงินต้นคืน ${formatBaht(redeemPrincipal)} · ดอกเบี้ย ${formatBaht(redeemInterest)}`}
          accent="sky"
        />
        <SummaryCard
          label="ต่อดอกเบี้ย"
          value={formatBaht(renewTotal)}
          sub={`${renewals.length} ครั้ง`}
          accent="coral"
        />
        <SummaryCard
          label="รายจ่าย"
          value={`−${formatBaht(expenseTotal)}`}
          sub={`${expenses.length} ครั้ง (เงินต้นรับจำนำ)`}
          accent="red"
        />
      </div>

      {/* สุทธิ */}
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 border-l-8 border-l-success p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            เงินคงเหลือ (สุทธิ = รายรับ − รายจ่าย)
          </p>
          <p
            className={cn(
              "mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl",
              netTotal < 0 ? "text-error" : "text-success"
            )}
          >
            {netTotal < 0 ? `−${formatBaht(Math.abs(netTotal))}` : formatBaht(netTotal)}
          </p>
        </div>
        <div className="text-sm font-medium text-zinc-500">
          รายรับ {formatBaht(grandTotal)}
          <span className="mx-2 text-zinc-300">−</span>
          รายจ่าย {formatBaht(expenseTotal)}
        </div>
      </Card>

      {/* ===== ขายหน้าร้าน ===== */}
      <ReportSection
        title={`บิลขายหน้าร้าน (${sales.length})`}
        total={formatBaht(posTotal)}
        tone="teal"
        mobile={
          sales.length === 0 ? <EmptyCard /> : <SalesCards rows={sales} />
        }
      >
        {sales.length === 0 ? (
          <EmptyRow />
        ) : (
          <SalesTable rows={sales} />
        )}
      </ReportSection>

      {/* ===== ไถ่ถอน ===== */}
      <ReportSection
        title={`การไถ่ถอน (${redeems.length})`}
        total={formatBaht(redeemTotal)}
        tone="sky"
        mobile={
          redeems.length === 0 ? <EmptyCard /> : <RedeemCards rows={redeems} />
        }
      >
        {redeems.length === 0 ? (
          <EmptyRow />
        ) : (
          <RedeemTable rows={redeems} />
        )}
      </ReportSection>

      {/* ===== ต่อดอกเบี้ย ===== */}
      <ReportSection
        title={`การต่อดอกเบี้ย (${renewals.length})`}
        total={formatBaht(renewTotal)}
        tone="coral"
        mobile={
          renewals.length === 0 ? <EmptyCard /> : <RenewCards rows={renewals} />
        }
      >
        {renewals.length === 0 ? (
          <EmptyRow />
        ) : (
          <RenewTable rows={renewals} />
        )}
      </ReportSection>

      {/* ===== รายจ่าย ===== */}
      <ReportSection
        title={`รายจ่าย — เงินต้นที่จ่ายรับจำนำ (${expenses.length})`}
        total={`−${formatBaht(expenseTotal)}`}
        tone="red"
        mobile={
          expenses.length === 0 ? <EmptyCard /> : <ExpenseCards rows={expenses} />
        }
      >
        {expenses.length === 0 ? (
          <EmptyRow />
        ) : (
          <ExpenseTable rows={expenses} />
        )}
      </ReportSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ส่วนประกอบย่อย
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "teal" | "gold" | "sky" | "coral" | "red";
}) {
  const bar = {
    teal: "border-l-primary",
    gold: "border-l-accent",
    sky: "border-l-sky",
    coral: "border-l-coral",
    red: "border-l-error",
  }[accent];
  return (
    <Card className={`overflow-hidden border-l-8 p-4 ${bar}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs font-medium text-zinc-400">{sub}</p>}
    </Card>
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

function ReportSection({
  title,
  total,
  tone,
  mobile,
  children,
}: {
  title: string;
  total: string;
  tone: "teal" | "sky" | "coral" | "red";
  mobile?: React.ReactNode;
  children: React.ReactNode;
}) {
  const dot = {
    teal: "text-primary",
    sky: "text-sky",
    coral: "text-coral",
    red: "text-error",
  }[tone];
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-primary/25 px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-primary-dark">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          {title}
        </h2>
        <span className="text-base font-extrabold text-zinc-800">{total}</span>
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
              <th className="px-4 py-2.5 font-medium">วัน/เวลา</th>
              <th className="px-4 py-2.5 font-medium">เลขที่ / สัญญา</th>
              <th className="px-4 py-2.5 font-medium">รายการ</th>
              <th className="px-4 py-2.5 font-medium">ชำระ</th>
              <th className="px-4 py-2.5 text-right font-medium">จำนวน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">{children}</tbody>
        </table>
      </div>

      {/* Mobile: card stack */}
      {mobile && (
        <div className="space-y-3 p-3 sm:hidden">{mobile}</div>
      )}
    </Card>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td
        colSpan={5}
        className="px-4 py-12 text-center text-sm text-zinc-400"
      >
        ไม่มีรายการในช่วงเวลานี้
      </td>
    </tr>
  );
}

function EmptyCard() {
  return (
    <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
      ไม่มีรายการในช่วงเวลานี้
    </div>
  );
}

function ReportCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card">
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
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="text-right text-zinc-700">{children}</dd>
    </div>
  );
}

// ---- ตารางบิลขาย ----
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

function SalesTable({
  rows,
}: {
  rows: {
    receiptNumber: string;
    createdAt: Date;
    paymentMethod: PaymentMethod;
    totalAmount: number;
    items: SaleItemRow[];
  }[];
}) {
  return (
    <>
      {rows.map((r) => {
        const desc = describeSale(r);
        return (
          <tr key={r.receiptNumber} className="hover:bg-primary/5">
            <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
              {formatDateTime(r.createdAt)}
            </td>
            <td className="px-4 py-2.5 font-bold text-zinc-800">
              {r.receiptNumber}
            </td>
            <td className="px-4 py-2.5 text-zinc-600">
              {desc || "—"}
              <SaleItemsAccordion sale={r} />
            </td>
            <td className="px-4 py-2.5">
              <MethodBadge method={r.paymentMethod} />
            </td>
            <td className="px-4 py-2.5 text-right font-extrabold text-success">
              {formatBaht(r.totalAmount)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ---- การ์ดบิลขาย (mobile) ----
function SalesCards({
  rows,
}: {
  rows: Parameters<typeof SalesTable>[0]["rows"];
}) {
  return (
    <>
      {rows.map((r) => (
        <ReportCard key={r.receiptNumber}>
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold text-primary-dark">
              {r.receiptNumber}
            </span>
            <span className="font-extrabold text-success">
              {formatBaht(r.totalAmount)}
            </span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <CardLine label="วัน/เวลา">
              {formatDateTime(r.createdAt)}
            </CardLine>
            <CardLine label="รายการ">
              {describeSale(r) || "—"}
            </CardLine>
            <CardLine label="ชำระ">
              <MethodBadge method={r.paymentMethod} />
            </CardLine>
          </dl>
          <div className="mt-2">
            <SaleItemsAccordion sale={r} />
          </div>
        </ReportCard>
      ))}
    </>
  );
}

// ---- ตารางไถ่ถอน ----
function RedeemTable({
  rows,
}: {
  rows: {
    id: string;
    createdAt: Date;
    paymentMethod: PaymentMethod;
    total: number;
    principal: number;
    interest: number;
    contract: { contractNumber: string; itemName: string };
  }[];
}) {
  return (
    <>
      {rows.map((r) => (
        <tr key={r.id} className="hover:bg-primary/5">
          <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
            {formatDateTime(r.createdAt)}
          </td>
          <td className="px-4 py-2.5 font-bold text-zinc-800">
            {r.contract.contractNumber}
          </td>
          <td className="px-4 py-2.5">
            <p className="text-zinc-600">{r.contract.itemName}</p>
            <p className="text-xs text-zinc-400">
              เงินต้น {formatBaht(r.principal)}
              {r.interest > 0 && <> · ดอกเบี้ย {formatBaht(r.interest)}</>}
            </p>
          </td>
          <td className="px-4 py-2.5">
            <MethodBadge method={r.paymentMethod} />
          </td>
          <td className="px-4 py-2.5 text-right font-extrabold text-zinc-800">
            {formatBaht(r.total)}
          </td>
        </tr>
      ))}
    </>
  );
}

// ---- การ์ดไถ่ถอน (mobile) ----
function RedeemCards({
  rows,
}: {
  rows: Parameters<typeof RedeemTable>[0]["rows"];
}) {
  return (
    <>
      {rows.map((r) => (
        <ReportCard key={r.id}>
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold text-primary-dark">
              {r.contract.contractNumber}
            </span>
            <span className="font-extrabold text-zinc-800">
              {formatBaht(r.total)}
            </span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <CardLine label="วัน/เวลา">
              {formatDateTime(r.createdAt)}
            </CardLine>
            <CardLine label="รายการ">
              <span className="block">{r.contract.itemName}</span>
              <span className="block text-xs text-zinc-400">
                เงินต้น {formatBaht(r.principal)}
                {r.interest > 0 && <> · ดอกเบี้ย {formatBaht(r.interest)}</>}
              </span>
            </CardLine>
            <CardLine label="ชำระ">
              <MethodBadge method={r.paymentMethod} />
            </CardLine>
          </dl>
        </ReportCard>
      ))}
    </>
  );
}

// ---- ตารางรายจ่าย ----
function ExpenseTable({
  rows,
}: {
  rows: {
    id: string;
    createdAt: Date;
    amount: number;
    category: string;
    description: string;
    contract: { contractNumber: string; itemName: string } | null;
  }[];
}) {
  return (
    <>
      {rows.map((r) => (
        <tr key={r.id} className="hover:bg-primary/5">
          <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
            {formatDateTime(r.createdAt)}
          </td>
          <td className="px-4 py-2.5 font-bold text-zinc-800">
            {r.contract?.contractNumber ?? EXPENSE_CATEGORY_LABEL[r.category] ?? r.category}
          </td>
          <td className="px-4 py-2.5">
            <p className="text-zinc-600">{r.contract?.itemName ?? r.description}</p>
            <p className="text-xs text-zinc-400">{r.description}</p>
          </td>
          <td className="px-4 py-2.5">
            <Badge tone="red" className="whitespace-nowrap">
              รายจ่าย
            </Badge>
          </td>
          <td className="px-4 py-2.5 text-right font-extrabold text-error">
            −{formatBaht(r.amount)}
          </td>
        </tr>
      ))}
    </>
  );
}

// ---- การ์ดรายจ่าย (mobile) ----
function ExpenseCards({
  rows,
}: {
  rows: Parameters<typeof ExpenseTable>[0]["rows"];
}) {
  return (
    <>
      {rows.map((r) => (
        <ReportCard key={r.id}>
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold text-primary-dark">
              {r.contract?.contractNumber ??
                EXPENSE_CATEGORY_LABEL[r.category] ??
                r.category}
            </span>
            <span className="font-extrabold text-error">
              −{formatBaht(r.amount)}
            </span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <CardLine label="วัน/เวลา">
              {formatDateTime(r.createdAt)}
            </CardLine>
            <CardLine label="รายการ">
              <span className="block">{r.contract?.itemName ?? r.description}</span>
              <span className="block text-xs text-zinc-400">
                {r.description}
              </span>
            </CardLine>
            <CardLine label="ประเภท">
              <Badge tone="red" className="whitespace-nowrap">
                รายจ่าย
              </Badge>
            </CardLine>
          </dl>
        </ReportCard>
      ))}
    </>
  );
}

// ---- การ์ดต่อดอกเบี้ย (mobile) ----
function RenewCards({
  rows,
}: {
  rows: Parameters<typeof RenewTable>[0]["rows"];
}) {
  return (
    <>
      {rows.map((r) => (
        <ReportCard key={r.id}>
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold text-primary-dark">
              {r.contract.contractNumber}
            </span>
            <span className="font-extrabold text-accent-dark">
              {formatBaht(r.interestAmount)}
            </span>
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <CardLine label="วัน/เวลา">
              {formatDateTime(r.createdAt)}
            </CardLine>
            <CardLine label="รายการ">
              <span className="block">{r.contract.itemName}</span>
              <span className="block text-xs text-zinc-400">
                ต่อดอกเบี้ยครั้งที่ {r.roundNumber}
              </span>
            </CardLine>
            <CardLine label="ชำระ">
              <MethodBadge method={r.paymentMethod} />
            </CardLine>
          </dl>
        </ReportCard>
      ))}
    </>
  );
}

// ---- ตารางต่อดอกเบี้ย ----
function RenewTable({
  rows,
}: {
  rows: {
    id: string;
    createdAt: Date;
    paymentMethod: PaymentMethod;
    interestAmount: number;
    roundNumber: number;
    contract: { contractNumber: string; itemName: string };
  }[];
}) {
  return (
    <>
      {rows.map((r) => (
        <tr key={r.id} className="hover:bg-primary/5">
          <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
            {formatDateTime(r.createdAt)}
          </td>
          <td className="px-4 py-2.5 font-bold text-zinc-800">
            {r.contract.contractNumber}
          </td>
          <td className="px-4 py-2.5">
            <p className="text-zinc-600">{r.contract.itemName}</p>
            <p className="text-xs text-zinc-400">
              ต่อดอกเบี้ยครั้งที่ {r.roundNumber}
            </p>
          </td>
          <td className="px-4 py-2.5">
            <MethodBadge method={r.paymentMethod} />
          </td>
          <td className="px-4 py-2.5 text-right font-extrabold text-accent-dark">
            {formatBaht(r.interestAmount)}
          </td>
        </tr>
      ))}
    </>
  );
}
