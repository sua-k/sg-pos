-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'manager', 'staff');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('national_id', 'passport');

-- CreateEnum
CREATE TYPE "StrainType" AS ENUM ('indica', 'sativa', 'hybrid');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('completed', 'voided', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'transfer');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('push', 'pull');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('success', 'error', 'pending');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('pending_review', 'accepted', 'rejected', 'auto_matched');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('requested', 'approved', 'dispatched', 'received', 'confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('self_use', 'sell', 'research', 'process', 'export_abroad');

-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('received', 'damaged', 'correction', 'waste', 'transfer_out', 'transfer_in');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('draft', 'confirmed', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "ProfessionType" AS ENUM ('medical', 'thai_traditional', 'thai_applied', 'dental', 'pharmacy', 'chinese_medicine', 'folk_healer');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "auth_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'staff',
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "strain_type" "StrainType",
    "sku" TEXT NOT NULL,
    "price_thb" DECIMAL(10,2) NOT NULL,
    "price_per_gram" DECIMAL(10,2),
    "cost_thb" DECIMAL(10,2),
    "cost_per_gram" DECIMAL(10,2),
    "cost_vat_included" BOOLEAN NOT NULL DEFAULT true,
    "sold_by_weight" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "thc_percentage" DECIMAL(5,2),
    "cbd_percentage" DECIMAL(5,2),
    "expiry_date" DATE,
    "batch_number" TEXT,
    "weight_per_unit_grams" DECIMAL(10,3),
    "category_id" TEXT,
    "supplier_id" TEXT,
    "zoho_item_id" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "sold_by_weight" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "license_no" TEXT,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "room" TEXT NOT NULL DEFAULT 'Shelf',

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "notes" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_layers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "purchase_item_id" TEXT,
    "quantity_initial" DECIMAL(10,3) NOT NULL,
    "quantity_remaining" DECIMAL(10,3) NOT NULL,
    "unit_cost_thb" DECIMAL(10,2) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "batch_number" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_layer_consumptions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "cost_layer_id" TEXT NOT NULL,
    "transaction_item_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_cost_thb" DECIMAL(10,2) NOT NULL,
    "total_cost_thb" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_layer_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "supplier_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "invoice_number" TEXT,
    "subtotal_thb" DECIMAL(10,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 7.00,
    "vat_thb" DECIMAL(10,2) NOT NULL,
    "total_thb" DECIMAL(10,2) NOT NULL,
    "vat_included" BOOLEAN NOT NULL DEFAULT true,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "purchase_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "zoho_po_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_cost_thb" DECIMAL(10,2) NOT NULL,
    "subtotal_thb" DECIMAL(10,2) NOT NULL,
    "vat_thb" DECIMAL(10,2) NOT NULL,
    "item_total_thb" DECIMAL(10,2) NOT NULL,
    "weight_grams" DECIMAL(10,3),
    "expiry_date" DATE,
    "batch_number" TEXT,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "id_number" TEXT NOT NULL,
    "id_type" "IdType" NOT NULL,
    "name" TEXT,
    "date_of_birth" DATE NOT NULL,
    "nationality" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "customer_id" TEXT NOT NULL,
    "prescription_no" TEXT NOT NULL,
    "prescriber_id" TEXT,
    "issued_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "daily_dosage_grams" DECIMAL(5,2),
    "num_days" INTEGER,
    "total_allowed_grams" DECIMAL(8,2),
    "consumed_grams" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "diagnosis" TEXT,
    "document_url" TEXT,
    "pt33_pdf_url" TEXT,
    "created_in_pos" BOOLEAN NOT NULL DEFAULT false,
    "branch_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescribers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "license_no" TEXT NOT NULL,
    "license_type" TEXT,
    "profession_type" "ProfessionType" NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "customer_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "subtotal_thb" DECIMAL(10,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 7.00,
    "vat_thb" DECIMAL(10,2) NOT NULL,
    "total_thb" DECIMAL(10,2) NOT NULL,
    "vat_included" BOOLEAN NOT NULL DEFAULT true,
    "status" "TransactionStatus" NOT NULL DEFAULT 'completed',
    "payment_method" "PaymentMethod" NOT NULL,
    "report_type" "ReportType" NOT NULL DEFAULT 'sell',
    "receipt_number" TEXT NOT NULL,
    "age_verified" BOOLEAN NOT NULL DEFAULT false,
    "customer_age" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "transaction_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price_thb" DECIMAL(10,2) NOT NULL,
    "subtotal_thb" DECIMAL(10,2) NOT NULL,
    "vat_thb" DECIMAL(10,2) NOT NULL,
    "item_total_thb" DECIMAL(10,2) NOT NULL,
    "weight_grams" DECIMAL(10,3),
    "price_per_gram" DECIMAL(10,2),
    "scale_reading" DECIMAL(10,3),
    "cogs_thb" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_prescriptions" (
    "transaction_id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,

    CONSTRAINT "transaction_prescriptions_pkey" PRIMARY KEY ("transaction_id","prescription_id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "device_name" TEXT,
    "opening_float" DECIMAL(10,2) NOT NULL,
    "closing_float" DECIMAL(10,2),
    "expected_cash" DECIMAL(10,2),
    "actual_cash" DECIMAL(10,2),
    "discrepancy" DECIMAL(10,2),
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "from_branch_id" TEXT NOT NULL,
    "to_branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "weight_grams" DECIMAL(10,3),
    "status" "TransferStatus" NOT NULL DEFAULT 'requested',
    "initiated_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoho_sync_log" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "error_msg" TEXT,
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoho_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "zoho_transaction_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "amount_thb" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_matches" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "bank_transaction_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "confidence_score" DECIMAL(4,3) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'pending_review',
    "ai_reasoning" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_branch_id_key" ON "inventory"("product_id", "branch_id");

-- CreateIndex
CREATE INDEX "idx_cost_layers_product_branch_received" ON "cost_layers"("product_id", "branch_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_number_id_type_key" ON "customers"("id_number", "id_type");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescription_no_key" ON "prescriptions"("prescription_no");

-- CreateIndex
CREATE UNIQUE INDEX "prescribers_license_no_key" ON "prescribers"("license_no");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_receipt_number_key" ON "transactions"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_zoho_transaction_id_key" ON "bank_transactions"("zoho_transaction_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cost_layers" ADD CONSTRAINT "cost_layers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cost_layers" ADD CONSTRAINT "cost_layers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cost_layers" ADD CONSTRAINT "cost_layers_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cost_layer_consumptions" ADD CONSTRAINT "cost_layer_consumptions_cost_layer_id_fkey" FOREIGN KEY ("cost_layer_id") REFERENCES "cost_layers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cost_layer_consumptions" ADD CONSTRAINT "cost_layer_consumptions_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "transaction_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescriber_id_fkey" FOREIGN KEY ("prescriber_id") REFERENCES "prescribers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_prescriptions" ADD CONSTRAINT "transaction_prescriptions_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_prescriptions" ADD CONSTRAINT "transaction_prescriptions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reconciliation_matches" ADD CONSTRAINT "reconciliation_matches_bank_transaction_id_fkey" FOREIGN KEY ("bank_transaction_id") REFERENCES "bank_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

