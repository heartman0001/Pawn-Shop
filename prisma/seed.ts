/**
 * Seed ข้อมูลตัวอย่าง (สินค้าหน้าร้าน)
 * รัน: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedProduct = {
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  minQuantity: number;
  image: string | null;
};

// รูปตัวอย่างอยู่ที่ public/products/*.svg
const PRODUCTS: SeedProduct[] = [
  // สมาร์ทโฟนและแท็บเล็ต
  { name: "iPhone 13 128GB สีดำ", category: "สมาร์ทโฟนและแท็บเล็ต", costPrice: 14500, sellPrice: 15900, quantity: 3, minQuantity: 1, image: "/products/phone.svg" },
  { name: "Samsung Galaxy A16", category: "สมาร์ทโฟนและแท็บเล็ต", costPrice: 4200, sellPrice: 4900, quantity: 5, minQuantity: 2, image: "/products/phone.svg" },
  // อุปกรณ์ชาร์จ
  { name: "แบตเตอรี่สำรอง 20000mAh", category: "อุปกรณ์ชาร์จ", costPrice: 350, sellPrice: 550, quantity: 10, minQuantity: 3, image: "/products/accessory.svg" },
  // อุปกรณ์เสียง
  { name: "หูฟังบลูทูธ Wireless", category: "อุปกรณ์เสียง", costPrice: 250, sellPrice: 450, quantity: 8, minQuantity: 3, image: "/products/accessory.svg" },
  { name: "ลำโพงบลูทูธพกพา", category: "อุปกรณ์เสียง", costPrice: 400, sellPrice: 690, quantity: 4, minQuantity: 1, image: "/products/accessory.svg" },
  // อื่นๆ
  { name: "ทีวี LED 32 นิ้ว", category: "อื่นๆ", costPrice: 4200, sellPrice: 5200, quantity: 2, minQuantity: 1, image: "/products/tv.svg" },
  { name: "พัดลมตั้งพื้น 18 นิ้ว", category: "อื่นๆ", costPrice: 500, sellPrice: 850, quantity: 6, minQuantity: 2, image: "/products/tv.svg" },
  { name: "แหวนทอง 1 สลึง (2.09g)", category: "อื่นๆ", costPrice: 9300, sellPrice: 10200, quantity: 1, minQuantity: 0, image: "/products/gold.svg" },
  { name: "สร้อยคอทอง 1 บาท", category: "อื่นๆ", costPrice: 37400, sellPrice: 38800, quantity: 1, minQuantity: 0, image: "/products/gold.svg" },
  { name: "ต่างหูทอง 50 สต.", category: "อื่นๆ", costPrice: 2350, sellPrice: 2900, quantity: 3, minQuantity: 1, image: "/products/gold.svg" },
  { name: "นาฬิกาข้อมือ Casio G-Shock", category: "อื่นๆ", costPrice: 1800, sellPrice: 2400, quantity: 4, minQuantity: 1, image: "/products/watch.svg" },
  { name: "นาฬิกาข้อมืออัตโนมัติ", category: "อื่นๆ", costPrice: 3200, sellPrice: 4200, quantity: 2, minQuantity: 1, image: "/products/watch.svg" },
  { name: "กระเป๋าเป้หนัง PU", category: "อื่นๆ", costPrice: 300, sellPrice: 590, quantity: 7, minQuantity: 2, image: "/products/accessory.svg" },
  { name: "เครื่องตัดหญ้าไฟฟ้า", category: "อื่นๆ", costPrice: 1900, sellPrice: 2800, quantity: 2, minQuantity: 1, image: "/products/tool.svg" },
];

async function main() {
  const existing = await prisma.retailProduct.count();
  if (existing > 0) {
    console.log(`มีสินค้าอยู่แล้ว ${existing} รายการ — ข้ามการ seed`);
    return;
  }

  for (const product of PRODUCTS) {
    await prisma.retailProduct.create({ data: product });
  }
  console.log(`Seed เรียบร้อย: เพิ่มสินค้า ${PRODUCTS.length} รายการ`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
