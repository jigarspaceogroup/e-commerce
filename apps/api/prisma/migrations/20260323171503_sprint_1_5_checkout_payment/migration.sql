-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
ALTER TABLE "orders" ALTER COLUMN "billing_address" DROP NOT NULL;

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "product_title_snapshot" SET DATA TYPE JSONB USING to_jsonb("product_title_snapshot");

-- AlterTable
ALTER TABLE "payment_events" ADD COLUMN IF NOT EXISTS "gateway_event_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_events_gateway_event_id_key" ON "payment_events"("gateway_event_id");

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
