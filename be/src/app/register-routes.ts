import { Application } from 'express';

// Shared routes
import authRoutes from '../shared/http/auth.routes.js';
import systemRoutes from '../shared/http/system.routes.js';

// Module routes (new structure)
import { productRoutes } from '../modules/product/index.js';
import { supplierRoutes } from '../modules/supplier/index.js';
import { locationRoutes } from '../modules/location/index.js';
import { reportingRoutes } from '../modules/reporting/index.js';
import { analyticsRoutes } from '../modules/analytics/index.js';

// Module routes (to be migrated)
import { purchaseOrderRoutes } from '../modules/purchase-order/index.js';
import { inboundRoutes } from '../modules/inbound/index.js';
import { outboundRoutes } from '../modules/outbound/index.js';
import { inventoryRoutes } from '../modules/inventory/index.js';
import { packingRoutes } from '../modules/packing/index.js';
import { sortingRoutes } from '../modules/sorting/index.js';
import { shippingRoutes } from '../modules/shipping/index.js';
import { inventoryCheckRoutes, transferRoutes } from '../modules/inventory/index.js';

export function registerRoutes(app: Application): void {
  // System and auth routes
  app.use(systemRoutes);
  app.use(authRoutes);

  // Domain module routes
  app.use(purchaseOrderRoutes);
  app.use(inboundRoutes);
  app.use(outboundRoutes);
  app.use(productRoutes);
  app.use(supplierRoutes);
  app.use(locationRoutes);
  app.use(inventoryRoutes);
  app.use(inventoryCheckRoutes);
  app.use(transferRoutes);
  app.use(reportingRoutes);
  app.use(analyticsRoutes);
  app.use(packingRoutes);
  app.use(sortingRoutes);
  app.use(shippingRoutes);
}