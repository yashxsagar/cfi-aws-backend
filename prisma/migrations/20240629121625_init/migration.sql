-- CreateEnum
CREATE TYPE "PwWageLevel" AS ENUM ('I', 'II', 'III', 'IV');

-- CreateTable
CREATE TABLE "LCADisclosure" (
    "id" TEXT NOT NULL,
    "jobTitle" VARCHAR(255) NOT NULL,
    "socTitle" VARCHAR(255) NOT NULL,
    "employerName" VARCHAR(255) NOT NULL,
    "tradeNameDba" VARCHAR(255),
    "worksiteCity" VARCHAR(100) NOT NULL,
    "worksiteCounty" VARCHAR(100) NOT NULL,
    "worksiteState" VARCHAR(2) NOT NULL DEFAULT 'XX',
    "worksitePostalCode" VARCHAR(5) NOT NULL,
    "wageRateOfPayFrom" DOUBLE PRECISION NOT NULL,
    "wageRateOfPayTo" DOUBLE PRECISION,
    "harmonizedWageRate" DOUBLE PRECISION NOT NULL,
    "prevailingWage" DOUBLE PRECISION NOT NULL,
    "pwWageLevel" "PwWageLevel" NOT NULL,
    "combinedTitle" VARCHAR(255) NOT NULL,
    "kmeansCluster" INTEGER NOT NULL,
    "industryJobTitle" VARCHAR(255) NOT NULL,
    "dbscanCluster" INTEGER NOT NULL,

    CONSTRAINT "LCADisclosure_pkey" PRIMARY KEY ("id")
);
