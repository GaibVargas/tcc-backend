/*
  Warnings:

  - You are about to drop the column `reference` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `reference_version` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `QuestionOption` table. All the data in the column will be lost.
  - You are about to drop the column `reference_version` on the `QuestionOption` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Question_reference_key";

-- DropIndex
DROP INDEX "QuestionOption_reference_key";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "reference",
DROP COLUMN "reference_version",
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuestionOption" DROP COLUMN "reference",
DROP COLUMN "reference_version";

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;
