import { Request, Response } from 'express';
import { InboundService } from './inbound.service';

export class InboundController {
  private inboundService: InboundService;

  constructor() {
    this.inboundService = InboundService.getInstance();
  }

  createReceipt = async (req: Request, res: Response) => {
    try {
      const { details } = req.body;
      const receipt = await this.inboundService.createReceipt(details);
      res.status(201).json(receipt);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  getReceipts = async (req: Request, res: Response) => {
    res.json(await this.inboundService.getReceipts());
  };
  // Lấy danh sách LPN có phân trang
  getLPNs = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    res.json(await this.inboundService.getLPNs(page, limit));
  };

  getWorkTasks = async (req: Request, res: Response) => {
    res.json(await this.inboundService.getWorkTasks());
  };

  palletize = async (req: Request, res: Response) => {
    try {
      const { receiptId, actualQuantities } = req.body;
      const lpns = await this.inboundService.palletize(receiptId, actualQuantities);
      res.status(201).json(lpns);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  // B4: Nhập hàng lẻ
  looseReceipt = async (req: Request, res: Response) => {
    try {
      const { productId, qty } = req.body;
      if (!productId || !qty) return res.status(400).json({ error: 'Missing productId or qty' });
      const result = await this.inboundService.looseReceipt(Number(productId), Number(qty));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  generateTask = async (req: Request, res: Response) => {
    try {
      const { lpnCode } = req.body;
      const task = await this.inboundService.generatePutawayTask(lpnCode);
      res.status(201).json(task);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  confirmPutaway = async (req: Request, res: Response) => {
    try {
      const { taskId, scannedLocationCode } = req.body;
      const result = await this.inboundService.confirmPutaway(taskId, scannedLocationCode);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  reassignTask = async (req: Request, res: Response) => {
    try {
      // Trigger rebuild
      const { taskId, failedLocationCode } = req.body;
      const result = await this.inboundService.reassignTask(taskId, failedLocationCode);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}
