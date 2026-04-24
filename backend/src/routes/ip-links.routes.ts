import { Router } from "express";
import { authenticate, requireGestionnaireOrAdmin } from "../middleware/auth.middleware";
import { getIpLinkByReference, getIpLinks, getIpLinkUptime, syncIpLinksNow } from "../controllers/ip-links.controller";

const router = Router();

router.use(authenticate, requireGestionnaireOrAdmin);
router.get("/", getIpLinks);
router.get("/by-reference/:reference", getIpLinkByReference);
router.get("/:id/uptime", getIpLinkUptime);
router.post("/sync", syncIpLinksNow);

export default router;
