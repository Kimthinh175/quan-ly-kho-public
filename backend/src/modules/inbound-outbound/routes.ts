import { Router, Request, Response } from 'express';

const router = Router();

// 1. Tạo Phiếu nhập (POST /inbound/receipts)
router.post('/inbound/receipts', (req: Request, res: Response) => {
  const { items } = req.body; // [{product_id, qty}]
  res.json({ receipt_id: 'rcpt_' + Date.now(), status: 'PENDING' });
});

// 2. Xác nhận Cất hàng (POST /inbound/putaway)
router.post('/inbound/putaway', (req: Request, res: Response) => {
  const { items } = req.body; // [{product_id, location_id, qty}]
  res.json({ status: 'COMPLETED', message: 'Tồn kho đã được cập nhật' });
});

// 3. Tạo Đơn xuất/Đơn bán (POST /outbound/orders)
router.post('/outbound/orders', (req: Request, res: Response) => {
  const { items } = req.body; // [{product_id, qty}]
  res.json({ order_id: 'ord_' + Date.now(), status: 'LOCKED', message: 'Hệ thống đã khóa số lượng tồn' });
});

// 4. Xác nhận Nhặt hàng (POST /outbound/pick)
router.post('/outbound/pick', (req: Request, res: Response) => {
  const { order_id, items } = req.body; // [{product_id, location_id, qty}]
  res.json({ order_id, status: 'SHIPPED', message: 'Đã trừ số dư tồn kho thật' });
});

export default router;
