import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ProductsManager } from "./products-manager";

export const metadata = { title: "สต็อกสินค้า — ร้านรับจำนำ POS" };


export default async function ProductsPage() {
  await requireAuth();

  const products = await db.retailProduct.findMany({
    where: { archived: false }, // หน้ารายการนี้ไม่โชว์ของที่ลบ/ซ่อนแล้ว
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      costPrice: true,
      sellPrice: true,
      quantity: true,
      minQuantity: true,
      image: true,
    },
  });

  return <ProductsManager products={products} />;
}
