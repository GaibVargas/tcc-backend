/*
  Warnings:

  - Made the column `correct_text_answer` on table `Question` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `QuestionOption` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_correct_answer` on table `QuestionOption` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "correct_text_answer" SET NOT NULL;

-- AlterTable
ALTER TABLE "QuestionOption" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "is_correct_answer" SET NOT NULL,
ALTER COLUMN "is_correct_answer" SET DEFAULT false;
