import { Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth.middleware";
import { buildPagination, parsePagination, respondValidationError } from "./controller.utils";
import { interventionTechnicienListSelect } from "./prisma-selects";

export const getAllClients = async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = "1", limit = "20" } = req.query;
    const { page: currentPage, limit: pageSize, skip } = parsePagination({
      page: page as string,
      limit: limit as string,
    });

    const where = search
      ? {
          OR: [
            {
              nom: { contains: search as string, mode: "insensitive" as const },
            },
            {
              contact: {
                contains: search as string,
                mode: "insensitive" as const,
              },
            },
            { telephone: { contains: search as string } },
          ],
        }
      : {};

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nom: "asc" },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      clients,
      pagination: {
        ...buildPagination(currentPage, pageSize, total),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des clients" });
  }
};

export const getClientById = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            interventions: true,
            equipements: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    res.json(client);
  } catch (error) {
    console.error("Erreur lors de la récupération du client:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du client" });
  }
};

export const getClientInterventions = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { limit = "5" } = req.query;

    // Récupérer les 5 dernières interventions
    const interventions = await prisma.intervention.findMany({
      where: { clientId: id },
      include: {
        technicien: {
          select: interventionTechnicienListSelect,
        },
      },
      orderBy: { datePlanifiee: "desc" },
      take: parseInt(limit as string),
    });

    res.json(interventions);
  } catch (error) {
    console.error("Erreur lors de la récupération des interventions:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des interventions" });
  }
};

export const getClientEquipements = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const equipements = await prisma.clientEquipment.findMany({
      where: { clientId: id },
      include: {
        stock: {
          select: {
            nomMateriel: true,
            reference: true,
            categorie: true,
          },
        },
      },
      orderBy: { dateInstallation: "desc" },
    });

    res.json(equipements);
  } catch (error) {
    console.error("Erreur lors de la récupération des équipements:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des équipements" });
  }
};

export const createClient = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nom,
      rue,
      codePostal,
      ville,
      sousLieu,
      contact,
      telephone,
      email,
      notes,
    } = req.body;

    const client = await prisma.client.create({
      data: {
        nom,
        rue,
        codePostal,
        ville,
        sousLieu,
        contact,
        telephone,
        email,
        notes,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error("Erreur lors de la création du client:", error);
    res.status(500).json({ error: "Erreur lors de la création du client" });
  }
};

export const updateClient = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      nom,
      rue,
      codePostal,
      ville,
      sousLieu,
      contact,
      telephone,
      email,
      notes,
    } = req.body;

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(rue && { rue }),
        ...(codePostal && { codePostal }),
        ...(ville && { ville }),
        ...(sousLieu !== undefined && { sousLieu }), // Allow clearing or setting
        ...(contact && { contact }),
        ...(telephone && { telephone }),
        ...(email !== undefined && { email }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json(client);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    console.error("Erreur lors de la mise à jour du client:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du client" });
  }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    await prisma.client.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    console.error("Erreur lors de la suppression du client:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du client" });
  }
};
