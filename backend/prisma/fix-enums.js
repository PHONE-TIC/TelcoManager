const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking database for missing PostgreSQL enum types...");
  
  // 1. Create enums if they do not exist
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
  console.log("✅ Enum types checked/created.");

  // 2. Check if columns are still VARCHAR or TEXT
  const columnsInfo = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'techniciens' AND column_name = 'role';
  `);
  
  if (columnsInfo && columnsInfo[0] && (columnsInfo[0].data_type === 'character varying' || columnsInfo[0].data_type === 'text')) {
    console.log("⚙️  Converting string columns to native PostgreSQL enums...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "techniciens" ALTER COLUMN "role" DROP DEFAULT;
      ALTER TABLE "interventions" ALTER COLUMN "statut" DROP DEFAULT;
      ALTER TABLE "stock" ALTER COLUMN "statut" DROP DEFAULT;

      ALTER TABLE "techniciens" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
      ALTER TABLE "interventions" ALTER COLUMN "statut" TYPE "StatutIntervention" USING "statut"::"StatutIntervention";
      ALTER TABLE "stock" ALTER COLUMN "statut" TYPE "StatutStock" USING "statut"::"StatutStock";

      ALTER TABLE "techniciens" ALTER COLUMN "role" SET DEFAULT 'technicien'::"Role";
      ALTER TABLE "interventions" ALTER COLUMN "statut" SET DEFAULT 'planifiee'::"StatutIntervention";
      ALTER TABLE "stock" ALTER COLUMN "statut" SET DEFAULT 'courant'::"StatutStock";
    `);
    console.log("✅ Columns successfully converted to native enums.");
  } else {
    console.log("ℹ️  Columns are already enums. No schema changes needed.");
  }
}

main()
  .catch((err) => {
    console.error("❌ Error executing enum schema patch:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
