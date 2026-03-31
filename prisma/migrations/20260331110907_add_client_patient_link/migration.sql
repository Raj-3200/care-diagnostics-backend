-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "referred_by_client_id" UUID;

-- CreateIndex
CREATE INDEX "patients_referred_by_client_id_idx" ON "patients"("referred_by_client_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_referred_by_client_id_fkey" FOREIGN KEY ("referred_by_client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
