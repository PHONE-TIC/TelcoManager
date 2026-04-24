import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { fetchIpLinkRouterUptime, getIpLinksSnapshot, syncIpLinks } from "../services/ip-links.service";

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

export function getIpLinkByReference(req: AuthRequest, res: Response) {
  if (!ensureManagerOrAdmin(req, res)) return;

  const reference = decodeURIComponent(String(req.params.reference || "")).trim().toLowerCase();
  const snapshot = getIpLinksSnapshot();
  const item = snapshot.items.find((link) => link.reference.trim().toLowerCase() === reference);

  if (!item) {
    res.status(404).json({ error: "Lien IP introuvable" });
    return;
  }

  res.json({
    item,
    stats: snapshot.stats,
  });
}

export async function getIpLinkUptime(req: AuthRequest, res: Response) {
  if (!ensureManagerOrAdmin(req, res)) return;

  const linkId = Number(req.params.id);
  if (!Number.isFinite(linkId) || linkId <= 0) {
    res.status(400).json({ error: "Identifiant de lien IP invalide" });
    return;
  }

  try {
    const routerUptime = await fetchIpLinkRouterUptime(linkId);
    res.json({ routerUptime });
  } catch (error: any) {
    console.error("IP link uptime fetch error:", error);
    res.status(500).json({ error: error.message || "Erreur lors de la récupération de l'uptime du lien IP" });
  }
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
