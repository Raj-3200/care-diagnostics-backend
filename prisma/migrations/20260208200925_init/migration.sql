-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PATHOLOGIST', 'PATIENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('REGISTERED', 'SAMPLES_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('PENDING_COLLECTION', 'COLLECTED', 'IN_LAB', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('PENDING', 'ENTERED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATED', 'APPROVED', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'ONLINE', 'INSURANCE');

-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('BLOOD', 'URINE', 'STOOL', 'SWAB', 'SPUTUM', 'TISSUE', 'CSF', 'OTHER');

-- CreateEnum
CREATE TYPE "TestCategory" AS ENUM ('HEMATOLOGY', 'BIOCHEMISTRY', 'MICROBIOLOGY', 'PATHOLOGY', 'IMMUNOLOGY', 'RADIOLOGY', 'MOLECULAR', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "mrn" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "blood_group" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "registered_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "visit_number" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'REGISTERED',
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TestCategory" NOT NULL,
    "sample_type" "SampleType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "turnaround_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "department" TEXT,
    "instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_orders" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "test_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "samples" (
    "id" UUID NOT NULL,
    "test_order_id" UUID NOT NULL,
    "barcode" TEXT NOT NULL,
    "sample_type" "SampleType" NOT NULL,
    "status" "SampleStatus" NOT NULL DEFAULT 'PENDING_COLLECTION',
    "collected_at" TIMESTAMP(3),
    "collected_by_id" UUID,
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" UUID NOT NULL,
    "test_order_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "reference_range" TEXT,
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "status" "ResultStatus" NOT NULL DEFAULT 'PENDING',
    "entered_by_id" UUID,
    "entered_at" TIMESTAMP(3),
    "verified_by_id" UUID,
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "report_number" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "file_url" TEXT,
    "generated_at" TIMESTAMP(3),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(10,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethod",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE INDEX "patients_registered_by_id_idx" ON "patients"("registered_by_id");

-- CreateIndex
CREATE INDEX "patients_mrn_idx" ON "patients"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "visits_visit_number_key" ON "visits"("visit_number");

-- CreateIndex
CREATE INDEX "visits_patient_id_idx" ON "visits"("patient_id");

-- CreateIndex
CREATE INDEX "visits_created_by_id_idx" ON "visits"("created_by_id");

-- CreateIndex
CREATE INDEX "visits_visit_number_idx" ON "visits"("visit_number");

-- CreateIndex
CREATE UNIQUE INDEX "tests_code_key" ON "tests"("code");

-- CreateIndex
CREATE INDEX "tests_code_idx" ON "tests"("code");

-- CreateIndex
CREATE INDEX "tests_category_idx" ON "tests"("category");

-- CreateIndex
CREATE INDEX "test_orders_visit_id_idx" ON "test_orders"("visit_id");

-- CreateIndex
CREATE INDEX "test_orders_test_id_idx" ON "test_orders"("test_id");

-- CreateIndex
CREATE UNIQUE INDEX "samples_test_order_id_key" ON "samples"("test_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "samples_barcode_key" ON "samples"("barcode");

-- CreateIndex
CREATE INDEX "samples_test_order_id_idx" ON "samples"("test_order_id");

-- CreateIndex
CREATE INDEX "samples_collected_by_id_idx" ON "samples"("collected_by_id");

-- CreateIndex
CREATE INDEX "samples_barcode_idx" ON "samples"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "results_test_order_id_key" ON "results"("test_order_id");

-- CreateIndex
CREATE INDEX "results_test_order_id_idx" ON "results"("test_order_id");

-- CreateIndex
CREATE INDEX "results_entered_by_id_idx" ON "results"("entered_by_id");

-- CreateIndex
CREATE INDEX "results_verified_by_id_idx" ON "results"("verified_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_visit_id_key" ON "reports"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_report_number_key" ON "reports"("report_number");

-- CreateIndex
CREATE INDEX "reports_visit_id_idx" ON "reports"("visit_id");

-- CreateIndex
CREATE INDEX "reports_approved_by_id_idx" ON "reports"("approved_by_id");

-- CreateIndex
CREATE INDEX "reports_report_number_idx" ON "reports"("report_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_visit_id_key" ON "invoices"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_visit_id_idx" ON "invoices"("visit_id");

-- CreateIndex
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_orders" ADD CONSTRAINT "test_orders_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_orders" ADD CONSTRAINT "test_orders_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_test_order_id_fkey" FOREIGN KEY ("test_order_id") REFERENCES "test_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_collected_by_id_fkey" FOREIGN KEY ("collected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_test_order_id_fkey" FOREIGN KEY ("test_order_id") REFERENCES "test_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
