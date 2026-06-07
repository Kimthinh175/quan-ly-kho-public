import { Router } from 'express';
import multer from 'multer';
import { MasterDataController } from './master-data.controller';

const masterDataModule = Router();
const controller = new MasterDataController();
const upload = multer({ storage: multer.memoryStorage() });

masterDataModule.get('/categories', controller.getCategories);
masterDataModule.post('/categories', controller.createCategory);
masterDataModule.put('/categories/:id', controller.updateCategory);

masterDataModule.post('/products', controller.createProduct);
masterDataModule.get('/products', controller.getProducts);
masterDataModule.put('/products/:id', controller.updateProduct);

masterDataModule.get('/inventory/details', controller.getInventoryDetails);

masterDataModule.post('/locations', controller.createLocation);
masterDataModule.get('/locations', controller.getLocations);
masterDataModule.put('/locations/:id', controller.updateLocation);
masterDataModule.post('/locations/import', upload.single('file'), controller.importExcel);

masterDataModule.get('/equipment', controller.getEquipments);
masterDataModule.post('/equipment', controller.createEquipment);
masterDataModule.put('/equipment/:id', controller.updateEquipment);
masterDataModule.delete('/equipment/:id', controller.deleteEquipment);

export { masterDataModule };
