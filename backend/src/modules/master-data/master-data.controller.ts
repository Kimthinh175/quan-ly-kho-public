import { Request, Response } from 'express';
import { MasterDataService } from './master-data.service';

export class MasterDataController {
  private masterDataService: MasterDataService;

  constructor() {
    this.masterDataService = MasterDataService.getInstance();
  }

  // ==== CATEGORY ====
  getCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.masterDataService.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  createCategory = async (req: Request, res: Response) => {
    try {
      const category = await this.masterDataService.createCategory(req.body);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateCategory = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const category = await this.masterDataService.updateCategory(id, req.body);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // ==== PRODUCT ====
  createProduct = async (req: Request, res: Response) => {
    try {
      const product = await this.masterDataService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateProduct = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const product = await this.masterDataService.updateProduct(id, req.body);
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getProducts = async (req: Request, res: Response) => {
    try {
      const products = await this.masterDataService.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getLocations = async (req: Request, res: Response) => {
    try {
      const locations = await this.masterDataService.getAllLocations();
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getInventoryDetails = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const details = await this.masterDataService.getInventoryDetails(page, limit);
      res.json(details);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  createLocation = async (req: Request, res: Response): Promise<any> => {
    const { coord_x, coord_y } = req.body;
    if (coord_x < 1 || coord_x > 50 || coord_y < 1 || coord_y > 20) {
      return res.status(400).json({ error: "Tọa độ (X, Y) vượt quá diện tích kho 1000m2 (Tối đa X: 50, Y: 20)" });
    }
    const newLocs = await this.masterDataService.addLocation(req.body);
    res.status(201).json(newLocs);
  };

  updateLocation = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { status, max_weight_kg } = req.body;
    const updated = await this.masterDataService.updateLocation(id as string, { status, max_weight_kg });
    if (!updated) return res.status(404).json({ error: 'Location not found' });
    res.json(updated);
  };

  importExcel = async (req: any, res: any): Promise<any> => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const xlsx = require('xlsx');
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      
      const count = await this.masterDataService.importFromExcel(data);
      res.json({ message: `Imported ${count} location slots successfully` });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to process Excel file: ' + e.message });
    }
  };

  // ==== EQUIPMENT ====
  getEquipments = async (req: Request, res: Response) => {
    try {
      const equip = await this.masterDataService.getAllEquipment();
      res.json(equip);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  createEquipment = async (req: Request, res: Response) => {
    try {
      const equip = await this.masterDataService.createEquipment(req.body);
      res.status(201).json(equip);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  updateEquipment = async (req: Request, res: Response) => {
    try {
      const equip = await this.masterDataService.updateEquipment(Number(req.params.id), req.body);
      res.json(equip);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  deleteEquipment = async (req: Request, res: Response) => {
    try {
      await this.masterDataService.deleteEquipment(Number(req.params.id));
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };
}
