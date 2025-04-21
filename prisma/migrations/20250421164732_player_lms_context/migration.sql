-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "lms_context_activity" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lms_context_course" TEXT NOT NULL DEFAULT '';
