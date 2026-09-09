import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  PackageOpen,
  Store,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  formatBaht,
  formatDateOnly,
  formatDateTime,
  PAWN_STATUS_LABEL,
  PAWN_STATUS_TONE,
} from "@/lib/format";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/components/ui";

// ต้องรันแบบ dynamic เสมอ (เช็ค session ตอน request ไม่ใช่ตอน build)
export const dynamic = "force-dynamic";

const PAGE_SIZE = 5;

type DashboardSearchParams = { cp?: string; sp?: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  await requireAuth();

  const sp = await searchParams;
  const parsePage = (v?: string) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : 1;
  };
  const contractPage = parsePage(sp.cp);
  const salePage = parsePage(sp.sp);
  // ลิงก์เปลี่ยนหน้า: คงค่าหน้าของอีกตารางไว้
  const contractHref = (page: number) => {
    const q = new URLSearchParams();
    if (page > 1) q.set("cp", String(page));
    if (salePage > 1) q.set("sp", String(salePage));
    const qs = q.toString();
    return qs ? `/?${qs}` : "/";
  };
  const saleHref = (page: number) => {
    const q = new URLSearchParams();
    if (contractPage > 1) q.set("cp", String(contractPage));
    if (page > 1) q.set("sp", String(page));
    const qs = q.toString();
    return qs ? `/?${qs}` : "/";
  };

  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 7);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    activePawns,
    dueSoon,
    todayRevenue,
    totalStock,
    allProducts,
    totalContracts,
    totalSales,
    recentContracts,
    recentSales,
  ] = await Promise.all([
    db.pawnContract.count({ where: { status: "ACTIVE" } }),
    db.pawnContract.count({
      where: { status: "ACTIVE", dueDate: { lte: soon } },
    }),
    db.saleOrder.aggregate({
      where: { createdAt: { gte: dayStart } },
      _sum: { totalAmount: true },
    }),
    db.retailProduct.aggregate({
      where: { archived: false },
      _sum: { quantity: true },
    }),
    db.retailProduct.findMany({
      where: { archived: false },
      orderBy: { quantity: "asc" },
    }),
    db.pawnContract.count(),
    db.saleOrder.count(),
    db.pawnContract.findMany({
      orderBy: { createdAt: "desc" },
      skip: (contractPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: true },
    }),
    db.saleOrder.findMany({
      orderBy: { createdAt: "desc" },
      skip: (salePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: true },
    }),
  ]);

  const contractPages = Math.max(1, Math.ceil(totalContracts / PAGE_SIZE));
  const salePages = Math.max(1, Math.ceil(totalSales / PAGE_SIZE));

  const lowStock = allProducts
    .filter((p) => p.quantity <= p.minQuantity)
    .slice(0, 5);

  const revenueToday = todayRevenue._sum.totalAmount ?? 0;
  const stockUnits = totalStock._sum.quantity ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">
            แดชบอร์ด
          </h1>
          <p className="text-sm font-medium text-zinc-500">
            ภาพรวมร้านวันนี้ — {formatDateOnly(now)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pawn/new">
            <Button>+ รับจำนำใหม่</Button>
          </Link>
          <Link href="/pos">
            <Button variant="secondary">เปิดหน้าร้านขาย</Button>
          </Link>
        </div>
      </div>

      {/* สถิติ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<HandCoins className="h-5 w-5" />}
          label="สัญญาจำนำที่ยัง active"
          value={String(activePawns)}
          sub={
            dueSoon > 0
              ? `ครบกำหนดใน 7 วัน ${dueSoon} ราย`
              : "ไม่มีสัญญาใกล้ครบกำหนด"
          }
          alert={dueSoon > 0}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="ยอดขายวันนี้"
          value={formatBaht(revenueToday)}
          sub="เฉพาะหน้าร้าน (POS)"
        />
        <StatCard
          icon={<Store className="h-5 w-5" />}
          label="สินค้าหน้าร้าน"
          value={String(stockUnits)}
          sub="ชิ้น (รวมทุกหมวด)"
        />
        <StatCard
          icon={<PackageOpen className="h-5 w-5" />}
          label="สินค้าสต็อกต่ำ"
          value={String(lowStock.length)}
          sub={lowStock.length ? "ควรสั่งเพิ่ม / นำเข้าขาย" : "สต็อกปกติ"}
          alert={lowStock.length > 0}
        />
      </div>

      {/* แจ้งเตือนสต็อกต่ำ */}
      {lowStock.length > 0 && (
        <Card className="border-l-8 border-l-coral bg-cream p-4">
          <div className="mb-2 flex items-center gap-2 text-coral-dark">
            <TriangleAlert className="h-5 w-5" />
            <h2 className="text-sm font-extrabold">สินค้าที่สต็อกเหลือน้อย</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Badge key={p.id} tone="coral" className="px-3 py-1.5 text-sm">
                {p.name} — เหลือ {p.quantity} ชิ้น
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ===== สัญญาจำนำล่าสุด ===== */}
        <RecentSection
          title="สัญญาจำนำล่าสุด"
          href="/pawns"
          headers={["เลขที่สัญญา", "ลูกค้า", "สิ่งที่จำนำ", "ครบกำหนด", "สถานะ"]}
          page={contractPage}
          totalPages={contractPages}
          pageHref={contractHref}
          mobile={
            recentContracts.length === 0 ? (
              <EmptyCard text="ยังไม่มีสัญญาจำนำ — กด “+ รับจำนำใหม่” เพื่อเริ่ม" />
            ) : (
              <>
                {recentContracts.map((c) => (
                  <ReportCard key={c.id}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-primary-dark">
                        {c.contractNumber}
                      </span>
                      <Badge tone={PAWN_STATUS_TONE[c.status]}>
                        {PAWN_STATUS_LABEL[c.status]}
                      </Badge>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      <CardLine label="สิ่งที่จำนำ">
                        <span className="block truncate">{c.itemName}</span>
                      </CardLine>
                      <CardLine label="ลูกค้า">{c.customer.fullName}</CardLine>
                      <CardLine label="เงินต้น">
                        {formatBaht(c.principalAmount)}
                      </CardLine>
                      <CardLine label="ครบกำหนด">
                        {formatDateTime(c.dueDate)}
                      </CardLine>
                    </dl>
                  </ReportCard>
                ))}
              </>
            )
          }
        >
          {recentContracts.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-zinc-400"
              >
                ยังไม่มีสัญญาจำนำ — กด “+ รับจำนำใหม่” เพื่อเริ่ม
              </td>
            </tr>
          ) : (
            recentContracts.map((c) => (
              <tr key={c.id} className="hover:bg-primary/5">
                <td className="whitespace-nowrap px-4 py-2.5 font-bold text-zinc-800">
                  {c.contractNumber}
                </td>
                <td className="px-4 py-2.5 text-zinc-600">
                  {c.customer.fullName}
                </td>
                <td className="max-w-[220px] truncate px-4 py-2.5 text-zinc-600">
                  {c.itemName}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
                  {formatDateOnly(c.dueDate)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Badge tone={PAWN_STATUS_TONE[c.status]}>
                    {PAWN_STATUS_LABEL[c.status]}
                  </Badge>
                </td>
              </tr>
            ))
          )}
        </RecentSection>

        {/* ===== บิลขายล่าสุด ===== */}
        <RecentSection
          title="บิลขายล่าสุด"
          href="/pos"
          headers={["เลขที่บิล", "วัน/เวลา", "รายการ", "ยอดรวม"]}
          page={salePage}
          totalPages={salePages}
          pageHref={saleHref}
          mobile={
            recentSales.length === 0 ? (
              <EmptyCard text="ยังไม่มีรายการขายวันนี้" />
            ) : (
              <>
                {recentSales.map((s) => (
                  <ReportCard key={s.id}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-primary-dark">
                        {s.receiptNumber}
                      </span>
                      <span className="font-extrabold text-success">
                        {formatBaht(s.totalAmount)}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      <CardLine label="วัน/เวลา">
                        {formatDateTime(s.createdAt)}
                      </CardLine>
                      <CardLine label="รายการ">
                        {describeSale(s) || "—"}
                      </CardLine>
                    </dl>
                  </ReportCard>
                ))}
              </>
            )
          }
        >
          {recentSales.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-sm text-zinc-400"
              >
                ยังไม่มีรายการขายวันนี้
              </td>
            </tr>
          ) : (
            recentSales.map((s) => (
              <tr key={s.id} className="hover:bg-primary/5">
                <td className="whitespace-nowrap px-4 py-2.5 font-bold text-zinc-800">
                  {s.receiptNumber}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
                  {formatDateTime(s.createdAt)}
                </td>
                <td className="px-4 py-2.5 text-zinc-600">
                  {describeSale(s) || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-extrabold text-success">
                  {formatBaht(s.totalAmount)}
                </td>
              </tr>
            ))
          )}
        </RecentSection>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ส่วนประกอบย่อย
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden border-l-8 p-4 ${
        alert ? "border-l-coral" : "border-l-primary"
      }`}
    >
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
          {label}
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl ${
          alert ? "text-coral-dark" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs font-medium text-zinc-400">{sub}</p>
      )}
    </Card>
  );
}

function RecentSection({
  title,
  href,
  headers,
  page,
  totalPages,
  pageHref,
  mobile,
  children,
}: {
  title: string;
  href: string;
  headers: string[];
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
  mobile?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-dashed border-primary/25 px-5 py-3.5">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-dark">
          {title}
        </h2>
        <Link
          href={href}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10"
        >
          ดูทั้งหมด <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "px-4 py-2.5 font-medium",
                    i === headers.length - 1 && "text-right"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">{children}</tbody>
        </table>
      </div>

      {/* Mobile: card stack */}
      {mobile && <div className="space-y-3 p-3 sm:hidden">{mobile}</div>}

      <Pagination page={page} totalPages={totalPages} pageHref={pageHref} />
    </Card>
  );
}

function Pagination({
  page,
  totalPages,
  pageHref,
}: {
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-primary/25 px-5 py-3">
      <Link
        href={pageHref(Math.max(page - 1, 1))}
        aria-disabled={page <= 1}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/15 text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary-dark",
          page <= 1 && "pointer-events-none opacity-40"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="text-xs font-bold text-zinc-500">
        หน้า {page} / {totalPages}
      </span>
      <Link
        href={pageHref(Math.min(page + 1, totalPages))}
        aria-disabled={page >= totalPages}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/15 text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary-dark",
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

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
      {text}
    </div>
  );
}

// สรุปจำนวนชิ้นในบิล: สินค้าทั่วไป vs ของหลุดจำนำ
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
