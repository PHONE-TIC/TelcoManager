import { Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { buildPagination, parsePagination, respondValidationError } from "./controller.utils";
import {
  getClientDetails,
  getClientEquipmentList,
  getClientInterventionList,
  getClientList,
} from "../services/client-query.service";
import {
  createClientRecord,
  deleteClientRecord,
  updateClientRecord,
} from "../services/client-write.service";

export const getAllClients = async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = "1", limit = "20" } = req.query;
    const { page: currentPage, limit: pageSize, skip } = parsePagination({
      page: page as string,
      limit: limit as string,
    });

    const { clients, total } = await getClientList({
      search,
      skip,
      take: pageSize,
    });

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

    const client = await getClientDetails(id);

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
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    const { limit = "5" } = req.query;

    const interventions = await getClientInterventionList(
      id,
      Number.parseInt(limit as string, 10)
    );

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
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;

    const equipements = await getClientEquipmentList(id);

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
      return respondValidationError(res, errors.array());
    }

    const client = await createClientRecord(req.body);
    return res.status(201).json(client);
  } catch (error) {
    console.error("Erreur lors de la création du client:", error);
    return res.status(500).json({ error: "Erreur lors de la création du client" });
  }
};

export const updateClient = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const client = await updateClientRecord(req.params.id, req.body);
    return res.json(client);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    console.error("Erreur lors de la mise à jour du client:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour du client" });
  }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    await deleteClientRecord(req.params.id);
    return res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    console.error("Erreur lors de la suppression du client:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression du client" });
  }
};
