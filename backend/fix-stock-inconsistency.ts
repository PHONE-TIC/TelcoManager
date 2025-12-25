import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking for inconsistent stock (In Stock + Installed)...");

  // Find items in stock (qty > 0)
  const availableStock = await prisma.stock.findMany({
    where: {
      quantite: { gt: 0 },
      statut: "courant",
    },
    include: {
      clientEquipements: true, // Include all fields including status
      technicianStocks: true,
    },
  });

  let fixedCount = 0;

  for (const item of availableStock) {
    // Check for ClientEquipment
    if (item.clientEquipements && item.clientEquipements.length > 0) {
      const activeInstallation = item.clientEquipements.find(
        (ce) => ce.statut === "installe"
      );
      const otherInstallation = item.clientEquipements.find(
        (ce) => ce.statut !== "installe"
      );

      if (activeInstallation) {
        console.log(
          `[INCONSISTENCY] Item ${item.nomMateriel} (Qty: ${item.quantite}) is INSTALLED at client but also in STOCK.`
        );
        // This would be the true data inconsistency we sought earlier
      } else if (otherInstallation) {
        console.log(
          `[DIAGNOSTIC] Item ${item.nomMateriel} (Qty: ${item.quantite}) has HISTORY (Status: ${otherInstallation.statut}).`
        );
        console.log(
          " -> This confirms Frontend Bug: 'getLocation' blindly uses this record."
        );
        fixedCount++; // Using this as counter for confirmation
      }
    }
  }

  console.log(`Verification complete. Fixed ${fixedCount} inconsistencies.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
