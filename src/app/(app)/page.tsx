import Link from "next/link";
import {
  ArrowRight,
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
  formatDateTime,
  PAWN_STATUS_LABEL,
  PAWN_STATUS_TONE,
} from "@/lib/format";
import { Badge, Button, Card } from "@/components/ui";

// ต้องรันแบบ dynamic เสมอ (เช็ค session ตอน request ไม่ใช่ตอน build)
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth();

  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 7);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [activePawns, dueSoon, todayRevenue, totalStock, allProducts, recentContracts, recentSales] =
    await Promise.all([
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
      db.pawnContract.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: true },
      }),
      db.saleOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: true },
      }),
    ]);

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
            ภาพรวมร้านวันนี้ — {formatDateTime(now)}
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
        {/* สัญญาล่าสุด */}
        <Card>
          <SectionTitle href="/pawns" title="สัญญาจำนำล่าสุด" />
          <ul className="divide-y divide-zinc-100">
            {recentContracts.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-zinc-400">
                ยังไม่มีสัญญาจำนำ — กด “+ รับจำนำใหม่” เพื่อเริ่ม
              </li>
            )}
            {recentContracts.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c.itemName}{" "}
                    <span className="font-normal text-zinc-400">
                      ({c.customer.fullName})
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {c.contractNumber} · ครบกำหนด {formatDateTime(c.dueDate)}
                  </p>
                </div>
                <Badge tone={PAWN_STATUS_TONE[c.status]}>
                  {PAWN_STATUS_LABEL[c.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        {/* ขายล่าสุด */}
        <Card>
          <SectionTitle href="/pos" title="บิลขายล่าสุด" />
          <ul className="divide-y divide-zinc-100">
            {recentSales.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-zinc-400">
                ยังไม่มีรายการขายวันนี้
              </li>
            )}
            {recentSales.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.receiptNumber}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDateTime(s.createdAt)} · {s.items.length} รายการ
                  </p>
                </div>
                <span className="text-sm font-bold text-success">
                  {formatBaht(s.totalAmount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

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

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
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
  );
}
