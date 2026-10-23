# PomJame Shop — Design System

ระบบจัดการร้านรับจำนำ + POS ภาษาไทย ใช้งานจริงที่เคาน์เตอร์ร้านทุกวัน
โหมดของผลิตภัณฑ์คือ **Operate** — เป้าหมายของผู้ใช้คือ "ทำงานเสร็จเร็วและไม่กดพลาด"
ความสง่างามจึงมาจากความแม่นยำ ไม่ใช่การตกแต่ง

ทิศทางภาพ: **teal / gold / coral บนพื้น cream** — อบอุ่นแบบร้านของมือสอง
แต่ตัวเลขและตารางต้องคมและอ่านง่ายกว่าร้านค้าทั่วไป
ทุกหน้าจอใช้ภาษาไทย ตัวเลขเป็นจำนวนเต็มบาท ไม่มีทศนิยม

---

## Typography

**ฟอนต์ UI: Noto Sans Thai** (variable 400–800) — มีหัว อ่านง่ายทั้งไทยและเลขละติน
โหลดผ่าน `next/font/google` แล้ว self-host ที่ build (เปิดร้านแบบออฟไลน์ได้)
**ฟอนต์รหัสอ้างอิง: Geist Mono** — เลขสัญญา `PC-YYYYMMDD-xxx`, เลขใบเสร็จ

| บทบาท | คลาส | ขนาด / น้ำหนัก |
|---|---|---|
| ชื่อหน้า | `text-[1.6rem] sm:text-[1.75rem] font-extrabold tracking-tight` | 25.6 / 28px, 800 |
| หัวข้อการ์ด | `text-sm font-extrabold uppercase tracking-wide` | 14px, 800 |
| เนื้อหา / ตาราง | `text-sm` | 14px |
| ข้อความรอง | `text-xs font-medium text-zinc-500` | 12px |
| ตัวเลขเงินหลัก | `text-3xl sm:text-4xl font-extrabold tabular-nums` | 30 / 36px |
| ตัวเลขในตาราง | `tabular-nums` (มี rule ระดับ `table` แล้ว) | ตามบริบท |

- ภาษาไทยต้องการระยะบรรทัดมากกว่าละติน: `text-xs` 1.6, `text-sm` 1.65, `text-base` 1.7 (ตั้งใน `@theme`)
- ห้ามใช้ตัวอักษรเล็กกว่า 12px กับข้อความไทย
- ตัวเลขทุกตัวที่ต้องเทียบหลัก (เงิน, จำนวน, วันที่) ต้อง `tabular-nums`

---

## Colors

| Token | Hex | ใช้กับ |
|---|---|---|
| `primary` | `#2BA8A2` | ไอคอน, แถบ active, เน้นพื้น |
| `primary-light` | `#3CC4BD` | ไล่สี, hover |
| `primary-dark` | `#17756F` | **ข้อความ** หัวข้อ ลิงก์ (ผ่าน AA บนพื้นขาว) |
| `primary-bg` | `#E8F6F5` | พื้น teal อ่อน |
| `accent` | `#FFD23F` | CTA หลัก (gold) — ตัวอักษรบนปุ่มเป็น `zinc-900` |
| `accent-light` / `accent-dark` | `#FFE47A` / `#E6B800` | ไล่สี gold, hover |
| `coral` | `#EF6C4A` | เตือน, หลุดจำนำ, ลบ |
| `coral-dark` | `#C2472E` | **ข้อความ** เตือน/ติดลบ (ผ่าน AA) |
| `cream` | `#FFF8E7` | พื้น input, การ์ดเน้น, ใบเสร็จ |
| `surface-base` | `#EFF8F7` | พื้นหลังแอป |
| `surface-card` | `#FFFFFF` | การ์ด/ตาราง |
| `success` | `#27AE60` | ยอดขาย, สถานะสำเร็จ |
| `error` | `#E74C3C` | ข้อผิดพลาด/ติดลบ |

**กฎสี:** teal = ข้อมูล/นำทาง, gold = การกระทำหลัก, coral = เตือน/ทำลาย, เขียว = เงินเข้า
ไม่ใช้สีเพียงอย่างเดียวสื่อความหมาย — ต้องมีคำหรือเครื่องหมาย `+` / `−` กำกับเสมอ
ข้อความบนพื้นต้องใช้ `primary-dark` / `coral-dark` / `zinc-600` ขึ้นไป (ไม่ใช้ `zinc-400` กับข้อความ)

---

## Spacing, radius, elevation

- ระยะห่างพื้นฐาน: 4px scale — ใช้ `gap-2/3/4`, `space-y-4/5/6`
- Page shell: `max-w-7xl`, `px-4 pb-6 pt-16 lg:p-6` (เผื่อปุ่มเมนูลอยบนมือถือ; POS เต็มความสูง `calc(100vh - 5.5rem)` / `lg:calc(100vh - 3rem)`)
- Radius: input/การ์ดเล็ก `rounded-xl` (12), การ์ด `rounded-2xl` (16), modal/ฟอร์มใหญ่ `rounded-3xl` (24), ปุ่ม/ชิป/แบดจ์ `rounded-full`
- เงา: `shadow-card` (teal 14%), `shadow-glow-teal`, `shadow-glow-gold`, `shadow-glow-coral`
- เส้นแบ่ง section ใช้ `border-b-2 border-dashed border-primary/25` — เป็นเอกลักษณ์ของระบบ

---

## Components (`src/components/ui.tsx`)

- **Button** — pill, สูง 36/44/48px. `primary` (gold gradient) = การกระทำหลัก 1 ปุ่มต่อบริบท,
  `secondary` (teal outline) = ทางเลือก, `ghost` = ในตาราง, `danger` = ลบ, `success` = ชำระเงิน
- **Input / Select / Textarea** — สูง 44px (`h-11`), พื้น cream, `text-base` บนมือถือ (กัน iOS zoom),
  `text-sm` บน desktop, focus ring 4px `primary/15`
- **Field** — label 14px semibold, hint/error 12px ใต้ช่อง; error ใช้ `coral-dark`
- **Card** — `rounded-2xl border border-primary/20 bg-surface-card shadow-card`
- **PageHeader** — ชื่อหน้า + คำอธิบาย + ปุ่มหลักทางขวา + `back` + `badge`; ทุกหน้าต้องใช้ตัวนี้
- **CardHeader** — หัวการ์ดเส้นประ + meta/action
- **EmptyState** — บอกสิ่งที่เกิดขึ้นและทางออก (ไม่ใช่แค่ "ไม่มีข้อมูล")
- **Badge** — tone: gray/teal/gold/coral/green/sky/red, 12px bold
- **Pagination** — ปุ่ม 36px, `aria-label` ภาษาไทย, แสดง "หน้า x / y"

---

## Patterns

- **ตาราง desktop + การ์ดมือถือ**: ตาราง ≤5 คอลัมน์สลับที่ `lg` (1024px), ตาราง 6–8 คอลัมน์ (`/pawns`, `/manage`, `/reports`, `/products`)
  สลับที่ `xl` (1280px) เพราะ sidebar กิน 256px — ต่ำกว่านั้นใช้การ์ดเพื่อไม่ให้ตารางถูกบีบ; หัวตาราง `bg-primary/[0.04]`, 12px semibold uppercase, คอลัมน์ตัวเลขชิดขวา
- **ตัวกรอง**: ชิป pill — active `bg-primary-dark text-white`, ไม่ active `border-2 border-primary/20 bg-white`
- **Modal**: bottom sheet บนมือถือ → center บน desktop, `role="dialog" aria-modal="true"`,
  ปิดด้วยการกดฉากหลัง/ปุ่ม X, ปุ่มหลักอยู่ขวาล่าง
- **เงิน**: `formatBaht` เท่านั้น, ลบนำด้วย `−`, รายรับ `+`, ใช้ `text-coral-dark` เฉพาะยอดติดลบ
  ไม่ใช้สีเขียว/แดงกับทุกตัวเลขจนตาล้า

---

## Accessibility

- เป้ากดขั้นต่ำ 44px (ปุ่ม/ช่องกรอก/เมนู); ปุ่มไอคอนในตาราง 36px
- โฟกัสมองเห็นเสมอ: `outline: 2px solid primary-dark` (global rule)
- `aria-current="page"` ที่เมนูที่ active, `aria-label` ที่ปุ่มไอคอน, `scope="col"` ที่หัวตาราง
- เคารพ `prefers-reduced-motion` (ปิด animation)
- ข้อความปกติต้อง ≥ 4.5:1 — ใช้ `zinc-600`/`zinc-700` เป็นข้อความรอง ไม่ใช้ `zinc-400`

---

## Do / Don't

1. **Do** ใช้ `PageHeader` และ `Card` กลางทุกหน้า — ห้ามเขียนหัวหน้าใหม่เอง
2. **Do** ให้ตัวเลขเงินมี `tabular-nums` และชิดขวาในตาราง
3. **Do** ใช้ `h-11` กับช่องกรอกและปุ่มบนมือถือ
4. **Don't** ใส่แถบสีหนา (`border-l-8`) ข้างการ์ดเป็น decoration
5. **Don't** ใช้ gradient teal + ตัวอักษรขาวกับข้อความขนาดเล็ก (คอนทราสต์ไม่ผ่าน) — ใช้ `primary-dark` ทึบ
6. **Don't** ซ้อนการ์ดในการ์ด หรือใส่ขอบ 2px ทุกที่; 1px + เงาเพียงพอ
7. **Don't** ใช้ `text-[10px]` / `text-[11px]` กับข้อความไทย
