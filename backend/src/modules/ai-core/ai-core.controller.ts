import { Request, Response } from 'express';
import { AiCoreService } from './ai-core.service';

export class AiCoreController {
  private aiCoreService: AiCoreService;

  constructor() {
    this.aiCoreService = new AiCoreService();
  }

  evaluateLayout = async (req: Request, res: Response) => {
    try {
      const { x, y } = req.body;
      const result = await this.aiCoreService.evaluateLayout(x, y);
      res.json({ ai_feedback: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  simulateMCDM = async (req: Request, res: Response) => {
    try {
      const { productId, weightKg } = req.body;
      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }
      const dynamicContext = await this.aiCoreService.buildDynamicContext();
      const suggestion = await this.aiCoreService.simulateMCDM(Number(productId), Number(weightKg) || 500, dynamicContext);
      res.status(200).json(suggestion);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  generateLayout = (req: Request, res: Response) => {
    try {
      const { widthX, lengthY, aisleWidth, mainAisleX, levels } = req.body;
      const locations = this.aiCoreService.generateOptimalLayout({ widthX, lengthY, aisleWidth, mainAisleX, levels });
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  applyLayout = async (req: Request, res: Response) => {
    try {
      const { locations } = req.body;
      const result = await this.aiCoreService.applyLayout(locations);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  relocateBuffer = async (req: Request, res: Response) => {
    try {
      const result = await this.aiCoreService.relocateBufferInventory();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  simulateMcdm = async (req: Request, res: Response) => {
    try {
      const { productId, weightKg, context } = req.body;
      if (!productId || !context) {
        return res.status(400).json({ error: 'productId and context are required' });
      }
      const dynamicContext = await this.aiCoreService.buildDynamicContext();
      const fullContext = `[Giả lập từ UI: ${context}] | [Thực tế kho: ${dynamicContext}]`;
      const result = await this.aiCoreService.simulateMCDM(Number(productId), Number(weightKg) || 500, fullContext);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  groupTasks = async (req: Request, res: Response) => {
    try {
      const result = await this.aiCoreService.groupTasks();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
