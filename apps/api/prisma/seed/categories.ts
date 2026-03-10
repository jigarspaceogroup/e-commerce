import type { PrismaClient } from "../../src/generated/prisma/client.js";

// ---------------------------------------------------------------------------
// Deterministic UUIDs for categories — organized by department / category / subcategory
// ---------------------------------------------------------------------------
export const CATEGORY_IDS = {
  // Top-level departments
  ELECTRONICS: "e1000000-0000-4000-8000-000000000001",
  FASHION: "e1000000-0000-4000-8000-000000000002",
  HOME_KITCHEN: "e1000000-0000-4000-8000-000000000003",

  // Electronics categories
  SMARTPHONES: "e2000000-0000-4000-8000-000000000001",
  LAPTOPS: "e2000000-0000-4000-8000-000000000002",
  AUDIO: "e2000000-0000-4000-8000-000000000003",

  // Electronics subcategories
  ANDROID_PHONES: "e3000000-0000-4000-8000-000000000001",
  IPHONES: "e3000000-0000-4000-8000-000000000002",
  GAMING_LAPTOPS: "e3000000-0000-4000-8000-000000000003",
  BUSINESS_LAPTOPS: "e3000000-0000-4000-8000-000000000004",
  HEADPHONES: "e3000000-0000-4000-8000-000000000005",
  SPEAKERS: "e3000000-0000-4000-8000-000000000006",

  // Fashion categories
  MENS_CLOTHING: "e2000000-0000-4000-8000-000000000004",
  WOMENS_CLOTHING: "e2000000-0000-4000-8000-000000000005",
  ACCESSORIES: "e2000000-0000-4000-8000-000000000006",

  // Fashion subcategories
  MENS_THOBES: "e3000000-0000-4000-8000-000000000007",
  MENS_CASUAL: "e3000000-0000-4000-8000-000000000008",
  WOMENS_ABAYAS: "e3000000-0000-4000-8000-000000000009",
  WOMENS_CASUAL: "e3000000-0000-4000-8000-000000000010",
  WATCHES: "e3000000-0000-4000-8000-000000000011",
  BAGS: "e3000000-0000-4000-8000-000000000012",

  // Home & Kitchen categories
  FURNITURE: "e2000000-0000-4000-8000-000000000007",
  KITCHEN_APPLIANCES: "e2000000-0000-4000-8000-000000000008",
  DECOR: "e2000000-0000-4000-8000-000000000009",

  // Home & Kitchen subcategories
  LIVING_ROOM: "e3000000-0000-4000-8000-000000000013",
  BEDROOM: "e3000000-0000-4000-8000-000000000014",
  BLENDERS: "e3000000-0000-4000-8000-000000000015",
  COFFEE_MACHINES: "e3000000-0000-4000-8000-000000000016",
  WALL_ART: "e3000000-0000-4000-8000-000000000017",
  LIGHTING: "e3000000-0000-4000-8000-000000000018",
} as const;

// ---------------------------------------------------------------------------
// Category tree data
// ---------------------------------------------------------------------------
interface CategorySeed {
  id: string;
  parentId: string | null;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  materializedPath: string;
  sortOrder: number;
}

const categories: CategorySeed[] = [
  // ===================== Top-level departments =====================
  {
    id: CATEGORY_IDS.ELECTRONICS,
    parentId: null,
    nameEn: "Electronics",
    nameAr: "إلكترونيات",
    slug: "electronics",
    descriptionEn: "Explore the latest electronics, gadgets, and tech accessories",
    descriptionAr: "اكتشف أحدث الأجهزة الإلكترونية والإكسسوارات التقنية",
    materializedPath: "/electronics",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.FASHION,
    parentId: null,
    nameEn: "Fashion",
    nameAr: "أزياء",
    slug: "fashion",
    descriptionEn: "Discover the latest fashion trends for men and women",
    descriptionAr: "اكتشف أحدث صيحات الموضة للرجال والنساء",
    materializedPath: "/fashion",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.HOME_KITCHEN,
    parentId: null,
    nameEn: "Home & Kitchen",
    nameAr: "المنزل والمطبخ",
    slug: "home-kitchen",
    descriptionEn: "Everything you need for your home and kitchen",
    descriptionAr: "كل ما تحتاجه لمنزلك ومطبخك",
    materializedPath: "/home-kitchen",
    sortOrder: 3,
  },

  // ===================== Electronics > categories =====================
  {
    id: CATEGORY_IDS.SMARTPHONES,
    parentId: CATEGORY_IDS.ELECTRONICS,
    nameEn: "Smartphones",
    nameAr: "الهواتف الذكية",
    slug: "smartphones",
    descriptionEn: "Latest smartphones from top brands",
    descriptionAr: "أحدث الهواتف الذكية من أفضل العلامات التجارية",
    materializedPath: "/electronics/smartphones",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.LAPTOPS,
    parentId: CATEGORY_IDS.ELECTRONICS,
    nameEn: "Laptops",
    nameAr: "أجهزة اللابتوب",
    slug: "laptops",
    descriptionEn: "Powerful laptops for work, gaming, and everyday use",
    descriptionAr: "أجهزة لابتوب قوية للعمل والألعاب والاستخدام اليومي",
    materializedPath: "/electronics/laptops",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.AUDIO,
    parentId: CATEGORY_IDS.ELECTRONICS,
    nameEn: "Audio",
    nameAr: "أجهزة الصوت",
    slug: "audio",
    descriptionEn: "Premium audio equipment and accessories",
    descriptionAr: "معدات صوتية متميزة وإكسسوارات",
    materializedPath: "/electronics/audio",
    sortOrder: 3,
  },

  // ===================== Electronics > subcategories =====================
  {
    id: CATEGORY_IDS.ANDROID_PHONES,
    parentId: CATEGORY_IDS.SMARTPHONES,
    nameEn: "Android Phones",
    nameAr: "هواتف أندرويد",
    slug: "android-phones",
    descriptionEn: "Android smartphones from Samsung, Google, and more",
    descriptionAr: "هواتف أندرويد الذكية من سامسونج وجوجل وغيرها",
    materializedPath: "/electronics/smartphones/android-phones",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.IPHONES,
    parentId: CATEGORY_IDS.SMARTPHONES,
    nameEn: "iPhones",
    nameAr: "آيفون",
    slug: "iphones",
    descriptionEn: "Apple iPhone models and accessories",
    descriptionAr: "موديلات آيفون من أبل وملحقاتها",
    materializedPath: "/electronics/smartphones/iphones",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.GAMING_LAPTOPS,
    parentId: CATEGORY_IDS.LAPTOPS,
    nameEn: "Gaming Laptops",
    nameAr: "لابتوبات الألعاب",
    slug: "gaming-laptops",
    descriptionEn: "High-performance laptops built for gaming",
    descriptionAr: "أجهزة لابتوب عالية الأداء مصممة للألعاب",
    materializedPath: "/electronics/laptops/gaming-laptops",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.BUSINESS_LAPTOPS,
    parentId: CATEGORY_IDS.LAPTOPS,
    nameEn: "Business Laptops",
    nameAr: "لابتوبات الأعمال",
    slug: "business-laptops",
    descriptionEn: "Professional laptops for business and productivity",
    descriptionAr: "أجهزة لابتوب احترافية للأعمال والإنتاجية",
    materializedPath: "/electronics/laptops/business-laptops",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.HEADPHONES,
    parentId: CATEGORY_IDS.AUDIO,
    nameEn: "Headphones",
    nameAr: "سماعات الرأس",
    slug: "headphones",
    descriptionEn: "Over-ear, on-ear, and in-ear headphones",
    descriptionAr: "سماعات رأس فوق الأذن وعلى الأذن وداخل الأذن",
    materializedPath: "/electronics/audio/headphones",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.SPEAKERS,
    parentId: CATEGORY_IDS.AUDIO,
    nameEn: "Speakers",
    nameAr: "مكبرات الصوت",
    slug: "speakers",
    descriptionEn: "Bluetooth speakers, smart speakers, and sound systems",
    descriptionAr: "مكبرات صوت بلوتوث ومكبرات ذكية وأنظمة صوت",
    materializedPath: "/electronics/audio/speakers",
    sortOrder: 2,
  },

  // ===================== Fashion > categories =====================
  {
    id: CATEGORY_IDS.MENS_CLOTHING,
    parentId: CATEGORY_IDS.FASHION,
    nameEn: "Men's Clothing",
    nameAr: "ملابس رجالية",
    slug: "mens-clothing",
    descriptionEn: "Men's fashion and clothing essentials",
    descriptionAr: "أزياء رجالية وملابس أساسية",
    materializedPath: "/fashion/mens-clothing",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.WOMENS_CLOTHING,
    parentId: CATEGORY_IDS.FASHION,
    nameEn: "Women's Clothing",
    nameAr: "ملابس نسائية",
    slug: "womens-clothing",
    descriptionEn: "Women's fashion and clothing essentials",
    descriptionAr: "أزياء نسائية وملابس أساسية",
    materializedPath: "/fashion/womens-clothing",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.ACCESSORIES,
    parentId: CATEGORY_IDS.FASHION,
    nameEn: "Accessories",
    nameAr: "إكسسوارات",
    slug: "accessories",
    descriptionEn: "Watches, bags, and fashion accessories",
    descriptionAr: "ساعات وحقائب وإكسسوارات أزياء",
    materializedPath: "/fashion/accessories",
    sortOrder: 3,
  },

  // ===================== Fashion > subcategories =====================
  {
    id: CATEGORY_IDS.MENS_THOBES,
    parentId: CATEGORY_IDS.MENS_CLOTHING,
    nameEn: "Thobes",
    nameAr: "ثياب",
    slug: "thobes",
    descriptionEn: "Traditional and modern thobes for men",
    descriptionAr: "ثياب تقليدية وعصرية للرجال",
    materializedPath: "/fashion/mens-clothing/thobes",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.MENS_CASUAL,
    parentId: CATEGORY_IDS.MENS_CLOTHING,
    nameEn: "Men's Casual Wear",
    nameAr: "ملابس رجالية كاجوال",
    slug: "mens-casual-wear",
    descriptionEn: "Casual shirts, pants, and everyday wear for men",
    descriptionAr: "قمصان وبناطيل وملابس يومية كاجوال للرجال",
    materializedPath: "/fashion/mens-clothing/mens-casual-wear",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.WOMENS_ABAYAS,
    parentId: CATEGORY_IDS.WOMENS_CLOTHING,
    nameEn: "Abayas",
    nameAr: "عبايات",
    slug: "abayas",
    descriptionEn: "Elegant abayas in modern and classic styles",
    descriptionAr: "عبايات أنيقة بتصاميم عصرية وكلاسيكية",
    materializedPath: "/fashion/womens-clothing/abayas",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.WOMENS_CASUAL,
    parentId: CATEGORY_IDS.WOMENS_CLOTHING,
    nameEn: "Women's Casual Wear",
    nameAr: "ملابس نسائية كاجوال",
    slug: "womens-casual-wear",
    descriptionEn: "Casual dresses, tops, and everyday wear for women",
    descriptionAr: "فساتين وبلوزات وملابس يومية كاجوال للنساء",
    materializedPath: "/fashion/womens-clothing/womens-casual-wear",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.WATCHES,
    parentId: CATEGORY_IDS.ACCESSORIES,
    nameEn: "Watches",
    nameAr: "ساعات",
    slug: "watches",
    descriptionEn: "Luxury and everyday watches for all occasions",
    descriptionAr: "ساعات فاخرة ويومية لجميع المناسبات",
    materializedPath: "/fashion/accessories/watches",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.BAGS,
    parentId: CATEGORY_IDS.ACCESSORIES,
    nameEn: "Bags",
    nameAr: "حقائب",
    slug: "bags",
    descriptionEn: "Handbags, backpacks, and travel bags",
    descriptionAr: "حقائب يد وحقائب ظهر وحقائب سفر",
    materializedPath: "/fashion/accessories/bags",
    sortOrder: 2,
  },

  // ===================== Home & Kitchen > categories =====================
  {
    id: CATEGORY_IDS.FURNITURE,
    parentId: CATEGORY_IDS.HOME_KITCHEN,
    nameEn: "Furniture",
    nameAr: "أثاث",
    slug: "furniture",
    descriptionEn: "Home furniture for every room",
    descriptionAr: "أثاث منزلي لكل غرفة",
    materializedPath: "/home-kitchen/furniture",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.KITCHEN_APPLIANCES,
    parentId: CATEGORY_IDS.HOME_KITCHEN,
    nameEn: "Kitchen Appliances",
    nameAr: "أجهزة المطبخ",
    slug: "kitchen-appliances",
    descriptionEn: "Essential kitchen appliances and gadgets",
    descriptionAr: "أجهزة ومعدات المطبخ الأساسية",
    materializedPath: "/home-kitchen/kitchen-appliances",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.DECOR,
    parentId: CATEGORY_IDS.HOME_KITCHEN,
    nameEn: "Decor",
    nameAr: "ديكور",
    slug: "decor",
    descriptionEn: "Home decor and decorative accessories",
    descriptionAr: "ديكور منزلي وإكسسوارات تزيينية",
    materializedPath: "/home-kitchen/decor",
    sortOrder: 3,
  },

  // ===================== Home & Kitchen > subcategories =====================
  {
    id: CATEGORY_IDS.LIVING_ROOM,
    parentId: CATEGORY_IDS.FURNITURE,
    nameEn: "Living Room Furniture",
    nameAr: "أثاث غرفة المعيشة",
    slug: "living-room-furniture",
    descriptionEn: "Sofas, coffee tables, and living room essentials",
    descriptionAr: "كنب وطاولات قهوة ومستلزمات غرفة المعيشة",
    materializedPath: "/home-kitchen/furniture/living-room-furniture",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.BEDROOM,
    parentId: CATEGORY_IDS.FURNITURE,
    nameEn: "Bedroom Furniture",
    nameAr: "أثاث غرفة النوم",
    slug: "bedroom-furniture",
    descriptionEn: "Beds, wardrobes, and bedroom storage",
    descriptionAr: "أسرة وخزائن وتخزين غرفة النوم",
    materializedPath: "/home-kitchen/furniture/bedroom-furniture",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.BLENDERS,
    parentId: CATEGORY_IDS.KITCHEN_APPLIANCES,
    nameEn: "Blenders",
    nameAr: "خلاطات",
    slug: "blenders",
    descriptionEn: "High-speed blenders and food processors",
    descriptionAr: "خلاطات عالية السرعة ومحضرات الطعام",
    materializedPath: "/home-kitchen/kitchen-appliances/blenders",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.COFFEE_MACHINES,
    parentId: CATEGORY_IDS.KITCHEN_APPLIANCES,
    nameEn: "Coffee Machines",
    nameAr: "ماكينات القهوة",
    slug: "coffee-machines",
    descriptionEn: "Espresso machines, drip coffee makers, and more",
    descriptionAr: "ماكينات إسبريسو وماكينات القهوة بالتقطير وغيرها",
    materializedPath: "/home-kitchen/kitchen-appliances/coffee-machines",
    sortOrder: 2,
  },
  {
    id: CATEGORY_IDS.WALL_ART,
    parentId: CATEGORY_IDS.DECOR,
    nameEn: "Wall Art",
    nameAr: "لوحات جدارية",
    slug: "wall-art",
    descriptionEn: "Canvas prints, framed art, and wall decorations",
    descriptionAr: "مطبوعات كانفاس ولوحات مؤطرة وزينة جدارية",
    materializedPath: "/home-kitchen/decor/wall-art",
    sortOrder: 1,
  },
  {
    id: CATEGORY_IDS.LIGHTING,
    parentId: CATEGORY_IDS.DECOR,
    nameEn: "Lighting",
    nameAr: "إضاءة",
    slug: "lighting",
    descriptionEn: "Table lamps, floor lamps, and decorative lighting",
    descriptionAr: "مصابيح طاولة ومصابيح أرضية وإضاءة تزيينية",
    materializedPath: "/home-kitchen/decor/lighting",
    sortOrder: 2,
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedCategories(prisma: PrismaClient): Promise<void> {
  console.log("Seeding categories...");

  // Insert in order (parents first) — the array is already ordered that way
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
        descriptionEn: cat.descriptionEn,
        descriptionAr: cat.descriptionAr,
        materializedPath: cat.materializedPath,
        sortOrder: cat.sortOrder,
      },
      create: {
        id: cat.id,
        parentId: cat.parentId,
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
        slug: cat.slug,
        descriptionEn: cat.descriptionEn,
        descriptionAr: cat.descriptionAr,
        materializedPath: cat.materializedPath,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
  }

  console.log(`  Created ${categories.length} categories (3 departments, 9 categories, 18 subcategories)`);
  console.log("Categories seeded");
}
