DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "StatutIntervention" CASCADE;
DROP TYPE IF EXISTS "StatutStock" CASCADE;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('technicien', 'admin', 'gestionnaire');

-- CreateEnum
CREATE TYPE "StatutIntervention" AS ENUM ('planifiee', 'en_cours', 'terminee', 'annulee');

-- CreateEnum
CREATE TYPE "StatutStock" AS ENUM ('courant', 'hs');

-- AlterTable (Technicien)
ALTER TABLE "techniciens" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "techniciens" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "techniciens" ALTER COLUMN "role" SET DEFAULT 'technicien';

-- AlterTable (Intervention)
ALTER TABLE "interventions" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "interventions" ALTER COLUMN "statut" TYPE "StatutIntervention" USING "statut"::"StatutIntervention";
ALTER TABLE "interventions" ALTER COLUMN "statut" SET DEFAULT 'planifiee';

-- AlterTable (Stock)
ALTER TABLE "stock" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "stock" ALTER COLUMN "statut" TYPE "StatutStock" USING "statut"::"StatutStock";
ALTER TABLE "stock" ALTER COLUMN "statut" SET DEFAULT 'courant';
