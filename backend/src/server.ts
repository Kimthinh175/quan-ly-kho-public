import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import appModule from './modules/app.module';
import inboundOutboundRoutes from './modules/inbound-outbound/routes';
import inventoryAlertsRoutes from './modules/inventory-alerts/routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Uncomment when real DB is ready
// connectDB();

app.get('/health', (req, res) => res.send('Backend is running!'));

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WMS AI Platform API',
      version: '1.0.0',
      description: 'API Documentation for WMS AI Platform',
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
  },
  apis: ['./src/modules/**/*.ts', './src/server.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Modules routing
app.use('/api', appModule);
app.use('/api/inbound', inboundOutboundRoutes);
app.use('/api/outbound', inboundOutboundRoutes);
app.use('/api/inventory', inventoryAlertsRoutes);


// Fix inbound/outbound prefixing:
// In the user req, the endpoints are:
// POST /inbound/receipts -> in routes.ts it's router.post('/inbound/receipts')
// So we should mount it at '/' or '/api'. Let's mount all at '/api'
// Wait, in my routes.ts I defined:
// router.post('/inbound/receipts')
// router.post('/products')
// router.get('/inventory')
// router.post('/predict-demand') // ai-core
// So let's mount them correctly based on how I wrote the routes:

app.use('/api', inboundOutboundRoutes); // /api/inbound/..., /api/outbound/...
app.use('/api', inventoryAlertsRoutes); // /api/inventory/...

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
