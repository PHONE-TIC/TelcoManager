import { prisma } from "../db";
import {
  interventionClientListSelect,
  interventionTechnicienListSelect,
} from "../controllers/prisma-selects";
import { getIpLinksSnapshot } from "./ip-links.service";

interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  category?: string[];
  technicianId?: string;
}

export async function runGlobalSearch(
  q: string,
  filtersParam?: string,
  user?: { id: string; role: string; username: string }
) {
  const searchTerm = String(q || "").trim();
  const maxResults = 20;

  if (!searchTerm || searchTerm.length === 0) {
    return {
      clients: [],
      interventions: [],
      stock: [],
      techniciens: [],
      ipLinks: [],
      totalResults: 0,
    };
  }

  let parsedFilters: SearchFilters = {};
  if (filtersParam) {
    try {
      parsedFilters = JSON.parse(filtersParam);
    } catch {
      parsedFilters = {};
    }
  }

  // Cloisonnement des Liens IP : réservé uniquement aux profils admin et gestionnaire
  const showIpLinks = user?.role === "admin" || user?.role === "gestionnaire";
  const ipLinks = showIpLinks
    ? getIpLinksSnapshot().items
        .filter((link) =>
          [link.reference, link.clientName, link.collecteOperator || "", link.type, link.maxBandwidth]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
        .slice(0, maxResults)
    : [];

  const [clients, interventions, stock, techniciens] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { nom: { contains: searchTerm, mode: "insensitive" } },
          { telephone: { contains: searchTerm } },
        ],
        // Restriction de cloisonnement technicien
        ...(user?.role === "technicien" ? {
          interventions: {
            some: {
              technicienId: user.id,
            },
          },
        } : {}),
      },
      take: maxResults,
      orderBy: { nom: "asc" },
    }),
    prisma.intervention.findMany({
      where: {
        OR: [
          { titre: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
          { client: { nom: { contains: searchTerm, mode: "insensitive" } } },
          {
            technicien: {
              nom: { contains: searchTerm, mode: "insensitive" },
            },
          },
        ],
        ...(parsedFilters.dateFrom || parsedFilters.dateTo
          ? {
              datePlanifiee: {
                ...(parsedFilters.dateFrom
                  ? { gte: new Date(parsedFilters.dateFrom) }
                  : {}),
                ...(parsedFilters.dateTo
                  ? { lte: new Date(parsedFilters.dateTo) }
                  : {}),
              },
            }
          : {}),
        ...(parsedFilters.status?.length
          ? { statut: { in: parsedFilters.status } }
          : {}),
        // Restriction de cloisonnement technicien
        ...(user?.role === "technicien" ? {
          technicienId: user.id,
        } : (parsedFilters.technicianId ? {
          technicienId: parsedFilters.technicianId,
        } : {})),
      },
      include: {
        client: { select: interventionClientListSelect },
        technicien: { select: interventionTechnicienListSelect },
      },
      take: maxResults,
      orderBy: { datePlanifiee: "desc" },
    }),
    prisma.stock.findMany({
      where: {
        OR: [
          { nomMateriel: { contains: searchTerm, mode: "insensitive" } },
          { reference: { contains: searchTerm, mode: "insensitive" } },
          { numeroSerie: { contains: searchTerm, mode: "insensitive" } },
          { codeBarre: { contains: searchTerm } },
          { categorie: { contains: searchTerm, mode: "insensitive" } },
          { fournisseur: { contains: searchTerm, mode: "insensitive" } },
        ],
        ...(parsedFilters.category?.length
          ? { categorie: { in: parsedFilters.category } }
          : {}),
      },
      take: maxResults,
      orderBy: { nomMateriel: "asc" },
    }),
    prisma.technicien.findMany({
      where: {
        OR: [
          { nom: { contains: searchTerm, mode: "insensitive" } },
          { username: { contains: searchTerm, mode: "insensitive" } },
        ],
        // Restriction de cloisonnement technicien : ne voir que soi-même
        ...(user?.role === "technicien" ? {
          id: user.id,
        } : {}),
      },
      select: {
        id: true,
        nom: true,
        username: true,
      },
      take: maxResults,
      orderBy: { nom: "asc" },
    }),
  ]);

  return {
    clients,
    interventions,
    stock,
    techniciens,
    ipLinks,
    totalResults:
      clients.length + interventions.length + stock.length + techniciens.length + ipLinks.length,
  };
}
