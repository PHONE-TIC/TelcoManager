import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as searchController from '../controllers/search.controller';

const router = Router();

router.get('/global', authenticate, searchController.globalSearch);

export default router;
