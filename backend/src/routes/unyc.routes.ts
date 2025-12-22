import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { syncCustomers, testConnection } from '../controllers/unyc.controller';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);

// Test UNYC connection
router.get('/test-connection', testConnection);

// Sync customers from UNYC
router.post('/sync-customers', syncCustomers);

export default router;
