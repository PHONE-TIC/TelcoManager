import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SearchFilters {
    dateFrom?: string;
    dateTo?: string;
    status?: string[];
    category?: string[];
    technicianId?: string;
}

interface GlobalSearchParams {
    q: string;
    entities?: string[];
    filters?: SearchFilters;
}

export const globalSearch = async (req: Request, res: Response) => {
    try {
        const q = req.query.q as string;
        const entitiesParam = req.query.entities;
        const filtersParam = req.query.filters as string;

        console.log('[Global Search] Raw query params:', { q, entities: entitiesParam, filters: filtersParam });

        if (!q || q.length === 0) {
            console.log('[Global Search] Empty query, returning empty results');
            return res.json({
                clients: [],
                interventions: [],
                stock: [],
                techniciens: [],
                totalResults: 0
            });
        }

        const searchTerm = String(q).trim();
        const maxResults = 20;
        const results: any = {
            clients: [],
            interventions: [],
            stock: [],
            techniciens: [],
            totalResults: 0
        };

        // Default entities
        const entities: string[] = ['clients', 'interventions', 'stock', 'techniciens'];

        console.log('[Global Search] Searching for:', searchTerm);

        // Parse filters
        let parsedFilters: SearchFilters = {};
        if (filtersParam) {
            try {
                parsedFilters = JSON.parse(filtersParam);
            } catch (error) {
                console.error('[Global Search] Error parsing filters:', error);
                parsedFilters = {};
            }
        }
        console.log('[Global Search] Parsed filters:', parsedFilters);

        // Search Clients
        if (entities.includes('clients')) {
            results.clients = await prisma.client.findMany({
                where: {
                    OR: [
                        { nom: { contains: searchTerm, mode: 'insensitive' } },
                        { telephone: { contains: searchTerm } },
                    ]
                },
                take: maxResults,
                orderBy: { nom: 'asc' }
            });
            console.log(`[Global Search] Found ${results.clients.length} clients`);
        }

        // Search Interventions
        if (entities.includes('interventions')) {
            const interventionWhere: any = {
                OR: [
                    { titre: { contains: searchTerm, mode: 'insensitive' } },
                    { description: { contains: searchTerm, mode: 'insensitive' } },
                    { client: { nom: { contains: searchTerm, mode: 'insensitive' } } },
                    { technicien: { nom: { contains: searchTerm, mode: 'insensitive' } } },
                ]
            };

            // Apply filters
            if (parsedFilters.dateFrom || parsedFilters.dateTo) {
                interventionWhere.datePlanifiee = {};
                if (parsedFilters.dateFrom) {
                    interventionWhere.datePlanifiee.gte = new Date(parsedFilters.dateFrom);
                }
                if (parsedFilters.dateTo) {
                    interventionWhere.datePlanifiee.lte = new Date(parsedFilters.dateTo);
                }
            }

            if (parsedFilters.status && parsedFilters.status.length > 0) {
                interventionWhere.statut = { in: parsedFilters.status };
            }

            if (parsedFilters.technicianId) {
                interventionWhere.technicienId = parsedFilters.technicianId;
            }

            results.interventions = await prisma.intervention.findMany({
                where: interventionWhere,
                include: {
                    client: { select: { nom: true } },
                    technicien: { select: { nom: true } }
                },
                take: maxResults,
                orderBy: { datePlanifiee: 'desc' }
            });
            console.log(`[Global Search] Found ${results.interventions.length} interventions`);
        }

        // Search Stock
        if (entities.includes('stock')) {
            const stockWhere: any = {
                OR: [
                    { nomMateriel: { contains: searchTerm, mode: 'insensitive' } },
                    { reference: { contains: searchTerm, mode: 'insensitive' } },
                    { numeroSerie: { contains: searchTerm, mode: 'insensitive' } },
                    { codeBarre: { contains: searchTerm } },
                    { categorie: { contains: searchTerm, mode: 'insensitive' } },
                    { fournisseur: { contains: searchTerm, mode: 'insensitive' } },
                ]
            };

            if (parsedFilters.category && parsedFilters.category.length > 0) {
                stockWhere.categorie = { in: parsedFilters.category };
            }

            results.stock = await prisma.stock.findMany({
                where: stockWhere,
                take: maxResults,
                orderBy: { nomMateriel: 'asc' }
            });
            console.log(`[Global Search] Found ${results.stock.length} stock items`);
        }

        // Search Techniciens
        if (entities.includes('techniciens')) {
            results.techniciens = await prisma.technicien.findMany({
                where: {
                    OR: [
                        { nom: { contains: searchTerm, mode: 'insensitive' } },
                        { username: { contains: searchTerm, mode: 'insensitive' } },
                    ]
                },
                select: {
                    id: true,
                    nom: true,
                    username: true,
                },
                take: maxResults,
                orderBy: { nom: 'asc' }
            });
            console.log(`[Global Search] Found ${results.techniciens.length} techniciens`);
        }

        // Calculate total results
        results.totalResults =
            results.clients.length +
            results.interventions.length +
            results.stock.length +
            results.techniciens.length;

        console.log(`[Global Search] Total results: ${results.totalResults}`);
        res.json(results);
    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({ error: 'Erreur lors de la recherche' });
    }
};
