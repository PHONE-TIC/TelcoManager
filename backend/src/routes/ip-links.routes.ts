import { Router } from "express";
import { authenticate, requireGestionnaireOrAdmin } from "../middleware/auth.middleware";
import { getIpLinks, syncIpLinksNow } from "../controllers/ip-links.controller";

const router = Router();

router.use(authenticate, requireGestionnaireOrAdmin);
router.get("/", getIpLinks);
router.post("/sync", syncIpLinksNow);

export default router;
