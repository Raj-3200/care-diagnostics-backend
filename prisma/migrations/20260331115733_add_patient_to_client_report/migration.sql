-- AlterTable
ALTER TABLE "client_reports" ADD COLUMN     "patient_id" UUID;

-- CreateIndex
CREATE INDEX "client_reports_patient_id_idx" ON "client_reports"("patient_id");

-- AddForeignKey
ALTER TABLE "client_reports" ADD CONSTRAINT "client_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
