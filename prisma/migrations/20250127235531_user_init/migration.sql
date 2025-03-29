-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "lms_iss" TEXT NOT NULL,
    "lms_platform" TEXT NOT NULL,
    "lms_user_id" TEXT NOT NULL,
    "lms_version" TEXT NOT NULL,
    "lms_client_id" TEXT NOT NULL,
    "lms_outcome_source_id" TEXT NOT NULL,
    "lms_outcome_service_url" TEXT NOT NULL,
    "auth_refresh_token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_public_id_key" ON "User"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_lms_iss_lms_user_id_key" ON "User"("lms_iss", "lms_user_id");
