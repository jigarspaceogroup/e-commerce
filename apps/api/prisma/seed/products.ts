import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { ProductStatus } from "../../src/generated/prisma/client.js";
import { CATEGORY_IDS } from "./categories.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic UUID for a product by index (1-based). */
function productId(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `f1000000-0000-4000-8000-${hex}`;
}

/** Deterministic UUID for a variant by product index + variant index. */
function variantId(productIdx: number, variantIdx: number): string {
  const combined = productIdx * 100 + variantIdx;
  const hex = combined.toString(16).padStart(12, "0");
  return `f2000000-0000-4000-8000-${hex}`;
}

/** Deterministic UUID for an image. */
function imageId(productIdx: number, imgIdx: number): string {
  const combined = productIdx * 100 + imgIdx;
  const hex = combined.toString(16).padStart(12, "0");
  return `f3000000-0000-4000-8000-${hex}`;
}

function placeholderImg(productIdx: number, imgIdx: number): string {
  return `https://placehold.co/600x600?text=Product+${productIdx}+Img+${imgIdx}`;
}

// ---------------------------------------------------------------------------
// Product data
// ---------------------------------------------------------------------------

interface VariantSeed {
  sku: string;
  priceOverride: number | null;
  stockQuantity: number;
  safetyStock: number;
  lowStockThreshold: number;
  attributes: Record<string, string>;
}

interface ProductSeed {
  idx: number;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  basePrice: number;
  compareAtPrice: number | null;
  brand: string | null;
  slug: string;
  status: ProductStatus;
  categoryId: string;
  imageCount: number;
  variants: VariantSeed[];
}

// 50 products spread across categories
const PRODUCTS: ProductSeed[] = [
  // ==================== ELECTRONICS — Smartphones ====================
  {
    idx: 1,
    titleEn: "Samsung Galaxy S25 Ultra",
    titleAr: "سامسونج جالكسي اس 25 الترا",
    descriptionEn: "The latest Samsung flagship with advanced AI features, 200MP camera, and S Pen support.",
    descriptionAr: "أحدث هاتف سامسونج الرائد مع ميزات الذكاء الاصطناعي المتقدمة وكاميرا 200 ميجابكسل ودعم قلم S.",
    basePrice: 4999,
    compareAtPrice: 5499,
    brand: "Samsung",
    slug: "samsung-galaxy-s25-ultra",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.ANDROID_PHONES,
    imageCount: 5,
    variants: [
      { sku: "SGS25U-256-BLK", priceOverride: null, stockQuantity: 100, safetyStock: 10, lowStockThreshold: 15, attributes: { storage: "256GB", color: "Black" } },
      { sku: "SGS25U-256-GRN", priceOverride: null, stockQuantity: 75, safetyStock: 10, lowStockThreshold: 15, attributes: { storage: "256GB", color: "Green" } },
      { sku: "SGS25U-512-BLK", priceOverride: 5499, stockQuantity: 50, safetyStock: 5, lowStockThreshold: 10, attributes: { storage: "512GB", color: "Black" } },
      { sku: "SGS25U-512-BLU", priceOverride: 5499, stockQuantity: 8, safetyStock: 5, lowStockThreshold: 10, attributes: { storage: "512GB", color: "Blue" } },
    ],
  },
  {
    idx: 2,
    titleEn: "Samsung Galaxy A55",
    titleAr: "سامسونج جالكسي ايه 55",
    descriptionEn: "Mid-range Samsung smartphone with Super AMOLED display and 5000mAh battery.",
    descriptionAr: "هاتف سامسونج متوسط الفئة مع شاشة سوبر أموليد وبطارية 5000 مللي أمبير.",
    basePrice: 1499,
    compareAtPrice: null,
    brand: "Samsung",
    slug: "samsung-galaxy-a55",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.ANDROID_PHONES,
    imageCount: 4,
    variants: [
      { sku: "SGA55-128-BLK", priceOverride: null, stockQuantity: 200, safetyStock: 20, lowStockThreshold: 30, attributes: { storage: "128GB", color: "Black" } },
      { sku: "SGA55-128-LVN", priceOverride: null, stockQuantity: 150, safetyStock: 20, lowStockThreshold: 30, attributes: { storage: "128GB", color: "Lavender" } },
      { sku: "SGA55-256-BLK", priceOverride: 1699, stockQuantity: 80, safetyStock: 10, lowStockThreshold: 15, attributes: { storage: "256GB", color: "Black" } },
    ],
  },
  {
    idx: 3,
    titleEn: "Google Pixel 9 Pro",
    titleAr: "جوجل بكسل 9 برو",
    descriptionEn: "Google's flagship phone with the best AI camera experience and Tensor G4 chip.",
    descriptionAr: "هاتف جوجل الرائد مع أفضل تجربة كاميرا بالذكاء الاصطناعي ومعالج تنسور G4.",
    basePrice: 3799,
    compareAtPrice: null,
    brand: "Google",
    slug: "google-pixel-9-pro",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.ANDROID_PHONES,
    imageCount: 4,
    variants: [
      { sku: "GP9P-128-WHT", priceOverride: null, stockQuantity: 60, safetyStock: 5, lowStockThreshold: 10, attributes: { storage: "128GB", color: "Porcelain" } },
      { sku: "GP9P-256-BLK", priceOverride: 4099, stockQuantity: 5, safetyStock: 5, lowStockThreshold: 10, attributes: { storage: "256GB", color: "Obsidian" } },
    ],
  },
  {
    idx: 4,
    titleEn: "iPhone 16 Pro Max",
    titleAr: "آيفون 16 برو ماكس",
    descriptionEn: "Apple's most powerful iPhone with A18 Pro chip, titanium design, and 48MP camera system.",
    descriptionAr: "أقوى آيفون من أبل مع معالج A18 برو وتصميم تيتانيوم ونظام كاميرا 48 ميجابكسل.",
    basePrice: 5299,
    compareAtPrice: null,
    brand: "Apple",
    slug: "iphone-16-pro-max",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.IPHONES,
    imageCount: 5,
    variants: [
      { sku: "IP16PM-256-NAT", priceOverride: null, stockQuantity: 120, safetyStock: 10, lowStockThreshold: 20, attributes: { storage: "256GB", color: "Natural Titanium" } },
      { sku: "IP16PM-256-BLK", priceOverride: null, stockQuantity: 90, safetyStock: 10, lowStockThreshold: 20, attributes: { storage: "256GB", color: "Black Titanium" } },
      { sku: "IP16PM-512-NAT", priceOverride: 5999, stockQuantity: 40, safetyStock: 5, lowStockThreshold: 10, attributes: { storage: "512GB", color: "Natural Titanium" } },
      { sku: "IP16PM-1TB-BLK", priceOverride: 6999, stockQuantity: 0, safetyStock: 5, lowStockThreshold: 10, attributes: { storage: "1TB", color: "Black Titanium" } },
    ],
  },
  {
    idx: 5,
    titleEn: "iPhone 16",
    titleAr: "آيفون 16",
    descriptionEn: "The standard iPhone 16 with A18 chip, dynamic island, and improved battery life.",
    descriptionAr: "آيفون 16 القياسي مع معالج A18 والجزيرة الديناميكية وعمر بطارية محسن.",
    basePrice: 3499,
    compareAtPrice: null,
    brand: "Apple",
    slug: "iphone-16",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.IPHONES,
    imageCount: 4,
    variants: [
      { sku: "IP16-128-BLK", priceOverride: null, stockQuantity: 200, safetyStock: 15, lowStockThreshold: 25, attributes: { storage: "128GB", color: "Black" } },
      { sku: "IP16-128-BLU", priceOverride: null, stockQuantity: 150, safetyStock: 15, lowStockThreshold: 25, attributes: { storage: "128GB", color: "Blue" } },
      { sku: "IP16-256-PNK", priceOverride: 3899, stockQuantity: 70, safetyStock: 10, lowStockThreshold: 15, attributes: { storage: "256GB", color: "Pink" } },
    ],
  },

  // ==================== ELECTRONICS — Laptops ====================
  {
    idx: 6,
    titleEn: "ASUS ROG Strix G16",
    titleAr: "اسوس روج ستريكس جي 16",
    descriptionEn: "Gaming laptop with Intel i9, RTX 4070, 16\" QHD 240Hz display.",
    descriptionAr: "لابتوب ألعاب بمعالج انتل i9 وكرت شاشة RTX 4070 وشاشة 16 بوصة QHD بتردد 240 هرتز.",
    basePrice: 4999,
    compareAtPrice: 5499,
    brand: "ASUS",
    slug: "asus-rog-strix-g16",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.GAMING_LAPTOPS,
    imageCount: 4,
    variants: [
      { sku: "ROG-G16-16-512", priceOverride: null, stockQuantity: 30, safetyStock: 3, lowStockThreshold: 5, attributes: { ram: "16GB", storage: "512GB SSD" } },
      { sku: "ROG-G16-32-1TB", priceOverride: 5799, stockQuantity: 15, safetyStock: 3, lowStockThreshold: 5, attributes: { ram: "32GB", storage: "1TB SSD" } },
    ],
  },
  {
    idx: 7,
    titleEn: "MSI Katana 15",
    titleAr: "ام اس آي كاتانا 15",
    descriptionEn: "Budget gaming laptop with RTX 4060 and 144Hz display.",
    descriptionAr: "لابتوب ألعاب اقتصادي مع كرت شاشة RTX 4060 وشاشة 144 هرتز.",
    basePrice: 3299,
    compareAtPrice: 3699,
    brand: "MSI",
    slug: "msi-katana-15",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.GAMING_LAPTOPS,
    imageCount: 3,
    variants: [
      { sku: "MSI-K15-16-512", priceOverride: null, stockQuantity: 55, safetyStock: 5, lowStockThreshold: 10, attributes: { ram: "16GB", storage: "512GB SSD" } },
    ],
  },
  {
    idx: 8,
    titleEn: "Lenovo ThinkPad X1 Carbon Gen 12",
    titleAr: "لينوفو ثنكباد اكس 1 كاربون الجيل 12",
    descriptionEn: "Ultra-lightweight business laptop with Intel vPro and 14\" 2.8K OLED display.",
    descriptionAr: "لابتوب أعمال خفيف الوزن مع انتل vPro وشاشة 14 بوصة أوليد 2.8K.",
    basePrice: 6499,
    compareAtPrice: null,
    brand: "Lenovo",
    slug: "lenovo-thinkpad-x1-carbon-gen12",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BUSINESS_LAPTOPS,
    imageCount: 4,
    variants: [
      { sku: "TP-X1C12-16-512", priceOverride: null, stockQuantity: 25, safetyStock: 3, lowStockThreshold: 5, attributes: { ram: "16GB", storage: "512GB SSD" } },
      { sku: "TP-X1C12-32-1TB", priceOverride: 7499, stockQuantity: 10, safetyStock: 2, lowStockThreshold: 5, attributes: { ram: "32GB", storage: "1TB SSD" } },
    ],
  },
  {
    idx: 9,
    titleEn: "MacBook Pro 16\" M4 Pro",
    titleAr: "ماك بوك برو 16 بوصة M4 برو",
    descriptionEn: "Apple MacBook Pro with M4 Pro chip, Liquid Retina XDR display, and up to 22 hours battery.",
    descriptionAr: "ماك بوك برو من أبل مع معالج M4 برو وشاشة ليكويد ريتنا XDR وبطارية تدوم حتى 22 ساعة.",
    basePrice: 9999,
    compareAtPrice: null,
    brand: "Apple",
    slug: "macbook-pro-16-m4-pro",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BUSINESS_LAPTOPS,
    imageCount: 5,
    variants: [
      { sku: "MBP16-M4P-18-512", priceOverride: null, stockQuantity: 35, safetyStock: 3, lowStockThreshold: 8, attributes: { ram: "18GB", storage: "512GB SSD", color: "Space Black" } },
      { sku: "MBP16-M4P-36-1TB", priceOverride: 12499, stockQuantity: 7, safetyStock: 2, lowStockThreshold: 5, attributes: { ram: "36GB", storage: "1TB SSD", color: "Silver" } },
    ],
  },

  // ==================== ELECTRONICS — Audio ====================
  {
    idx: 10,
    titleEn: "Sony WH-1000XM6",
    titleAr: "سوني WH-1000XM6",
    descriptionEn: "Industry-leading noise cancelling headphones with 40-hour battery and multipoint connectivity.",
    descriptionAr: "سماعات إلغاء ضوضاء رائدة في الصناعة مع بطارية 40 ساعة واتصال متعدد النقاط.",
    basePrice: 1499,
    compareAtPrice: 1699,
    brand: "Sony",
    slug: "sony-wh1000xm6",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.HEADPHONES,
    imageCount: 4,
    variants: [
      { sku: "SONY-XM6-BLK", priceOverride: null, stockQuantity: 150, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Black" } },
      { sku: "SONY-XM6-SLV", priceOverride: null, stockQuantity: 100, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Silver" } },
      { sku: "SONY-XM6-BLU", priceOverride: null, stockQuantity: 0, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Midnight Blue" } },
    ],
  },
  {
    idx: 11,
    titleEn: "AirPods Pro 3",
    titleAr: "ايربودز برو 3",
    descriptionEn: "Apple AirPods Pro with adaptive noise cancellation, spatial audio, and USB-C.",
    descriptionAr: "ايربودز برو من أبل مع إلغاء ضوضاء تكيفي وصوت مكاني ومنفذ USB-C.",
    basePrice: 999,
    compareAtPrice: null,
    brand: "Apple",
    slug: "airpods-pro-3",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.HEADPHONES,
    imageCount: 3,
    variants: [
      { sku: "APP3-WHT", priceOverride: null, stockQuantity: 300, safetyStock: 25, lowStockThreshold: 40, attributes: { color: "White" } },
    ],
  },
  {
    idx: 12,
    titleEn: "JBL Charge 6",
    titleAr: "جي بي ال تشارج 6",
    descriptionEn: "Portable Bluetooth speaker with powerful bass and 24-hour playtime.",
    descriptionAr: "مكبر صوت بلوتوث محمول مع صوت جهير قوي ووقت تشغيل 24 ساعة.",
    basePrice: 599,
    compareAtPrice: 699,
    brand: "JBL",
    slug: "jbl-charge-6",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.SPEAKERS,
    imageCount: 3,
    variants: [
      { sku: "JBL-CH6-BLK", priceOverride: null, stockQuantity: 80, safetyStock: 8, lowStockThreshold: 15, attributes: { color: "Black" } },
      { sku: "JBL-CH6-RED", priceOverride: null, stockQuantity: 60, safetyStock: 8, lowStockThreshold: 15, attributes: { color: "Red" } },
      { sku: "JBL-CH6-TL", priceOverride: null, stockQuantity: 9, safetyStock: 5, lowStockThreshold: 10, attributes: { color: "Teal" } },
    ],
  },
  {
    idx: 13,
    titleEn: "Sonos Era 300",
    titleAr: "سونوس ايرا 300",
    descriptionEn: "Premium smart speaker with Dolby Atmos spatial audio and voice control.",
    descriptionAr: "مكبر صوت ذكي متميز مع صوت مكاني دولبي أتموس وتحكم صوتي.",
    basePrice: 1799,
    compareAtPrice: null,
    brand: "Sonos",
    slug: "sonos-era-300",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.SPEAKERS,
    imageCount: 3,
    variants: [
      { sku: "SONOS-E300-BLK", priceOverride: null, stockQuantity: 20, safetyStock: 2, lowStockThreshold: 5, attributes: { color: "Black" } },
      { sku: "SONOS-E300-WHT", priceOverride: null, stockQuantity: 15, safetyStock: 2, lowStockThreshold: 5, attributes: { color: "White" } },
    ],
  },

  // ==================== FASHION — Men's Clothing ====================
  {
    idx: 14,
    titleEn: "Premium White Thobe",
    titleAr: "ثوب أبيض فاخر",
    descriptionEn: "Classic Saudi white thobe made from premium cotton with elegant cufflinks.",
    descriptionAr: "ثوب أبيض سعودي كلاسيكي مصنوع من القطن الفاخر مع أزرار أكمام أنيقة.",
    basePrice: 450,
    compareAtPrice: null,
    brand: "Al-Khaleej",
    slug: "premium-white-thobe",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.MENS_THOBES,
    imageCount: 4,
    variants: [
      { sku: "THB-WHT-S", priceOverride: null, stockQuantity: 100, safetyStock: 10, lowStockThreshold: 20, attributes: { size: "S", color: "White" } },
      { sku: "THB-WHT-M", priceOverride: null, stockQuantity: 150, safetyStock: 10, lowStockThreshold: 20, attributes: { size: "M", color: "White" } },
      { sku: "THB-WHT-L", priceOverride: null, stockQuantity: 120, safetyStock: 10, lowStockThreshold: 20, attributes: { size: "L", color: "White" } },
      { sku: "THB-WHT-XL", priceOverride: null, stockQuantity: 80, safetyStock: 10, lowStockThreshold: 20, attributes: { size: "XL", color: "White" } },
    ],
  },
  {
    idx: 15,
    titleEn: "Embroidered Bisht",
    titleAr: "بشت مطرز",
    descriptionEn: "Traditional embroidered bisht for special occasions, handmade with gold threading.",
    descriptionAr: "بشت تقليدي مطرز للمناسبات الخاصة، مصنوع يدويا بخيوط ذهبية.",
    basePrice: 2500,
    compareAtPrice: 3000,
    brand: "Al-Khaleej",
    slug: "embroidered-bisht",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.MENS_THOBES,
    imageCount: 3,
    variants: [
      { sku: "BSHT-BRN-M", priceOverride: null, stockQuantity: 15, safetyStock: 2, lowStockThreshold: 5, attributes: { size: "M", color: "Brown" } },
      { sku: "BSHT-BRN-L", priceOverride: null, stockQuantity: 10, safetyStock: 2, lowStockThreshold: 5, attributes: { size: "L", color: "Brown" } },
      { sku: "BSHT-BLK-L", priceOverride: null, stockQuantity: 8, safetyStock: 2, lowStockThreshold: 5, attributes: { size: "L", color: "Black" } },
    ],
  },
  {
    idx: 16,
    titleEn: "Slim Fit Cotton Polo",
    titleAr: "بولو قطن سليم فت",
    descriptionEn: "Classic cotton polo shirt with slim fit and ribbed collar.",
    descriptionAr: "قميص بولو قطن كلاسيكي بقصة ضيقة وياقة محبوكة.",
    basePrice: 189,
    compareAtPrice: null,
    brand: "Urban Style",
    slug: "slim-fit-cotton-polo",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.MENS_CASUAL,
    imageCount: 3,
    variants: [
      { sku: "POLO-NVY-S", priceOverride: null, stockQuantity: 200, safetyStock: 20, lowStockThreshold: 30, attributes: { size: "S", color: "Navy" } },
      { sku: "POLO-NVY-M", priceOverride: null, stockQuantity: 250, safetyStock: 20, lowStockThreshold: 30, attributes: { size: "M", color: "Navy" } },
      { sku: "POLO-WHT-M", priceOverride: null, stockQuantity: 180, safetyStock: 20, lowStockThreshold: 30, attributes: { size: "M", color: "White" } },
      { sku: "POLO-WHT-L", priceOverride: null, stockQuantity: 160, safetyStock: 20, lowStockThreshold: 30, attributes: { size: "L", color: "White" } },
    ],
  },
  {
    idx: 17,
    titleEn: "Stretch Chino Pants",
    titleAr: "بنطلون شينو مطاطي",
    descriptionEn: "Comfortable stretch chino pants for everyday casual wear.",
    descriptionAr: "بنطلون شينو مريح مطاطي للارتداء اليومي الكاجوال.",
    basePrice: 229,
    compareAtPrice: 299,
    brand: "Urban Style",
    slug: "stretch-chino-pants",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.MENS_CASUAL,
    imageCount: 3,
    variants: [
      { sku: "CHINO-KHK-30", priceOverride: null, stockQuantity: 90, safetyStock: 10, lowStockThreshold: 15, attributes: { size: "30", color: "Khaki" } },
      { sku: "CHINO-KHK-32", priceOverride: null, stockQuantity: 110, safetyStock: 10, lowStockThreshold: 15, attributes: { size: "32", color: "Khaki" } },
      { sku: "CHINO-NVY-32", priceOverride: null, stockQuantity: 85, safetyStock: 10, lowStockThreshold: 15, attributes: { size: "32", color: "Navy" } },
      { sku: "CHINO-NVY-34", priceOverride: null, stockQuantity: 70, safetyStock: 10, lowStockThreshold: 15, attributes: { size: "34", color: "Navy" } },
    ],
  },

  // ==================== FASHION — Women's Clothing ====================
  {
    idx: 18,
    titleEn: "Embroidered Black Abaya",
    titleAr: "عباية سوداء مطرزة",
    descriptionEn: "Elegant black abaya with intricate gold embroidery and flowing silhouette.",
    descriptionAr: "عباية سوداء أنيقة مع تطريز ذهبي دقيق وقصة انسيابية.",
    basePrice: 750,
    compareAtPrice: 950,
    brand: "Dar Al-Abaya",
    slug: "embroidered-black-abaya",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WOMENS_ABAYAS,
    imageCount: 4,
    variants: [
      { sku: "ABY-BLK-S", priceOverride: null, stockQuantity: 60, safetyStock: 5, lowStockThreshold: 10, attributes: { size: "S" } },
      { sku: "ABY-BLK-M", priceOverride: null, stockQuantity: 80, safetyStock: 5, lowStockThreshold: 10, attributes: { size: "M" } },
      { sku: "ABY-BLK-L", priceOverride: null, stockQuantity: 50, safetyStock: 5, lowStockThreshold: 10, attributes: { size: "L" } },
    ],
  },
  {
    idx: 19,
    titleEn: "Modern Open Abaya",
    titleAr: "عباية مفتوحة عصرية",
    descriptionEn: "Contemporary open-front abaya in earth tones with belt detail.",
    descriptionAr: "عباية عصرية مفتوحة من الأمام بألوان ترابية مع تفصيل حزام.",
    basePrice: 550,
    compareAtPrice: null,
    brand: "Dar Al-Abaya",
    slug: "modern-open-abaya",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WOMENS_ABAYAS,
    imageCount: 3,
    variants: [
      { sku: "OABY-BEG-S", priceOverride: null, stockQuantity: 40, safetyStock: 4, lowStockThreshold: 8, attributes: { size: "S", color: "Beige" } },
      { sku: "OABY-BEG-M", priceOverride: null, stockQuantity: 55, safetyStock: 4, lowStockThreshold: 8, attributes: { size: "M", color: "Beige" } },
      { sku: "OABY-OLV-M", priceOverride: null, stockQuantity: 35, safetyStock: 4, lowStockThreshold: 8, attributes: { size: "M", color: "Olive" } },
    ],
  },
  {
    idx: 20,
    titleEn: "Floral Print Maxi Dress",
    titleAr: "فستان ماكسي بطبعة زهور",
    descriptionEn: "Flowing maxi dress with delicate floral print and modest neckline.",
    descriptionAr: "فستان ماكسي انسيابي بطبعة زهور ناعمة وياقة محتشمة.",
    basePrice: 399,
    compareAtPrice: 499,
    brand: "Nora Fashion",
    slug: "floral-print-maxi-dress",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WOMENS_CASUAL,
    imageCount: 4,
    variants: [
      { sku: "MAXI-FLR-S", priceOverride: null, stockQuantity: 75, safetyStock: 8, lowStockThreshold: 12, attributes: { size: "S", color: "Floral Blue" } },
      { sku: "MAXI-FLR-M", priceOverride: null, stockQuantity: 90, safetyStock: 8, lowStockThreshold: 12, attributes: { size: "M", color: "Floral Blue" } },
      { sku: "MAXI-FLR-L", priceOverride: null, stockQuantity: 60, safetyStock: 8, lowStockThreshold: 12, attributes: { size: "L", color: "Floral Blue" } },
    ],
  },
  {
    idx: 21,
    titleEn: "Linen Relaxed Blouse",
    titleAr: "بلوزة كتان واسعة",
    descriptionEn: "Breathable linen blouse with relaxed fit, perfect for warm weather.",
    descriptionAr: "بلوزة كتان منسدلة بقصة واسعة، مثالية للطقس الحار.",
    basePrice: 249,
    compareAtPrice: null,
    brand: "Nora Fashion",
    slug: "linen-relaxed-blouse",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WOMENS_CASUAL,
    imageCount: 3,
    variants: [
      { sku: "BLOUSE-WHT-S", priceOverride: null, stockQuantity: 120, safetyStock: 10, lowStockThreshold: 20, attributes: { size: "S", color: "White" } },
      { sku: "BLOUSE-WHT-M", priceOverride: null, stockQuantity: 140, safetyStock: 10, lowStockThreshold: 20, attributes: { size: "M", color: "White" } },
      { sku: "BLOUSE-SAG-M", priceOverride: null, stockQuantity: 80, safetyStock: 10, lowStockThreshold: 20, attributes: { size: "M", color: "Sage" } },
    ],
  },

  // ==================== FASHION — Accessories ====================
  {
    idx: 22,
    titleEn: "Casio G-Shock GA-2100",
    titleAr: "كاسيو جي شوك GA-2100",
    descriptionEn: "Iconic CasiOak design with carbon core guard, 200m water resistance.",
    descriptionAr: "تصميم كاسي أوك الأيقوني مع حماية كربونية ومقاومة مياه 200 متر.",
    basePrice: 449,
    compareAtPrice: 499,
    brand: "Casio",
    slug: "casio-gshock-ga2100",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WATCHES,
    imageCount: 3,
    variants: [
      { sku: "GSHK-GA2100-BLK", priceOverride: null, stockQuantity: 200, safetyStock: 15, lowStockThreshold: 25, attributes: { color: "All Black" } },
      { sku: "GSHK-GA2100-NVY", priceOverride: null, stockQuantity: 150, safetyStock: 15, lowStockThreshold: 25, attributes: { color: "Navy" } },
    ],
  },
  {
    idx: 23,
    titleEn: "Tissot PRX Powermatic 80",
    titleAr: "تيسو PRX باورماتيك 80",
    descriptionEn: "Swiss automatic watch with 80-hour power reserve and integrated bracelet.",
    descriptionAr: "ساعة سويسرية أوتوماتيكية باحتياطي طاقة 80 ساعة وسوار مدمج.",
    basePrice: 2799,
    compareAtPrice: null,
    brand: "Tissot",
    slug: "tissot-prx-powermatic-80",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WATCHES,
    imageCount: 4,
    variants: [
      { sku: "TISSOT-PRX-SLV", priceOverride: null, stockQuantity: 20, safetyStock: 2, lowStockThreshold: 5, attributes: { color: "Silver Dial" } },
      { sku: "TISSOT-PRX-BLU", priceOverride: null, stockQuantity: 15, safetyStock: 2, lowStockThreshold: 5, attributes: { color: "Blue Dial" } },
    ],
  },
  {
    idx: 24,
    titleEn: "Leather Crossbody Bag",
    titleAr: "حقيبة كروس بودي جلدية",
    descriptionEn: "Genuine leather crossbody bag with adjustable strap and multiple compartments.",
    descriptionAr: "حقيبة كروس بودي من الجلد الطبيعي مع حزام قابل للتعديل وجيوب متعددة.",
    basePrice: 599,
    compareAtPrice: 749,
    brand: "Luxe Bags",
    slug: "leather-crossbody-bag",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BAGS,
    imageCount: 4,
    variants: [
      { sku: "XBAG-BRN", priceOverride: null, stockQuantity: 65, safetyStock: 5, lowStockThreshold: 10, attributes: { color: "Brown" } },
      { sku: "XBAG-BLK", priceOverride: null, stockQuantity: 80, safetyStock: 5, lowStockThreshold: 10, attributes: { color: "Black" } },
      { sku: "XBAG-TAN", priceOverride: null, stockQuantity: 45, safetyStock: 5, lowStockThreshold: 10, attributes: { color: "Tan" } },
    ],
  },
  {
    idx: 25,
    titleEn: "Travel Laptop Backpack",
    titleAr: "حقيبة ظهر للسفر واللابتوب",
    descriptionEn: "Water-resistant backpack with padded laptop compartment and USB charging port.",
    descriptionAr: "حقيبة ظهر مقاومة للماء مع جيب لابتوب مبطن ومنفذ شحن USB.",
    basePrice: 349,
    compareAtPrice: null,
    brand: "TechPack",
    slug: "travel-laptop-backpack",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BAGS,
    imageCount: 3,
    variants: [
      { sku: "BKPK-BLK", priceOverride: null, stockQuantity: 120, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Black" } },
      { sku: "BKPK-GRY", priceOverride: null, stockQuantity: 90, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Grey" } },
    ],
  },

  // ==================== HOME & KITCHEN — Furniture ====================
  {
    idx: 26,
    titleEn: "L-Shaped Sectional Sofa",
    titleAr: "كنبة زاوية على شكل حرف L",
    descriptionEn: "Modern L-shaped sofa with premium fabric, reversible chaise, and hidden storage.",
    descriptionAr: "كنبة زاوية عصرية بقماش فاخر وشيز لونج قابل للعكس وتخزين مخفي.",
    basePrice: 4500,
    compareAtPrice: 5200,
    brand: "HomeLux",
    slug: "l-shaped-sectional-sofa",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.LIVING_ROOM,
    imageCount: 5,
    variants: [
      { sku: "SOFA-L-GRY", priceOverride: null, stockQuantity: 8, safetyStock: 1, lowStockThreshold: 3, attributes: { color: "Grey" } },
      { sku: "SOFA-L-BEG", priceOverride: null, stockQuantity: 5, safetyStock: 1, lowStockThreshold: 3, attributes: { color: "Beige" } },
      { sku: "SOFA-L-NVY", priceOverride: 4800, stockQuantity: 0, safetyStock: 1, lowStockThreshold: 3, attributes: { color: "Navy" } },
    ],
  },
  {
    idx: 27,
    titleEn: "Marble Coffee Table",
    titleAr: "طاولة قهوة رخامية",
    descriptionEn: "Elegant marble-top coffee table with gold metal legs.",
    descriptionAr: "طاولة قهوة أنيقة بسطح رخامي وأرجل معدنية ذهبية.",
    basePrice: 1200,
    compareAtPrice: null,
    brand: "HomeLux",
    slug: "marble-coffee-table",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.LIVING_ROOM,
    imageCount: 3,
    variants: [
      { sku: "CTBL-MRB-WHT", priceOverride: null, stockQuantity: 18, safetyStock: 2, lowStockThreshold: 5, attributes: { color: "White Marble" } },
      { sku: "CTBL-MRB-BLK", priceOverride: 1350, stockQuantity: 12, safetyStock: 2, lowStockThreshold: 5, attributes: { color: "Black Marble" } },
    ],
  },
  {
    idx: 28,
    titleEn: "King Size Platform Bed",
    titleAr: "سرير بلاتفورم مقاس كينج",
    descriptionEn: "Upholstered king platform bed with tufted headboard and solid wood slats.",
    descriptionAr: "سرير كينج بلاتفورم منجد مع لوح رأسي مبطن وشرائح خشب صلب.",
    basePrice: 3200,
    compareAtPrice: 3800,
    brand: "SleepWell",
    slug: "king-size-platform-bed",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BEDROOM,
    imageCount: 4,
    variants: [
      { sku: "BED-KNG-GRY", priceOverride: null, stockQuantity: 10, safetyStock: 1, lowStockThreshold: 3, attributes: { color: "Grey" } },
      { sku: "BED-KNG-CRM", priceOverride: null, stockQuantity: 7, safetyStock: 1, lowStockThreshold: 3, attributes: { color: "Cream" } },
    ],
  },
  {
    idx: 29,
    titleEn: "3-Door Wardrobe with Mirror",
    titleAr: "خزانة 3 أبواب مع مرآة",
    descriptionEn: "Spacious 3-door wardrobe with full-length mirror, hanging rods, and shelves.",
    descriptionAr: "خزانة واسعة بثلاثة أبواب مع مرآة كاملة الطول وعلاقات ورفوف.",
    basePrice: 2800,
    compareAtPrice: null,
    brand: "SleepWell",
    slug: "3-door-wardrobe-mirror",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BEDROOM,
    imageCount: 3,
    variants: [
      { sku: "WRDB-3D-OAK", priceOverride: null, stockQuantity: 6, safetyStock: 1, lowStockThreshold: 3, attributes: { color: "Oak" } },
      { sku: "WRDB-3D-WHT", priceOverride: null, stockQuantity: 9, safetyStock: 1, lowStockThreshold: 3, attributes: { color: "White" } },
    ],
  },

  // ==================== HOME & KITCHEN — Kitchen Appliances ====================
  {
    idx: 30,
    titleEn: "Vitamix E520 Professional Blender",
    titleAr: "فيتاميكس E520 خلاط احترافي",
    descriptionEn: "Professional-grade blender with variable speed control and self-cleaning cycle.",
    descriptionAr: "خلاط احترافي بتحكم سرعة متغير ودورة تنظيف ذاتي.",
    basePrice: 1899,
    compareAtPrice: 2199,
    brand: "Vitamix",
    slug: "vitamix-e520-blender",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BLENDERS,
    imageCount: 3,
    variants: [
      { sku: "VMX-E520-BLK", priceOverride: null, stockQuantity: 30, safetyStock: 3, lowStockThreshold: 8, attributes: { color: "Black" } },
      { sku: "VMX-E520-RED", priceOverride: null, stockQuantity: 20, safetyStock: 3, lowStockThreshold: 8, attributes: { color: "Red" } },
    ],
  },
  {
    idx: 31,
    titleEn: "Ninja Personal Blender",
    titleAr: "نينجا خلاط شخصي",
    descriptionEn: "Compact personal blender with two travel cups and auto-IQ technology.",
    descriptionAr: "خلاط شخصي صغير مع كوبين للسفر وتقنية أوتو آي كيو.",
    basePrice: 299,
    compareAtPrice: null,
    brand: "Ninja",
    slug: "ninja-personal-blender",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BLENDERS,
    imageCount: 2,
    variants: [
      { sku: "NINJA-PB-GRY", priceOverride: null, stockQuantity: 150, safetyStock: 15, lowStockThreshold: 25, attributes: { color: "Grey" } },
    ],
  },
  {
    idx: 32,
    titleEn: "Breville Barista Express",
    titleAr: "بريفيل باريستا اكسبريس",
    descriptionEn: "Semi-automatic espresso machine with built-in grinder and steam wand.",
    descriptionAr: "ماكينة إسبريسو نصف أوتوماتيكية مع مطحنة مدمجة وعصا بخار.",
    basePrice: 2499,
    compareAtPrice: 2899,
    brand: "Breville",
    slug: "breville-barista-express",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.COFFEE_MACHINES,
    imageCount: 4,
    variants: [
      { sku: "BRV-BE-SLV", priceOverride: null, stockQuantity: 25, safetyStock: 3, lowStockThreshold: 5, attributes: { color: "Brushed Silver" } },
      { sku: "BRV-BE-BLK", priceOverride: null, stockQuantity: 18, safetyStock: 3, lowStockThreshold: 5, attributes: { color: "Black Sesame" } },
    ],
  },
  {
    idx: 33,
    titleEn: "Nespresso Vertuo Next",
    titleAr: "نسبريسو فيرتو نيكست",
    descriptionEn: "Capsule coffee machine with centrifusion brewing and one-touch operation.",
    descriptionAr: "ماكينة قهوة كبسولات مع تخمير بالطرد المركزي وتشغيل بلمسة واحدة.",
    basePrice: 699,
    compareAtPrice: 849,
    brand: "Nespresso",
    slug: "nespresso-vertuo-next",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.COFFEE_MACHINES,
    imageCount: 3,
    variants: [
      { sku: "NSP-VN-BLK", priceOverride: null, stockQuantity: 80, safetyStock: 8, lowStockThreshold: 15, attributes: { color: "Matte Black" } },
      { sku: "NSP-VN-CHR", priceOverride: null, stockQuantity: 60, safetyStock: 8, lowStockThreshold: 15, attributes: { color: "Chrome" } },
    ],
  },

  // ==================== HOME & KITCHEN — Decor ====================
  {
    idx: 34,
    titleEn: "Arabic Calligraphy Canvas Set",
    titleAr: "مجموعة لوحات خط عربي",
    descriptionEn: "Set of 3 canvas prints featuring modern Arabic calligraphy art.",
    descriptionAr: "مجموعة من 3 لوحات كانفاس بفن الخط العربي الحديث.",
    basePrice: 350,
    compareAtPrice: 450,
    brand: "ArtWall",
    slug: "arabic-calligraphy-canvas-set",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WALL_ART,
    imageCount: 3,
    variants: [
      { sku: "CANVAS-ARABIC-SM", priceOverride: null, stockQuantity: 50, safetyStock: 5, lowStockThreshold: 10, attributes: { size: "60x40 cm" } },
      { sku: "CANVAS-ARABIC-LG", priceOverride: 550, stockQuantity: 30, safetyStock: 3, lowStockThreshold: 8, attributes: { size: "90x60 cm" } },
    ],
  },
  {
    idx: 35,
    titleEn: "Geometric Metal Wall Art",
    titleAr: "لوحة جدارية معدنية هندسية",
    descriptionEn: "Modern geometric metal wall art with gold finish.",
    descriptionAr: "لوحة جدارية معدنية هندسية بلمسة ذهبية.",
    basePrice: 280,
    compareAtPrice: null,
    brand: "ArtWall",
    slug: "geometric-metal-wall-art",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WALL_ART,
    imageCount: 2,
    variants: [
      { sku: "MWALL-GEO-GLD", priceOverride: null, stockQuantity: 40, safetyStock: 4, lowStockThreshold: 8, attributes: { finish: "Gold" } },
      { sku: "MWALL-GEO-BLK", priceOverride: null, stockQuantity: 35, safetyStock: 4, lowStockThreshold: 8, attributes: { finish: "Matte Black" } },
    ],
  },
  {
    idx: 36,
    titleEn: "Minimalist Table Lamp",
    titleAr: "مصباح طاولة بسيط",
    descriptionEn: "Scandinavian-style table lamp with fabric shade and wooden base.",
    descriptionAr: "مصباح طاولة بتصميم اسكندنافي مع غطاء قماشي وقاعدة خشبية.",
    basePrice: 199,
    compareAtPrice: null,
    brand: "LightUp",
    slug: "minimalist-table-lamp",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.LIGHTING,
    imageCount: 3,
    variants: [
      { sku: "TLAMP-MIN-WHT", priceOverride: null, stockQuantity: 70, safetyStock: 7, lowStockThreshold: 12, attributes: { color: "White/Oak" } },
      { sku: "TLAMP-MIN-BLK", priceOverride: null, stockQuantity: 55, safetyStock: 7, lowStockThreshold: 12, attributes: { color: "Black/Walnut" } },
    ],
  },
  {
    idx: 37,
    titleEn: "Rattan Floor Lamp",
    titleAr: "مصباح أرضي راتان",
    descriptionEn: "Handwoven rattan floor lamp with warm ambient lighting.",
    descriptionAr: "مصباح أرضي من الراتان المنسوج يدويا مع إضاءة محيطية دافئة.",
    basePrice: 450,
    compareAtPrice: 550,
    brand: "LightUp",
    slug: "rattan-floor-lamp",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.LIGHTING,
    imageCount: 3,
    variants: [
      { sku: "FLAMP-RAT-NAT", priceOverride: null, stockQuantity: 25, safetyStock: 3, lowStockThreshold: 5, attributes: { color: "Natural" } },
    ],
  },

  // ==================== Additional products (to reach 50) ====================
  {
    idx: 38,
    titleEn: "Samsung Galaxy Watch 7",
    titleAr: "ساعة سامسونج جالكسي واتش 7",
    descriptionEn: "Smart fitness watch with advanced health monitoring and Wear OS.",
    descriptionAr: "ساعة لياقة ذكية مع مراقبة صحية متقدمة ونظام Wear OS.",
    basePrice: 1199,
    compareAtPrice: null,
    brand: "Samsung",
    slug: "samsung-galaxy-watch-7",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.WATCHES,
    imageCount: 3,
    variants: [
      { sku: "SGW7-40-GRN", priceOverride: null, stockQuantity: 55, safetyStock: 5, lowStockThreshold: 10, attributes: { size: "40mm", color: "Green" } },
      { sku: "SGW7-44-SLV", priceOverride: 1299, stockQuantity: 40, safetyStock: 5, lowStockThreshold: 10, attributes: { size: "44mm", color: "Silver" } },
    ],
  },
  {
    idx: 39,
    titleEn: "Wireless Charging Pad",
    titleAr: "قاعدة شحن لاسلكية",
    descriptionEn: "15W fast wireless charging pad compatible with all Qi-enabled devices.",
    descriptionAr: "قاعدة شحن لاسلكية سريعة 15 واط متوافقة مع جميع أجهزة Qi.",
    basePrice: 99,
    compareAtPrice: 149,
    brand: "TechPack",
    slug: "wireless-charging-pad",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.ANDROID_PHONES,
    imageCount: 2,
    variants: [
      { sku: "WCHG-BLK", priceOverride: null, stockQuantity: 500, safetyStock: 50, lowStockThreshold: 80, attributes: { color: "Black" } },
      { sku: "WCHG-WHT", priceOverride: null, stockQuantity: 400, safetyStock: 50, lowStockThreshold: 80, attributes: { color: "White" } },
    ],
  },
  {
    idx: 40,
    titleEn: "Premium Leather Wallet",
    titleAr: "محفظة جلدية فاخرة",
    descriptionEn: "Slim RFID-blocking leather wallet with multiple card slots.",
    descriptionAr: "محفظة جلدية رفيعة مانعة لـ RFID مع فتحات متعددة للبطاقات.",
    basePrice: 199,
    compareAtPrice: null,
    brand: "Luxe Bags",
    slug: "premium-leather-wallet",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BAGS,
    imageCount: 3,
    variants: [
      { sku: "WALLET-BLK", priceOverride: null, stockQuantity: 200, safetyStock: 20, lowStockThreshold: 30, attributes: { color: "Black" } },
      { sku: "WALLET-BRN", priceOverride: null, stockQuantity: 180, safetyStock: 20, lowStockThreshold: 30, attributes: { color: "Brown" } },
    ],
  },
  {
    idx: 41,
    titleEn: "Cotton Bed Sheet Set - King",
    titleAr: "طقم ملايات سرير قطن - كينج",
    descriptionEn: "400 thread count Egyptian cotton bed sheet set, includes fitted sheet, flat sheet, and 2 pillowcases.",
    descriptionAr: "طقم ملايات سرير من القطن المصري 400 خيط، يشمل ملاية مطاطية وملاية مسطحة و2 كيس وسادة.",
    basePrice: 599,
    compareAtPrice: 799,
    brand: "SleepWell",
    slug: "cotton-bed-sheet-set-king",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BEDROOM,
    imageCount: 3,
    variants: [
      { sku: "SHEET-K-WHT", priceOverride: null, stockQuantity: 100, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "White" } },
      { sku: "SHEET-K-GRY", priceOverride: null, stockQuantity: 80, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Grey" } },
      { sku: "SHEET-K-NVY", priceOverride: null, stockQuantity: 60, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Navy" } },
    ],
  },
  {
    idx: 42,
    titleEn: "Smart LED Strip Lights",
    titleAr: "شريط إضاءة LED ذكي",
    descriptionEn: "WiFi RGB LED strip lights with app control, voice assistant compatible.",
    descriptionAr: "شريط إضاءة LED RGB ذكي مع تطبيق تحكم ومتوافق مع المساعد الصوتي.",
    basePrice: 129,
    compareAtPrice: 179,
    brand: "LightUp",
    slug: "smart-led-strip-lights",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.LIGHTING,
    imageCount: 2,
    variants: [
      { sku: "LED-STRIP-5M", priceOverride: null, stockQuantity: 300, safetyStock: 30, lowStockThreshold: 50, attributes: { length: "5 meters" } },
      { sku: "LED-STRIP-10M", priceOverride: 199, stockQuantity: 200, safetyStock: 20, lowStockThreshold: 40, attributes: { length: "10 meters" } },
    ],
  },
  {
    idx: 43,
    titleEn: "Stainless Steel Knife Set",
    titleAr: "طقم سكاكين ستانلس ستيل",
    descriptionEn: "Professional 8-piece knife set with wooden block and sharpening steel.",
    descriptionAr: "طقم سكاكين احترافي 8 قطع مع حامل خشبي ومسن فولاذي.",
    basePrice: 499,
    compareAtPrice: null,
    brand: "ChefPro",
    slug: "stainless-steel-knife-set",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.KITCHEN_APPLIANCES,
    imageCount: 3,
    variants: [
      { sku: "KNIFE-SET-8PC", priceOverride: null, stockQuantity: 45, safetyStock: 5, lowStockThreshold: 10, attributes: { pieces: "8-piece" } },
    ],
  },
  {
    idx: 44,
    titleEn: "Air Fryer 6L Digital",
    titleAr: "قلاية هوائية 6 لتر رقمية",
    descriptionEn: "Digital air fryer with 6L capacity, 8 preset programs, and non-stick basket.",
    descriptionAr: "قلاية هوائية رقمية بسعة 6 لتر و8 برامج مسبقة وسلة غير لاصقة.",
    basePrice: 399,
    compareAtPrice: 499,
    brand: "Ninja",
    slug: "air-fryer-6l-digital",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.KITCHEN_APPLIANCES,
    imageCount: 3,
    variants: [
      { sku: "AIRFRY-6L-BLK", priceOverride: null, stockQuantity: 70, safetyStock: 7, lowStockThreshold: 12, attributes: { color: "Black" } },
      { sku: "AIRFRY-6L-WHT", priceOverride: null, stockQuantity: 50, safetyStock: 7, lowStockThreshold: 12, attributes: { color: "White" } },
    ],
  },
  {
    idx: 45,
    titleEn: "Throw Pillow Set (4 Pack)",
    titleAr: "طقم وسائد ديكور (4 قطع)",
    descriptionEn: "Set of 4 decorative throw pillows with removable covers in geometric patterns.",
    descriptionAr: "طقم من 4 وسائد ديكورية بأغطية قابلة للإزالة بأنماط هندسية.",
    basePrice: 179,
    compareAtPrice: null,
    brand: "HomeLux",
    slug: "throw-pillow-set-4pack",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.LIVING_ROOM,
    imageCount: 3,
    variants: [
      { sku: "PILLOW-4P-GRY", priceOverride: null, stockQuantity: 120, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Grey/White" } },
      { sku: "PILLOW-4P-BLU", priceOverride: null, stockQuantity: 90, safetyStock: 10, lowStockThreshold: 20, attributes: { color: "Blue/Beige" } },
    ],
  },

  // ==================== DRAFT products ====================
  {
    idx: 46,
    titleEn: "Smart Home Hub Pro",
    titleAr: "مركز المنزل الذكي برو",
    descriptionEn: "Central smart home hub with Matter support and 7-inch touchscreen display.",
    descriptionAr: "مركز منزل ذكي مركزي مع دعم Matter وشاشة لمس 7 بوصات.",
    basePrice: 899,
    compareAtPrice: null,
    brand: "TechPack",
    slug: "smart-home-hub-pro",
    status: ProductStatus.draft,
    categoryId: CATEGORY_IDS.SPEAKERS,
    imageCount: 2,
    variants: [
      { sku: "SMHUB-PRO-BLK", priceOverride: null, stockQuantity: 0, safetyStock: 5, lowStockThreshold: 10, attributes: { color: "Black" } },
    ],
  },
  {
    idx: 47,
    titleEn: "Luxury Silk Thobe",
    titleAr: "ثوب حرير فاخر",
    descriptionEn: "Premium silk-blend thobe with hand-finished details for special occasions.",
    descriptionAr: "ثوب من مزيج الحرير الفاخر بتفاصيل يدوية للمناسبات الخاصة.",
    basePrice: 1200,
    compareAtPrice: null,
    brand: "Al-Khaleej",
    slug: "luxury-silk-thobe",
    status: ProductStatus.draft,
    categoryId: CATEGORY_IDS.MENS_THOBES,
    imageCount: 2,
    variants: [
      { sku: "SILK-THB-WHT-M", priceOverride: null, stockQuantity: 0, safetyStock: 3, lowStockThreshold: 5, attributes: { size: "M", color: "White" } },
      { sku: "SILK-THB-WHT-L", priceOverride: null, stockQuantity: 0, safetyStock: 3, lowStockThreshold: 5, attributes: { size: "L", color: "White" } },
    ],
  },
  {
    idx: 48,
    titleEn: "Robot Vacuum S10 Pro",
    titleAr: "مكنسة روبوت S10 برو",
    descriptionEn: "LiDAR navigation robot vacuum with mopping function and self-emptying station.",
    descriptionAr: "مكنسة روبوت بملاحة ليدار مع وظيفة المسح ومحطة إفراغ ذاتية.",
    basePrice: 2299,
    compareAtPrice: null,
    brand: "TechPack",
    slug: "robot-vacuum-s10-pro",
    status: ProductStatus.draft,
    categoryId: CATEGORY_IDS.KITCHEN_APPLIANCES,
    imageCount: 3,
    variants: [
      { sku: "RVAC-S10-BLK", priceOverride: null, stockQuantity: 0, safetyStock: 5, lowStockThreshold: 8, attributes: { color: "Black" } },
      { sku: "RVAC-S10-WHT", priceOverride: null, stockQuantity: 0, safetyStock: 5, lowStockThreshold: 8, attributes: { color: "White" } },
    ],
  },
  {
    idx: 49,
    titleEn: "Handmade Ceramic Vase Set",
    titleAr: "طقم فازات سيراميك يدوية",
    descriptionEn: "Set of 3 handmade ceramic vases in organic shapes with matte glaze.",
    descriptionAr: "طقم من 3 فازات سيراميك يدوية بأشكال عضوية وطلاء مطفي.",
    basePrice: 320,
    compareAtPrice: null,
    brand: "ArtWall",
    slug: "handmade-ceramic-vase-set",
    status: ProductStatus.draft,
    categoryId: CATEGORY_IDS.DECOR,
    imageCount: 2,
    variants: [
      { sku: "VASE-SET-WHT", priceOverride: null, stockQuantity: 0, safetyStock: 3, lowStockThreshold: 5, attributes: { color: "White" } },
      { sku: "VASE-SET-TER", priceOverride: null, stockQuantity: 0, safetyStock: 3, lowStockThreshold: 5, attributes: { color: "Terracotta" } },
    ],
  },
  {
    idx: 50,
    titleEn: "Portable Bluetooth Keyboard",
    titleAr: "لوحة مفاتيح بلوتوث محمولة",
    descriptionEn: "Ultra-slim Bluetooth keyboard with Arabic/English layout and rechargeable battery.",
    descriptionAr: "لوحة مفاتيح بلوتوث رفيعة للغاية بتخطيط عربي/إنجليزي وبطارية قابلة للشحن.",
    basePrice: 179,
    compareAtPrice: 229,
    brand: "TechPack",
    slug: "portable-bluetooth-keyboard",
    status: ProductStatus.published,
    categoryId: CATEGORY_IDS.BUSINESS_LAPTOPS,
    imageCount: 3,
    variants: [
      { sku: "BTKB-SLV", priceOverride: null, stockQuantity: 200, safetyStock: 20, lowStockThreshold: 30, attributes: { color: "Silver" } },
      { sku: "BTKB-BLK", priceOverride: null, stockQuantity: 180, safetyStock: 20, lowStockThreshold: 30, attributes: { color: "Space Grey" } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Exported variant IDs for cross-module references (orders, carts, reviews)
// ---------------------------------------------------------------------------
export function getVariantId(productIdx: number, variantIdx: number): string {
  return variantId(productIdx, variantIdx);
}

export function getProductId(productIdx: number): string {
  return productId(productIdx);
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedProducts(prisma: PrismaClient): Promise<void> {
  console.log("Seeding products...");

  let totalVariants = 0;
  let totalImages = 0;

  for (const p of PRODUCTS) {
    const pId = productId(p.idx);

    // Upsert the product
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        titleEn: p.titleEn,
        titleAr: p.titleAr,
        descriptionEn: p.descriptionEn,
        descriptionAr: p.descriptionAr,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        brand: p.brand,
        status: p.status,
        categoryId: p.categoryId,
        seoTitleEn: p.titleEn,
        seoTitleAr: p.titleAr,
        seoDescriptionEn: p.descriptionEn.slice(0, 160),
        seoDescriptionAr: p.descriptionAr.slice(0, 160),
      },
      create: {
        id: pId,
        titleEn: p.titleEn,
        titleAr: p.titleAr,
        descriptionEn: p.descriptionEn,
        descriptionAr: p.descriptionAr,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        brand: p.brand,
        slug: p.slug,
        status: p.status,
        categoryId: p.categoryId,
        seoTitleEn: p.titleEn,
        seoTitleAr: p.titleAr,
        seoDescriptionEn: p.descriptionEn.slice(0, 160),
        seoDescriptionAr: p.descriptionAr.slice(0, 160),
      },
    });

    // Upsert variants
    for (let vi = 0; vi < p.variants.length; vi++) {
      const v = p.variants[vi]!;
      const vId = variantId(p.idx, vi);

      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          priceOverride: v.priceOverride,
          stockQuantity: v.stockQuantity,
          safetyStock: v.safetyStock,
          lowStockThreshold: v.lowStockThreshold,
          attributes: v.attributes,
        },
        create: {
          id: vId,
          sku: v.sku,
          priceOverride: v.priceOverride,
          stockQuantity: v.stockQuantity,
          safetyStock: v.safetyStock,
          lowStockThreshold: v.lowStockThreshold,
          attributes: v.attributes,
          product: { connect: { id: pId } },
        },
      });
      totalVariants++;
    }

    // Upsert images
    for (let ii = 0; ii < p.imageCount; ii++) {
      const iId = imageId(p.idx, ii);

      await prisma.productImage.upsert({
        where: { id: iId },
        update: {},
        create: {
          id: iId,
          productId: pId,
          url: placeholderImg(p.idx, ii + 1),
          altTextEn: `${p.titleEn} - Image ${ii + 1}`,
          altTextAr: `${p.titleAr} - صورة ${ii + 1}`,
          sortOrder: ii,
        },
      });
      totalImages++;
    }
  }

  console.log(`  Created ${PRODUCTS.length} products, ${totalVariants} variants, ${totalImages} images`);
  console.log("Products seeded");
}
