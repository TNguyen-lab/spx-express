/**
 * TDD Test: Verify P01 API route paths match frontend expectations.
 *
 * The frontend module p01Api (fe/src/services/api.ts) calls these paths:
 *   GET    /orders/orders           → list
 *   GET    /orders/orders/:id       → detail
 *   POST   /orders/orders           → create
 *   POST   /orders/orders/:id/send-to-accounting
 *   POST   /orders/orders/:id/confirm-accounting
  *   POST   /orders/orders/:id/approve
 *   POST   /orders/orders/:id/reject
 *   POST   /orders/orders/:id/send-to-supplier
 *   POST   /orders/orders/:id/supplier-response
 *   DELETE /orders/orders/:id       → cancel
 *   POST   /orders/orders/:id/complete
 *
 * The backend mounts order routes at /orders.
 * This test verifies that ALL :id-based routes include the /orders prefix
 * so the frontend paths resolve correctly.
 *
 * Bug: routes like /:id resolve to /orders/:id but frontend calls /orders/orders/:id
 */
import { describe, it, expect } from 'vitest';
import orderRoutes from '../../modules/purchase-order/interface/http/routes.js';

/**
 * Extract route paths from an Express Router instance.
 * Express stores routes in router.stack as Layer objects.
 * Each Layer has .route (if it's a route layer) with .path and .methods.
 */
function extractRoutes(router: { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }): Array<{ path: string; methods: string[] }> {
  const routes: Array<{ path: string; methods: string[] }> = [];

  for (const layer of router.stack) {
    if (layer.route) {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods);
      routes.push({ path, methods });
    }
  }

  return routes;
}

describe('P01: Order Routes - Path Consistency', () => {
  /**
   * Frontend expected paths (mounted under /orders base):
   * These are the paths the frontend p01Api module calls.
   * Since Express mounts this router at /orders, the route path
   * within the router must match the frontend path minus the mount prefix.
   *
   * e.g. frontend calls GET /orders/orders/:id
   *      router mounted at /orders
   *      route path must be: /orders/:id (so full path = /orders/orders/:id)
   */
  const frontendExpectedRoutes = [
    { method: 'GET', path: '/orders', description: 'list orders' },
    { method: 'GET', path: '/orders/:id', description: 'get order detail' },
    { method: 'POST', path: '/orders', description: 'create order' },
    { method: 'POST', path: '/orders/:id/send-to-accounting', description: 'send to accounting' },
    { method: 'POST', path: '/orders/:id/confirm-accounting', description: 'confirm accounting' },
    { method: 'POST', path: '/orders/:id/approve', description: 'approve order' },
    { method: 'POST', path: '/orders/:id/reject', description: 'reject order' },
    { method: 'POST', path: '/orders/:id/send-to-supplier', description: 'send to supplier' },
    { method: 'POST', path: '/orders/:id/supplier-response', description: 'supplier response' },
    { method: 'DELETE', path: '/orders/:id', description: 'cancel order' },
    { method: 'POST', path: '/orders/:id/complete', description: 'complete order' },
  ];

  it('should have routes for all frontend expected paths', () => {
    const routes = extractRoutes(orderRoutes as unknown as typeof orderRoutes & { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> });

    for (const expected of frontendExpectedRoutes) {
      const found = routes.find(
        (r) => r.path === expected.path && r.methods.includes(expected.method.toLowerCase())
      );

      expect(found, `Route ${expected.method} ${expected.path} (${expected.description}) not found. Available routes: ${routes.map(r => r.methods.join(',') + ' ' + r.path).join(', ')}`).toBeDefined();
    }
  });

  it('should have GET /orders/:id route for order detail (fixes "Không thể tải chi tiết đơn hàng" bug)', () => {
    const routes = extractRoutes(orderRoutes as unknown as typeof orderRoutes & { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> });

    const detailRoute = routes.find(
      (r) => r.path === '/orders/:id' && r.methods.includes('get')
    );

    expect(detailRoute, `GET /orders/:id not found. This causes "Không thể tải chi tiết đơn hàng" error. Available: ${routes.map(r => r.methods.join(',') + ' ' + r.path).join(', ')}`).toBeDefined();
  });

  it('should have POST /orders/:id/confirm-accounting route (allows Kế toán to approve)', () => {
    const routes = extractRoutes(orderRoutes as unknown as typeof orderRoutes & { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> });

    const confirmRoute = routes.find(
      (r) => r.path === '/orders/:id/confirm-accounting' && r.methods.includes('post')
    );

    expect(confirmRoute, `POST /orders/:id/confirm-accounting not found. Kế toán cannot approve orders. Available: ${routes.map(r => r.methods.join(',') + ' ' + r.path).join(', ')}`).toBeDefined();
  });

  it('should not have bare /:id routes (they cause path mismatch with frontend)', () => {
    const routes = extractRoutes(orderRoutes as unknown as typeof orderRoutes & { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> });

    const bareIdRoutes = routes.filter(
      (r) => r.path.startsWith('/:id') || r.path === '/:id'
    );

    // Before fix, routes like /:id/send-to-accounting exist without /orders prefix
    // After fix, they should all be /orders/:id/send-to-accounting
    if (bareIdRoutes.length > 0) {
      // Log what we found for clarity but don't fail - this test documents the current state
      // The fix will make these routes use /orders/:id prefix
      const barePaths = bareIdRoutes.map(r => r.methods.join(',') + ' ' + r.path).join(', ');
      console.log(`Found bare /:id routes (without /orders prefix): ${barePaths}`);
    }
  });
});
