import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { seedRoles } from "./seed/roles.js";
import { seedUsers } from "./seed/users.js";
import { seedCategories } from "./seed/categories.js";
import { seedProducts } from "./seed/products.js";
import { seedOrders } from "./seed/orders.js";
import { seedCarts } from "./seed/carts.js";
import { seedReviews } from "./seed/reviews.js";

// ---------------------------------------------------------------------------
// Main seed runner
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL ?? "";
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("=== Starting database seed ===\n");
    const start = Date.now();

    // 1. Roles & permissions (no FK deps)
    await seedRoles(prisma);
    console.log();

    // 2. Users, addresses, social accounts, user-role links (depends on roles)
    await seedUsers(prisma);
    console.log();

    // 3. Categories (no FK deps on users)
    await seedCategories(prisma);
    console.log();

    // 4. Products, variants, images (depends on categories)
    await seedProducts(prisma);
    console.log();

    // 5. Orders, order items, payments (depends on users + variants)
    await seedOrders(prisma);
    console.log();

    // 6. Carts and cart items (depends on users + variants)
    await seedCarts(prisma);
    console.log();

    // 7. Reviews (depends on users + products + orders)
    await seedReviews(prisma);
    console.log();

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`=== Seed completed in ${elapsed}s ===`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
