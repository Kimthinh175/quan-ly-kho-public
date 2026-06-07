import { Router } from 'express';
import { InboundController } from './inbound.controller';

const inboundModule = Router();
const controller = new InboundController();

inboundModule.post('/receipts', controller.createReceipt);
inboundModule.get('/receipts', controller.getReceipts);

inboundModule.post('/palletize', controller.palletize);
inboundModule.get('/lpns', controller.getLPNs);

inboundModule.post('/tasks/generate', controller.generateTask);
inboundModule.get('/tasks', controller.getWorkTasks);
inboundModule.post('/tasks/confirm', controller.confirmPutaway);
inboundModule.post('/tasks/reassign', controller.reassignTask);
inboundModule.post('/loose-receipt', controller.looseReceipt);

export { inboundModule };
