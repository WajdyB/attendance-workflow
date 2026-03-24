/*
  Warnings:

  - Added the required column `category` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('HR', 'CONTRACT', 'PAYROLL', 'REQUEST_ATTACHMENT', 'OTHER');

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "category",
ADD COLUMN     "category" "DocumentCategory" NOT NULL;
