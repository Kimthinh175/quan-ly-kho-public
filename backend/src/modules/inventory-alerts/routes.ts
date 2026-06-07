import { Router, Request, Response } from 'express';

const router = Router();

// 1. Tra cứu Số dư (GET /inventory)
router.get('/inventory', (req: Request, res: Response) => {
  const { product_id, location_id } = req.query;
  res.json({ product_id, location_id, available_qty: 150, locked_qty: 20 });
});

// 2. Cập nhật Kiểm kê (POST /inventory/adjust)
router.post('/inventory/adjust', (req: Request, res: Response) => {
  const { location_id, items } = req.body; // [{product_id, actual_qty}]
  res.json({ message: 'Ghi log chênh lệch, cập nhật số dư mới thành công', location_id, updated: true });
});

// 3. Quét hàng Chậm luân chuyển (GET /inventory/dead-stock)
router.get('/inventory/dead-stock', (req: Request, res: Response) => {
  const { days_threshold } = req.query;
  res.json({
    threshold_days: days_threshold || 60,
    items: [
      { product_id: 'prod_2', sku: 'SKU002', last_transaction: '2025-10-01', stuck_value: 5000000 }
    ],
    total_stuck_value: 5000000
  });
});

export default router;
