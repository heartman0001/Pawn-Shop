import Link from "next/link";
import {
  HandCoins,
  PackageOpen,
  Store,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { formatBaht, formatDateOnly } from "@/lib/format";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { cn } from "@/components/ui";
import { loadContractPage, loadSalePage } from "@/app/actions/dashboard";
import { RecentContracts, RecentSales } from "./recent-lists";

// ต้องรันแบบ dynamic เสมอ (เช็ค session ตอน request ไม่ใช่ตอน build)
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth();

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
    initialContracts,
    initialSales,
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
    loadContractPage(1),
    loadSalePage(1),
  ]);

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
        <RecentContracts initial={initialContracts} />
        <RecentSales initial={initialSales} />
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
