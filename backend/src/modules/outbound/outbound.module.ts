import { Router } from 'express';
import { createOrder, getOrders, generatePickingTask, confirmPick } from './outbound.controller';

const router = Router();

router.post('/orders', createOrder);
router.get('/orders', getOrders);
router.post('/picking/generate', generatePickingTask);
router.post('/picking/confirm', confirmPick);

export default router;
