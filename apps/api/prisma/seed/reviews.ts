import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { ReviewStatus } from "../../src/generated/prisma/client.js";
import { USER_IDS } from "./users.js";
import { getProductId } from "./products.js";
import { orderId } from "./orders.js";

// ---------------------------------------------------------------------------
// Deterministic UUIDs
// ---------------------------------------------------------------------------
function reviewId(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `05000000-0000-4000-8000-${hex}`;
}

// ---------------------------------------------------------------------------
// Review data — 20 reviews across delivered orders / products
// ---------------------------------------------------------------------------
interface ReviewSeed {
  idx: number;
  userId: string;
  productIdx: number;
  orderIdx: number;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  helpfulCount: number;
}

const REVIEWS: ReviewSeed[] = [
  // Buyer 1 reviews (orders 1, 2)
  {
    idx: 1,
    userId: USER_IDS.BUYER_1,
    productIdx: 1,  // Samsung Galaxy S25 Ultra
    orderIdx: 1,
    rating: 5,
    title: "افضل هاتف سامسونج على الاطلاق",
    body: "هاتف ممتاز من كل النواحي. الكاميرا مذهلة والأداء سريع جدا. قلم S مفيد جدا في العمل. أنصح به بشدة لكل من يبحث عن هاتف متكامل.",
    status: ReviewStatus.approved,
    helpfulCount: 12,
  },
  {
    idx: 2,
    userId: USER_IDS.BUYER_1,
    productIdx: 11, // AirPods Pro 3
    orderIdx: 1,
    rating: 4,
    title: "سماعات ممتازة مع ملاحظة بسيطة",
    body: "جودة الصوت رائعة وإلغاء الضوضاء ممتاز. الملاحظة الوحيدة هي أن الأطراف المطاطية تحتاج تبديل كل فترة. بشكل عام سماعات ممتازة.",
    status: ReviewStatus.approved,
    helpfulCount: 8,
  },
  {
    idx: 3,
    userId: USER_IDS.BUYER_1,
    productIdx: 14, // Premium White Thobe
    orderIdx: 2,
    rating: 5,
    title: "ثوب فاخر وخامة ممتازة",
    body: "القماش ناعم جدا والخياطة متقنة. المقاس مناسب تماما. سأطلب المزيد إن شاء الله.",
    status: ReviewStatus.approved,
    helpfulCount: 15,
  },
  {
    idx: 4,
    userId: USER_IDS.BUYER_1,
    productIdx: 22, // Casio G-Shock
    orderIdx: 2,
    rating: 4,
    title: "ساعة عملية وأنيقة",
    body: "ساعة جي شوك كالعادة متينة وعملية. التصميم الجديد أنيق ويناسب المناسبات غير الرسمية. بطارية طويلة ومقاومة للماء ممتازة.",
    status: ReviewStatus.approved,
    helpfulCount: 6,
  },

  // Buyer 2 reviews (orders 3)
  {
    idx: 5,
    userId: USER_IDS.BUYER_2,
    productIdx: 18, // Embroidered Black Abaya
    orderIdx: 3,
    rating: 5,
    title: "عباية أنيقة ومميزة",
    body: "عباية رائعة بتطريز جميل جدا. القماش خفيف ومريح والتصميم عصري. وصلت مغلفة بشكل جميل. أنصح بها بشدة.",
    status: ReviewStatus.approved,
    helpfulCount: 20,
  },
  {
    idx: 6,
    userId: USER_IDS.BUYER_2,
    productIdx: 24, // Leather Crossbody Bag
    orderIdx: 3,
    rating: 3,
    title: "حقيبة جيدة لكن أصغر من المتوقع",
    body: "جودة الجلد ممتازة والتصميم أنيق. لكن الحقيبة أصغر مما توقعت من الصور. تناسب الأغراض الأساسية فقط.",
    status: ReviewStatus.approved,
    helpfulCount: 10,
  },

  // Buyer 4 reviews (orders 4, 19)
  {
    idx: 7,
    userId: USER_IDS.BUYER_4,
    productIdx: 5,  // iPhone 16
    orderIdx: 4,
    rating: 5,
    title: "Perfect upgrade from iPhone 14",
    body: "Love the new camera system and the action button is super handy. Battery life is noticeably better than my old iPhone 14. Face ID works faster too. Highly recommend!",
    status: ReviewStatus.approved,
    helpfulCount: 18,
  },
  {
    idx: 8,
    userId: USER_IDS.BUYER_4,
    productIdx: 13, // Sonos Era 300
    orderIdx: 19,
    rating: 5,
    title: "Best speaker I've ever owned",
    body: "The spatial audio is incredible - it truly fills the room. Setup was easy through the app. Works great with Apple Music and Spotify. Worth every riyal.",
    status: ReviewStatus.approved,
    helpfulCount: 14,
  },
  {
    idx: 9,
    userId: USER_IDS.BUYER_4,
    productIdx: 42, // Smart LED Strip Lights
    orderIdx: 19,
    rating: 4,
    title: "Great ambiance, slightly tricky setup",
    body: "The lights look amazing once installed. The app has tons of customization options. Only downside is the adhesive could be stronger - needed some extra tape in a couple spots.",
    status: ReviewStatus.approved,
    helpfulCount: 5,
  },

  // Buyer 5 reviews (orders 5, 20)
  {
    idx: 10,
    userId: USER_IDS.BUYER_5,
    productIdx: 32, // Breville Barista Express
    orderIdx: 5,
    rating: 5,
    title: "Cafe-quality espresso at home",
    body: "This machine is a game changer. The built-in grinder produces consistent grounds and the steam wand makes beautiful microfoam. Took a few days to dial in the perfect shot but now I'm making better lattes than most cafes.",
    status: ReviewStatus.approved,
    helpfulCount: 22,
  },
  {
    idx: 11,
    userId: USER_IDS.BUYER_5,
    productIdx: 33, // Nespresso Vertuo Next
    orderIdx: 5,
    rating: 4,
    title: "Convenient for quick coffee",
    body: "Great for weekday mornings when I don't have time for the Breville. One-touch operation and consistent results. The only downside is the proprietary capsule system can be expensive over time.",
    status: ReviewStatus.approved,
    helpfulCount: 7,
  },
  {
    idx: 12,
    userId: USER_IDS.BUYER_5,
    productIdx: 44, // Air Fryer 6L
    orderIdx: 20,
    rating: 5,
    title: "Best kitchen purchase this year",
    body: "The 6L capacity is perfect for family meals. The preset programs work great - especially for fries and chicken. Easy to clean and doesn't take up too much counter space.",
    status: ReviewStatus.approved,
    helpfulCount: 11,
  },
  {
    idx: 13,
    userId: USER_IDS.BUYER_5,
    productIdx: 43, // Knife Set
    orderIdx: 20,
    rating: 4,
    title: "Sharp and well-balanced",
    body: "The knives came extremely sharp and the wooden block looks great on the counter. The chef's knife is my favorite. Slightly disappointed the paring knife feels a bit light, but overall excellent value.",
    status: ReviewStatus.approved,
    helpfulCount: 3,
  },

  // Buyer 3 reviews (order 18)
  {
    idx: 14,
    userId: USER_IDS.BUYER_3,
    productIdx: 16, // Slim Fit Cotton Polo
    orderIdx: 18,
    rating: 4,
    title: "قمصان بولو مريحة وأنيقة",
    body: "القطن ناعم ومريح. القصة الضيقة مناسبة جدا. اللون الكحلي جميل ولم يبهت بعد عدة غسلات. سأطلب ألوان أخرى.",
    status: ReviewStatus.approved,
    helpfulCount: 9,
  },
  {
    idx: 15,
    userId: USER_IDS.BUYER_3,
    productIdx: 17, // Stretch Chino Pants
    orderIdx: 18,
    rating: 3,
    title: "بنطلون جيد مع ملاحظات",
    body: "القماش المطاطي مريح جدا للحركة. لكن المقاس كان أكبر قليلا من المتوقع. أنصح بطلب مقاس أصغر. الخياطة بشكل عام جيدة.",
    status: ReviewStatus.approved,
    helpfulCount: 13,
  },

  // A few pending/rejected reviews for variety
  {
    idx: 16,
    userId: USER_IDS.BUYER_3,
    productIdx: 10, // Sony WH-1000XM6 (from order 9 which is processing, but this is seed data)
    orderIdx: 9,
    rating: 5,
    title: "سماعات استثنائية",
    body: "أفضل سماعات إلغاء ضوضاء جربتها. مريحة جدا للاستخدام لساعات طويلة. جودة الصوت خرافية.",
    status: ReviewStatus.pending,
    helpfulCount: 0,
  },
  {
    idx: 17,
    userId: USER_IDS.BUYER_1,
    productIdx: 9,  // MacBook Pro 16 (from order 6, shipped but for seed data purposes)
    orderIdx: 6,
    rating: 1,
    title: "Not great",
    body: "test review",
    status: ReviewStatus.rejected,
    helpfulCount: 0,
  },

  // More approved reviews
  {
    idx: 18,
    userId: USER_IDS.BUYER_5,
    productIdx: 31, // Ninja Personal Blender
    orderIdx: 20,
    rating: 4,
    title: "Compact and powerful",
    body: "Perfect for morning smoothies. The travel cups are convenient for taking to the gym. Motor is surprisingly powerful for its size. Good value for money.",
    status: ReviewStatus.approved,
    helpfulCount: 4,
  },
  {
    idx: 19,
    userId: USER_IDS.BUYER_2,
    productIdx: 20, // Floral Print Maxi Dress (from order 7, shipped but seed data)
    orderIdx: 7,
    rating: 5,
    title: "فستان جميل وعملي",
    body: "الطبعة الزهرية جميلة جدا والقماش خفيف ومريح. الطول مناسب والياقة محتشمة. يناسب المناسبات والخروجات اليومية.",
    status: ReviewStatus.approved,
    helpfulCount: 16,
  },
  {
    idx: 20,
    userId: USER_IDS.BUYER_4,
    productIdx: 36, // Minimalist Table Lamp (from order 8, shipped)
    orderIdx: 8,
    rating: 4,
    title: "Stylish and well-made",
    body: "Beautiful Scandinavian design that fits perfectly on my bedside table. The warm light creates a cozy atmosphere. Only wish it had a dimmer switch built in.",
    status: ReviewStatus.approved,
    helpfulCount: 2,
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedReviews(prisma: PrismaClient): Promise<void> {
  console.log("Seeding reviews...");

  for (const r of REVIEWS) {
    const rId = reviewId(r.idx);
    const pId = getProductId(r.productIdx);
    const oId = orderId(r.orderIdx);

    await prisma.review.upsert({
      where: {
        userId_productId_orderId: {
          userId: r.userId,
          productId: pId,
          orderId: oId,
        },
      },
      update: {
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: r.status,
        helpfulCount: r.helpfulCount,
      },
      create: {
        id: rId,
        userId: r.userId,
        productId: pId,
        orderId: oId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: r.status,
        helpfulCount: r.helpfulCount,
        isVerifiedPurchase: true,
      },
    });
  }

  console.log(`  Created ${REVIEWS.length} reviews`);
  console.log("Reviews seeded");
}
