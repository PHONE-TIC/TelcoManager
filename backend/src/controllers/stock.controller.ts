import { Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import { buildPagination, parsePagination, respondValidationError } from "./controller.utils";
import { stockClientMiniSelect, stockTechnicienMiniSelect } from "./prisma-selects";
import { generateStockReference } from "./stock.controller.helpers";
import { createStockItems, moveStockToHs } from "../services/stock-write.service";

export const getAllStock = async (req: AuthRequest, res: Response) => {
  try {
    const { statut, categorie, search, page = "1", limit = "50" } = req.query;
    const { page: currentPage, limit: pageSize, skip } = parsePagination({
      page: page as string,
      limit: limit as string,
    });

    const where: any = {};

    // If statut is not 'all', filter by status
    if (statut && statut !== "all") {
      where.statut = statut;
      // For 'courant' (available) stock, only show items with quantity > 0
      // This hides items that are fully assigned to technicians/clients
      if (statut === "courant") {
        where.quantite = { gt: 0 };
      }
    }
    if (categorie) where.categorie = categorie;
    if (search) {
      where.OR = [
        {
          nomMateriel: {
            contains: search as string,
            mode: "insensitive" as const,
          },
        },
        {
          reference: {
            contains: search as string,
            mode: "insensitive" as const,
          },
        },
        { codeBarre: { contains: search as string } },
        {
          numeroSerie: {
            contains: search as string,
            mode: "insensitive" as const,
          },
        },
      ];
    }

    // Include relations for 'all' view to show location
    const includeRelations = statut === "all";

    const [stock, total] = await Promise.all([
      prisma.stock.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nomMateriel: "asc" },
        include: includeRelations
          ? {
              technicianStocks: {
                include: {
                  technicien: {
                    select: stockTechnicienMiniSelect,
                  },
                  client: {
                    select: stockClientMiniSelect,
                  },
                },
              },
              clientEquipements: {
                include: {
                  client: {
                    select: stockClientMiniSelect,
                  },
                },
              },
            }
          : undefined,
      }),
      prisma.stock.count({ where }),
    ]);

    res.json({
      stock,
      pagination: {
        ...buildPagination(currentPage, pageSize, total),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du stock:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du stock" });
  }
};

export const getStockById = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;

    const stock = await prisma.stock.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            clientEquipements: true,
            interventionEquipements: true,
          },
        },
        technicianStocks: {
          include: {
            technicien: {
              select: { id: true, nom: true },
            },
            client: {
              select: { id: true, nom: true },
            },
          },
        },
        clientEquipements: {
          include: {
            client: {
              select: { id: true, nom: true },
            },
          },
        },
      },
    });

    if (!stock) {
      return res.status(404).json({ error: "Article non trouvé" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'article:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de l'article" });
  }
};

export const getStockByBarcode = async (req: AuthRequest, res: Response) => {
  try {
    const { codeBarre } = req.params;

    const stock = await prisma.stock.findUnique({
      where: { codeBarre },
    });

    if (!stock) {
      return res.status(404).json({ error: "Article non trouvé" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Erreur lors de la recherche par code-barres:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
};

export const getStockBySerial = async (req: AuthRequest, res: Response) => {
  try {
    const { numeroSerie } = req.params;

    const stock = await prisma.stock.findFirst({
      where: { numeroSerie: { equals: numeroSerie, mode: "insensitive" } },
    });

    if (!stock) {
      return res
        .status(404)
        .json({ error: "Article non trouvé avec ce numéro de série" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Erreur lors de la recherche par numéro de série:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
};

export const createStock = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const result = await createStockItems(req.body);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Code-barres déjà utilisé" });
    }
    console.error("Erreur lors de la création de l'article:", error);
    return res.status(500).json({ error: "Erreur lors de la création de l'article" });
  }
};

export const updateStock = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      nomMateriel,
      reference,
      marque,
      modele,
      codeBarre,
      categorie,
      statut,
      quantite,
      notes,
      numeroSerie,
      fournisseur,
      lowStockThreshold,
    } = req.body;

    const data: any = {
      ...(nomMateriel && { nomMateriel }),
      ...(reference && { reference }),
      ...(marque !== undefined && { marque }),
      ...(modele !== undefined && { modele }),
      ...(codeBarre !== undefined && { codeBarre: codeBarre?.trim() || null }),
      ...(categorie && { categorie }),
      ...(statut && { statut }),
      ...(quantite !== undefined && { quantite }),
      ...(notes !== undefined && { notes }),
      ...(numeroSerie !== undefined && { numeroSerie }),
      ...(fournisseur !== undefined && { fournisseur }),
      ...(lowStockThreshold !== undefined && { lowStockThreshold }),
    };

    const stock = await prisma.stock.update({
      where: { id },
      data,
    });

    res.json(stock);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Article non trouvé" });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Code-barres déjà utilisé" });
    }
    console.error("Erreur lors de la mise à jour de l'article:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour de l'article" });
  }
};

export const deleteStock = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    await prisma.stock.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Article non trouvé" });
    }
    // Foreign key constraint violation
    if (error.code === "P2003") {
      return res.status(409).json({
        error:
          "Impossible de supprimer cet article car il est lié à des interventions ou des équipements clients.",
      });
    }
    console.error("Erreur lors de la suppression de l'article:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la suppression de l'article" });
  }
};

export const moveToHS = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    const result = await moveStockToHs({
      stockId: id,
      quantite: req.body.quantite,
      notes: req.body.notes,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur lors du déplacement vers HS:", error);
    return res.status(500).json({ error: "Erreur lors du déplacement" });
  }
};

export const getStockStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalCourant, totalHS, categories, stockFaible] = await Promise.all([
      prisma.stock.aggregate({
        where: { statut: "courant" },
        _sum: { quantite: true },
        _count: true,
      }),
      prisma.stock.aggregate({
        where: { statut: "hs" },
        _sum: { quantite: true },
        _count: true,
      }),
      prisma.stock.groupBy({
        by: ["categorie"],
        _sum: { quantite: true },
        _count: true,
      }),
      prisma.stock.findMany({
        where: {
          statut: "courant",
          quantite: { lte: 5 },
        },
        orderBy: { quantite: "asc" },
        take: 10,
      }),
    ]);

    res.json({
      stockCourant: {
        totalArticles: totalCourant._count,
        totalQuantite: totalCourant._sum.quantite || 0,
      },
      stockHS: {
        totalArticles: totalHS._count,
        totalQuantite: totalHS._sum.quantite || 0,
      },
      parCategorie: categories.map((cat) => ({
        categorie: cat.categorie,
        articles: cat._count,
        quantite: cat._sum.quantite || 0,
      })),
      stockFaible,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des statistiques" });
  }
};
