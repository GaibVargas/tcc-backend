/*
  Warnings:

  - Added the required column `current_question_public_id` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "current_question_public_id" TEXT NOT NULL;
