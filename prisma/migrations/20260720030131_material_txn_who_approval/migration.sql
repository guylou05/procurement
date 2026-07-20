-- AlterTable
ALTER TABLE "MaterialTransaction" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "counterparty" TEXT;
