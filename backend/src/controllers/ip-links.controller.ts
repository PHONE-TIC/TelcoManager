import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { getIpLinksSnapshot, syncIpLinks } from "../services/ip-links.service";

function ensureManagerOrAdmin(req: AuthRequest, res: Response) {
  if (req.user?.role !== "admin" && req.user?.role !== "gestionnaire") {
    res.status(403).json({ error: "Accès réservé aux administrateurs et gestionnaires" });
    return false;
  }
  return true;
}

export async function getIpLinks(req: AuthRequest, res: Response) {
  if (!ensureManagerOrAdmin(req, res)) return;

  const snapshot = getIpLinksSnapshot();
  res.json(snapshot);
}

export async function syncIpLinksNow(req: AuthRequest, res: Response) {
  if (!ensureManagerOrAdmin(req, res)) return;

  try {
    const snapshot = await syncIpLinks();
    res.json(snapshot);
  } catch (error: any) {
    console.error("IP links sync error:", error);
    res.status(500).json({ error: error.message || "Erreur lors de la synchronisation des liens IP" });
  }
}
