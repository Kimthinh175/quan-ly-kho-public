import { Router } from 'express';
import { masterDataModule } from './master-data/master-data.module';
import { aiCoreModule } from './ai-core/ai-core.module';
import { inboundModule } from './inbound/inbound.module';

import outboundModule from './outbound/outbound.module';

const appModule = Router();

// Gắn các module con vào đường dẫn tương ứng
appModule.use('/master-data', masterDataModule);
appModule.use('/ai', aiCoreModule);
appModule.use('/inbound', inboundModule);
appModule.use('/outbound', outboundModule);
// appModule.use('/work-tasks', workTasksModule);

export default appModule;
