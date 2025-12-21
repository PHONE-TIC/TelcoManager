import { Router } from 'express';
import * as technicianStockController from '../controllers/technician-stock.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/technician-stock/:technicienId - Obtenir le stock du véhicule d'un technicien
router.get('/:technicienId', technicianStockController.getTechnicianStock);

// POST /api/technician-stock/:technicienId - Ajouter un matériel au véhicule
router.post('/:technicienId', technicianStockController.addItemToVehicle);

// PUT /api/technician-stock/:technicienId/:stockId - Mettre à jour la quantité
router.put('/:technicienId/:stockId', technicianStockController.updateItemQuantity);

// DELETE /api/technician-stock/:technicienId/:stockId - Retirer un matériel du véhicule
router.delete('/:technicienId/:stockId', technicianStockController.removeItemFromVehicle);

export default router;
