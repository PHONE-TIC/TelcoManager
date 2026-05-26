import { Response } from "express";
import { runGlobalSearch } from "../services/search.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const globalSearch = async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;
    const filtersParam = req.query.filters as string | undefined;
    const results = await runGlobalSearch(q, filtersParam, req.user);
    return res.json(results);
  } catch (error) {
    console.error("Global search error:", error);
    return res.status(500).json({ error: "Erreur lors de la recherche" });
  }
};
