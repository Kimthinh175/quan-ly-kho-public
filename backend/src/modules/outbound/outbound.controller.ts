import { Request, Response } from 'express';
import { OutboundService } from './outbound.service';

const outboundService = OutboundService.getInstance();

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { details } = req.body;
    const order = await outboundService.createOrder(details);
    res.status(201).json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await outboundService.getOrders();
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const generatePickingTask = async (req: Request, res: Response) => {
  try {
    const { orderCode, driverId } = req.body;
    const tasks = await outboundService.generatePickingTask(orderCode, driverId);
    res.status(200).json(tasks);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const confirmPick = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.body;
    const task = await outboundService.confirmPick(taskId);
    res.status(200).json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
