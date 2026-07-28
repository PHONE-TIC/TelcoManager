import { StatutStock } from "@prisma/client";
import { prisma } from "../db";
import { generateStockReference, parseSerialNumbers } from "../controllers/stock.controller.helpers";

type StockWriteInput = {
  nomMateriel?: string;
  reference?: string;
  marque?: string;
  modele?: string | null;
  codeBarre?: string;
  categorie?: string;
  statut?: StatutStock;
  quantite?: number;
  notes?: string;
  numeroSerie?: string;
  fournisseur?: string;
  lowStockThreshold?: number;
};

function getDuplicateStockLocation(item: {
  technicianStocks?: Array<{ technicien?: { nom: string | null } | null }>;
  clientEquipements?: Array<{ client?: { nom: string | null } | null }>;
}) {
  if (item.technicianStocks?.[0]?.technicien) {
    return `Véhicule de ${item.technicianStocks[0].technicien.nom || "Technicien"}`;
  }

  if (item.clientEquipements?.[0]?.client) {
    return `Client: ${item.clientEquipements[0].client.nom || "Inconnu"}`;
  }

  return "Stock principal";
}

export async function createStockItems(input: StockWriteInput) {
  if (input.quantite !== undefined && (!Number.isInteger(input.quantite) || input.quantite < 0)) {
    return {
      status: 400 as const,
      body: { error: "Quantité invalide" },
    };
  }

  const {
    nomMateriel,
    reference,
    marque,
    modele,
    codeBarre,
    categorie,
    statut = StatutStock.courant,
    quantite = 1,
    notes,
    numeroSerie,
    fournisseur,
    lowStockThreshold,
  } = input;

  let finalReference = reference;
  if (!reference && marque && categorie) {
    finalReference = await generateStockReference(marque, categorie, modele);
  } else if (!reference) {
    return {
      status: 400 as const,
      body: {
        error:
          "La marque et la catégorie sont requises pour générer la référence automatiquement, ou fournissez une référence manuellement.",
      },
    };
  }

  const finalNomMateriel =
    nomMateriel ||
    (modele ? `${marque ?? ""} ${modele}` : `${marque ?? ""} ${categorie ?? ""}`);

  const serialNumbers = parseSerialNumbers(numeroSerie);
  const uniqueSerials = [...new Set(serialNumbers)];
  if (uniqueSerials.length !== serialNumbers.length) {
    return {
      status: 400 as const,
      body: {
        error: "Des numéros de série doublons ont été détectés dans la saisie multiple.",
      },
    };
  }

  // parseSerialNumbers normalise et écarte déjà les entrées vides
  const nonEmptySerialNumbers = serialNumbers;

  if (nonEmptySerialNumbers.length > 0) {
    const existingItems = await prisma.stock.findMany({
      where: {
        numeroSerie: {
          in: nonEmptySerialNumbers,
          mode: "insensitive",
        },
      },
      include: {
        technicianStocks: {
          include: {
            technicien: {
              select: { nom: true },
            },
          },
        },
        clientEquipements: {
          include: {
            client: {
              select: { nom: true },
            },
          },
        },
      },
    });

    if (existingItems.length > 0) {
      const duplicates = existingItems.map((item) => ({
        numeroSerie: item.numeroSerie,
        reference: item.reference,
        nomMateriel: item.nomMateriel,
        location: getDuplicateStockLocation(item),
      }));

      return {
        status: 409 as const,
        body: {
          error: `Numéro(s) de série déjà enregistré(s) : ${duplicates.map((d) => d.numeroSerie).join(", ")}`,
          duplicates,
          details: duplicates
            .map((d) => `• ${d.numeroSerie} (${d.nomMateriel}) - ${d.location}`)
            .join("\n"),
        },
      };
    }
  }

  if (serialNumbers.length > 1) {
    const createdItems = [];
    for (let index = 0; index < serialNumbers.length; index += 1) {
      const sn = serialNumbers[index];
      let itemRef = finalReference ?? "";
      if (!reference && marque && categorie && index > 0) {
        itemRef = await generateStockReference(marque, categorie, modele);
      }

      const item = await prisma.stock.create({
        data: {
          nomMateriel: finalNomMateriel,
          marque,
          modele,
          reference: itemRef,
          codeBarre: null,
          categorie: categorie ?? "",
          statut,
          quantite: 1,
          notes,
          numeroSerie: sn,
          fournisseur,
          lowStockThreshold,
        },
      });
      createdItems.push(item);
    }

    return {
      status: 201 as const,
      body: { created: createdItems.length, items: createdItems },
    };
  }

  const stock = await prisma.stock.create({
    data: {
      nomMateriel: finalNomMateriel,
      marque,
      modele,
      reference: finalReference ?? "",
      codeBarre: codeBarre?.trim() || null,
      categorie: categorie ?? "",
      statut,
      quantite,
      notes,
      numeroSerie: serialNumbers[0] || "",
      fournisseur,
      lowStockThreshold,
    },
  });

  return {
    status: 201 as const,
    body: stock,
  };
}

export async function moveStockToHs(input: {
  stockId: string;
  quantite?: number;
  notes?: string;
  performedById?: string;
}) {
  const stockCourant = await prisma.stock.findUnique({
    where: { id: input.stockId },
  });

  if (!stockCourant) {
    return {
      status: 404 as const,
      body: { error: "Article non trouvé" },
    };
  }

  if (stockCourant.statut !== "courant") {
    return {
      status: 400 as const,
      body: { error: "Cet article n'est pas en stock courant" },
    };
  }

  const qteADeplacer = input.quantite !== undefined ? input.quantite : stockCourant.quantite;
  if (!Number.isInteger(qteADeplacer) || qteADeplacer <= 0) {
    return {
      status: 400 as const,
      body: { error: "Quantité invalide" },
    };
  }

  if (qteADeplacer > stockCourant.quantite) {
    return {
      status: 400 as const,
      body: { error: "Quantité insuffisante en stock" },
    };
  }

  const isSerialized = stockCourant.numeroSerie.trim() !== "";

  // Un article sérialisé désigne un objet physique unique : il ne peut pas être
  // scindé entre stock courant et stock HS, et son numéro de série ne peut pas
  // être dupliqué sur une seconde ligne (index unique partiel en base).
  if (isSerialized && qteADeplacer !== stockCourant.quantite) {
    return {
      status: 400 as const,
      body: {
        error:
          "Article sérialisé : le déplacement partiel vers le stock HS est impossible, la totalité doit être déplacée.",
      },
    };
  }

  // L'ensemble des écritures est encapsulé dans une transaction : une coupure en
  // cours d'opération ne peut plus décrémenter le stock courant sans créditer le HS.
  await prisma.$transaction(async (tx) => {
    if (isSerialized) {
      // Article sérialisé : on bascule la ligne d'origine en HS pour conserver
      // le numéro de série et l'historique, comme le fait le flux stock véhicule.
      await tx.stock.update({
        where: { id: input.stockId },
        data: {
          statut: "hs",
          notes: input.notes || stockCourant.notes,
        },
      });

      await tx.stockMovement.create({
        data: {
          stockId: input.stockId,
          type: "hs",
          quantite: qteADeplacer,
          quantiteAvant: stockCourant.quantite,
          quantiteApres: stockCourant.quantite,
          reason: input.notes || "Matériel passé hors service",
          performedById: input.performedById,
        },
      });
      return;
    }

    // Article non sérialisé : on décrémente le stock courant et on agrège la
    // quantité sur la ligne HS correspondante (créée si elle n'existe pas).
    await tx.stock.update({
      where: { id: input.stockId },
      data: {
        quantite: { decrement: qteADeplacer },
      },
    });

    let stockHS = await tx.stock.findFirst({
      where: {
        reference: stockCourant.reference,
        statut: "hs",
        nomMateriel: stockCourant.nomMateriel,
      },
    });

    if (!stockHS) {
      stockHS = await tx.stock.create({
        data: {
          nomMateriel: stockCourant.nomMateriel,
          marque: stockCourant.marque,
          modele: stockCourant.modele,
          reference: stockCourant.reference,
          categorie: stockCourant.categorie,
          fournisseur: stockCourant.fournisseur,
          statut: "hs",
          quantite: 0,
          codeBarre: null,
          lowStockThreshold: 0,
          notes: input.notes || "Matériel hors service",
        },
      });
    }

    const quantiteAvantHs = stockHS.quantite;

    await tx.stock.update({
      where: { id: stockHS.id },
      data: {
        quantite: { increment: qteADeplacer },
        notes: input.notes || stockHS.notes,
      },
    });

    await tx.stockMovement.create({
      data: {
        stockId: stockHS.id,
        type: "hs",
        quantite: qteADeplacer,
        quantiteAvant: quantiteAvantHs,
        quantiteApres: quantiteAvantHs + qteADeplacer,
        reason: `${input.notes || "Matériel passé hors service"} - Origine: ${input.stockId}`,
        performedById: input.performedById,
      },
    });
  });

  return {
    status: 200 as const,
    body: {
      message: `${qteADeplacer} unité(s) déplacée(s) vers le stock HS`,
    },
  };
}
