import { Request, Response } from "express";
import { runGlobalSearch } from "../services/search.service";

export const globalSearch = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const filtersParam = req.query.filters as string | undefined;
    const results = await runGlobalSearch(q, filtersParam);
    return res.json(results);
  } catch (error) {
    console.error("Global search error:", error);
    return res.status(500).json({ error: "Erreur lors de la recherche" });
  }
};
