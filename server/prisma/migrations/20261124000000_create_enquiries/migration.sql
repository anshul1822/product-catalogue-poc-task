-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "enquiries" (
    "id" UUID NOT NULL,
    "product_id" VARCHAR(64) NOT NULL,
    "product_title" TEXT NOT NULL,
    "product_price" DECIMAL(10,2) NOT NULL,
    "customer_name" VARCHAR(100) NOT NULL,
    "customer_email" VARCHAR(254) NOT NULL,
    "customer_phone" VARCHAR(30),
    "message" VARCHAR(2000),
    "status" "EnquiryStatus" NOT NULL DEFAULT 'PENDING',
    "failure_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(3),

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enquiries_status_created_at_idx" ON "enquiries"("status", "created_at");
