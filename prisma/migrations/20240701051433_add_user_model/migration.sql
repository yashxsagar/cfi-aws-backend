-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('notion', 'google');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "providerId" TEXT,
    "provider" "Provider" NOT NULL DEFAULT 'notion',
    "name" TEXT,
    "workspaceName" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_providerId_key" ON "User"("providerId");
