const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Starting database schema recovery and patch...");

  // 1. Create Enums if they do not exist
  console.log("⚙️  Creating PostgreSQL custom enum types if missing...");
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
            CREATE TYPE "Role" AS ENUM ('technicien', 'admin', 'gestionnaire');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutIntervention') THEN
            CREATE TYPE "StatutIntervention" AS ENUM ('planifiee', 'en_cours', 'terminee', 'annulee');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutStock') THEN
            CREATE TYPE "StatutStock" AS ENUM ('courant', 'hs', 'retour_fournisseur');
        END IF;
    END$$;
  `);

  // 2. Create missing tables if they do not exist
  console.log("⚙️  Verifying and creating missing tables...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" TEXT NOT NULL,
        "technicien_id" TEXT NOT NULL,
        "endpoint" TEXT NOT NULL,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "user_agent" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "client_equipments" (
        "id" TEXT NOT NULL,
        "client_id" TEXT NOT NULL,
        "client_nom" TEXT,
        "stock_id" TEXT NOT NULL,
        "reference_materiel" TEXT NOT NULL,
        "date_installation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "statut" TEXT NOT NULL DEFAULT 'installe',
        "notes" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "client_equipments_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "intervention_equipments" (
        "id" TEXT NOT NULL,
        "intervention_id" TEXT NOT NULL,
        "stock_id" TEXT,
        "action" TEXT NOT NULL,
        "quantite" INTEGER NOT NULL DEFAULT 1,
        "nom" TEXT,
        "marque" TEXT,
        "modele" TEXT,
        "serial_number" TEXT,
        "notes" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "intervention_equipments_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "technician_stocks" (
        "id" TEXT NOT NULL,
        "technicien_id" TEXT NOT NULL,
        "stock_id" TEXT NOT NULL,
        "quantite" INTEGER NOT NULL DEFAULT 1,
        "etat" TEXT NOT NULL DEFAULT 'ok',
        "client_id" TEXT,
        "assigned_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "technician_stocks_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "inventory_sessions" (
        "id" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "notes" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "inventory_sessions_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "inventory_items" (
        "id" TEXT NOT NULL,
        "session_id" TEXT NOT NULL,
        "stock_id" TEXT NOT NULL,
        "expectedQuantity" INTEGER NOT NULL DEFAULT 0,
        "countedQuantity" INTEGER,
        "notes" TEXT,
        CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "notifications" (
        "id" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "link" TEXT,
        "metadata" JSONB,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
    );
  `);

  // 3. Add missing columns if they do not exist
  console.log("⚙️  Verifying and appending missing columns...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "techniciens" ADD COLUMN IF NOT EXISTS "last_login" TIMESTAMP(3);

    ALTER TABLE "interventions" ADD COLUMN IF NOT EXISTS "outlook_event_id" TEXT;
    ALTER TABLE "interventions" ADD COLUMN IF NOT EXISTS "signature" TEXT;
    ALTER TABLE "interventions" ADD COLUMN IF NOT EXISTS "signatureTechnicien" TEXT;
    ALTER TABLE "interventions" ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP(3);
    ALTER TABLE "interventions" ADD COLUMN IF NOT EXISTS "locked_by" TEXT;
    ALTER TABLE "interventions" ADD COLUMN IF NOT EXISTS "commentaireTechnicien" TEXT;

    ALTER TABLE "stock" ADD COLUMN IF NOT EXISTS "numero_serie" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "stock" ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER DEFAULT 5;
  `);

  // 4. Convert columns to native PostgreSQL enums if they are still TEXT/VARCHAR
  console.log("⚙️  Aligning column typings with native enum structures...");
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
        role_type text;
        statut_type text;
        stock_statut_type text;
    BEGIN
        SELECT data_type INTO role_type FROM information_schema.columns WHERE table_name = 'techniciens' AND column_name = 'role';
        SELECT data_type INTO statut_type FROM information_schema.columns WHERE table_name = 'interventions' AND column_name = 'statut';
        SELECT data_type INTO stock_statut_type FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'statut';

        IF role_type = 'character varying' OR role_type = 'text' THEN
            ALTER TABLE "techniciens" ALTER COLUMN "role" DROP DEFAULT;
            ALTER TABLE "techniciens" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
            ALTER TABLE "techniciens" ALTER COLUMN "role" SET DEFAULT 'technicien'::"Role";
        END IF;

        IF statut_type = 'character varying' OR statut_type = 'text' THEN
            ALTER TABLE "interventions" ALTER COLUMN "statut" DROP DEFAULT;
            ALTER TABLE "interventions" ALTER COLUMN "statut" TYPE "StatutIntervention" USING "statut"::"StatutIntervention";
            ALTER TABLE "interventions" ALTER COLUMN "statut" SET DEFAULT 'planifiee'::"StatutIntervention";
        END IF;

        IF stock_statut_type = 'character varying' OR stock_statut_type = 'text' THEN
            ALTER TABLE "stock" ALTER COLUMN "statut" DROP DEFAULT;
            ALTER TABLE "stock" ALTER COLUMN "statut" TYPE "StatutStock" USING "statut"::"StatutStock";
            ALTER TABLE "stock" ALTER COLUMN "statut" SET DEFAULT 'courant'::"StatutStock";
        END IF;
    END$$;
  `);

  console.log("✅ Database schema recovery and patch successfully completed!");
}

main()
  .catch((err) => {
    console.error("❌ Error executing defensive schema recovery:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
