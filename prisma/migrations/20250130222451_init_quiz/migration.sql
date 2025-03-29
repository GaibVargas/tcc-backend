-- CreateTable
CREATE TABLE "Quiz" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "reference_version" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL,
    "time_limit" INTEGER,
    "correct_text_answer" TEXT,
    "quiz_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "reference_version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "is_correct_answer" BOOLEAN,
    "question_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_public_id_key" ON "Quiz"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "Question_public_id_key" ON "Question"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "Question_reference_key" ON "Question"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_public_id_key" ON "QuestionOption"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_reference_key" ON "QuestionOption"("reference");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
