import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import type { ForfeitPawnDto, ProductDto } from "@/lib/dto";
import { PosClient } from "./pos-client";

export const metadata = { title: "ขายหน้าร้าน (POS) — ร้านรับจำนำ" };

export default async function PosPage() {
  await requireAuth();

  const [products, pawns] = await Promise.all([
    db.retailProduct.findMany({
      where: { archived: false }, // ไม่เอาสินค้าที่ถูกลบ/ซ่อนขึ้นหน้าร้าน
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.pawnContract.findMany({
      where: { status: "FORFEITED" },
      orderBy: { forfeitedAt: "desc" },
      include: { customer: true },
    }),
  ]);

  const productDtos: ProductDto[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    sellPrice: p.sellPrice,
    quantity: p.quantity,
    image: p.image,
    outOfStock: p.quantity <= 0,
    lowStock: p.quantity > 0 && p.quantity <= p.minQuantity,
  }));

  const pawnDtos: ForfeitPawnDto[] = pawns.map((pawn) => ({
    id: pawn.id,
    contractNumber: pawn.contractNumber,
    itemName: pawn.itemName,
    customerName: pawn.customer.fullName,
    principalAmount: pawn.principalAmount,
    sellPrice: pawn.forfeitPrice ?? pawn.principalAmount,
    image: pawn.image,
    forfeitedAt: pawn.forfeitedAt?.toISOString() ?? pawn.createdAt.toISOString(),
  }));

  return (
    <PosClient
      products={productDtos}
      forfeitedPawns={pawnDtos}
    />
  );
}
