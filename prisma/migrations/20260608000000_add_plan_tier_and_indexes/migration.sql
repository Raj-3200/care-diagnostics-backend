DO $$
BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('FREE', 'BASIC', 'PRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE';

CREATE INDEX IF NOT EXISTS "patients_tenant_id_created_at_idx"
  ON "patients"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "patients_phone_idx"
  ON "patients"("phone");

CREATE INDEX IF NOT EXISTS "test_orders_tenant_id_created_at_idx"
  ON "test_orders"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_created_at_idx"
  ON "invoices"("tenant_id", "created_at");
