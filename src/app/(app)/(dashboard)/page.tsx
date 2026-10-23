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
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui";
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
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="แดชบอร์ด"
        description={`ภาพรวมร้านวันนี้ — ${formatDateOnly(now)}`}
        actions={
          <>
            <Link href="/pos">
              <Button variant="secondary">เปิดหน้าร้านขาย</Button>
            </Link>
            <Link href="/pawn/new">
              <Button>+ รับจำนำใหม่</Button>
            </Link>
          </>
        }
      />

      {/* สถิติ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard
          icon={<HandCoins className="h-5 w-5" />}
          label="สัญญาที่ active"
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
        <Card className="border-coral/30 bg-coral/[0.06] p-4">
          <div className="mb-2.5 flex items-center gap-2 text-coral-dark">
            <TriangleAlert className="h-5 w-5" />
            <h2 className="text-sm font-extrabold">สินค้าที่สต็อกเหลือน้อย</h2>
            <span className="text-xs font-semibold text-coral-dark/80">
              {lowStock.length} รายการ
            </span>
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

      <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
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
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold text-primary-dark">
                        {c.contractNumber}
                      </span>
                      <Badge tone={PAWN_STATUS_TONE[c.status]}>
                        {PAWN_STATUS_LABEL[c.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-zinc-800">
                      {c.itemName}
                    </p>
                    <div className="mt-1 flex items-end justify-between gap-3">
                      <span className="min-w-0 truncate text-xs text-zinc-600">
                        {c.customer.fullName} · ครบ {formatDateOnly(c.dueDate)}
                      </span>
                      <span className="shrink-0 text-sm font-extrabold tabular-nums text-zinc-900">
                        {formatBaht(c.principalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )
          }
        >
          {recentContracts.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-zinc-500"
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
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold text-primary-dark">
                        {s.receiptNumber}
                      </span>
                      <span className="shrink-0 font-extrabold tabular-nums text-success">
                        {formatBaht(s.totalAmount)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">
                      {formatDateTime(s.createdAt)}
                      {describeSale(s) ? ` · ${describeSale(s)}` : ""}
                    </p>
                  </div>
                ))}
              </>
            )
          }
        >
          {recentSales.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-sm text-zinc-500"
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
    <Card className="p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            alert
              ? "bg-coral/15 text-coral-dark"
              : "bg-primary/10 text-primary-dark"
          )}
        >
          {icon}
        </span>
        <span className="text-[0.8125rem] font-semibold leading-snug text-zinc-600">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "mt-2.5 text-[1.6rem] font-extrabold leading-none tracking-tight tabular-nums sm:text-3xl",
          alert ? "text-coral-dark" : "text-zinc-900"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-xs font-medium leading-snug text-zinc-500">
          {sub}
        </p>
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
      <CardHeader
        title={title}
        action={
          <Link
            href={href}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-primary-dark transition-colors hover:bg-primary/10"
          >
            ดูทั้งหมด <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-primary/15 bg-primary/[0.04] text-left text-xs text-zinc-600">
              {headers.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    "px-4 py-2.5 font-semibold uppercase tracking-wide",
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

      {/* Mobile: รายการแบนในการ์ดเดียว — ไม่ซ้อนการ์ดในการ์ด */}
      {mobile && (
        <div className="divide-y divide-primary/10 sm:hidden">{mobile}</div>
      )}

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
    <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-primary/25 px-4 py-2.5">
      <Link
        href={pageHref(Math.max(page - 1, 1))}
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
        หน้า {page} / {totalPages}
      </span>
      <Link
        href={pageHref(Math.min(page + 1, totalPages))}
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

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="p-3">
      <EmptyState title={text} className="py-8" />
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
