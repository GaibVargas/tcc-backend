/*
  Warnings:

  - Added the required column `description` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "description" TEXT NOT NULL;
