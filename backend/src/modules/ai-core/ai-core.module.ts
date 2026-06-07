import { Router } from 'express';
import { AiCoreController } from './ai-core.controller';

const aiCoreModule = Router();
const controller = new AiCoreController();

aiCoreModule.post('/evaluate-layout', controller.evaluateLayout);
// aiCoreModule.post('/smart-putaway', controller.smartPutaway);
aiCoreModule.post('/generate-layout', controller.generateLayout);
aiCoreModule.post('/apply-layout', controller.applyLayout);
aiCoreModule.post('/relocate-buffer', controller.relocateBuffer);
aiCoreModule.post('/mcdm-simulate', controller.simulateMcdm);
aiCoreModule.post('/group-tasks', controller.groupTasks);

export { aiCoreModule };
