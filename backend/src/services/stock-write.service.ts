import { prisma } from "../db";
import { generateStockReference, parseSerialNumbers } from "../controllers/stock.controller.helpers";

type StockWriteInput = {
  nomMateriel?: string;
  reference?: string;
  marque?: string;
  modele?: string | null;
  codeBarre?: string;
  categorie?: string;
  statut?: string;
  quantite?: number;
  notes?: string;
  numeroSerie?: string;
  fournisseur?: string;
  lowStockThreshold?: number;
};

export async function createStockItems(input: StockWriteInput) {
  const {
    nomMateriel,
    reference,
    marque,
    modele,
    codeBarre,
    categorie,
    statut = "courant",
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
  const nonEmptySerialNumbers = serialNumbers.filter(
    (serial) => serial && serial.trim() !== ""
  );

  if (nonEmptySerialNumbers.length > 0) {
    const existingItems = await prisma.stock.findMany({
      where: {
        numeroSerie: {
          in: nonEmptySerialNumbers,
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
      const duplicates = (existingItems as any[]).map((item) => {
        let location = "Stock principal";

        if (item.technicianStocks?.length > 0 && item.technicianStocks[0].technicien) {
          location = `Véhicule de ${item.technicianStocks[0].technicien.nom || "Technicien"}`;
        }

        if (item.clientEquipements?.length > 0 && item.clientEquipements[0].client) {
          location = `Client: ${item.clientEquipements[0].client.nom || "Inconnu"}`;
        }

        return {
          numeroSerie: item.numeroSerie,
          reference: item.reference,
          nomMateriel: item.nomMateriel,
          location,
        };
      });

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

  const qteADeplacer = input.quantite || stockCourant.quantite;
  if (qteADeplacer > stockCourant.quantite) {
    return {
      status: 400 as const,
      body: { error: "Quantité insuffisante en stock" },
    };
  }

  await prisma.stock.update({
    where: { id: input.stockId },
    data: {
      quantite: stockCourant.quantite - qteADeplacer,
    },
  });

  const stockHS = await prisma.stock.findFirst({
    where: {
      reference: stockCourant.reference,
      statut: "hs",
    },
  });

  if (stockHS) {
    await prisma.stock.update({
      where: { id: stockHS.id },
      data: {
        quantite: stockHS.quantite + qteADeplacer,
        notes: input.notes || stockHS.notes,
      },
    });
  } else {
    await prisma.stock.create({
      data: {
        nomMateriel: stockCourant.nomMateriel,
        reference: stockCourant.reference,
        categorie: stockCourant.categorie,
        statut: "hs",
        quantite: qteADeplacer,
        notes: input.notes || "Matériel hors service",
      },
    });
  }

  return {
    status: 200 as const,
    body: {
      message: `${qteADeplacer} unité(s) déplacée(s) vers le stock HS`,
    },
  };
}
