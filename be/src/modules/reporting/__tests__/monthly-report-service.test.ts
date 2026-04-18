import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMonthlyReportSnapshot, closeMonthlyReport, getMonthlyReportSnapshot, replayMonthlyReport } from '../application/queries/monthly-report.js';

const mockPrisma = {
  inventoryMovement: { findMany: vi.fn() },
  monthlyReportSnapshot: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
};

vi.mock('../../../config/db.js', () => ({ default: mockPrisma }));
vi.mock('../../shared/transactions.js', () => ({ withTransaction: async (operation: any) => operation(mockPrisma) }));

describe('monthly-report-service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('derives monthly totals from canonical movement history', async () => {
    mockPrisma.inventoryMovement.findMany.mockResolvedValue([
      { id: 'm1', productId: 'p1', movementType: 'INBOUND', quantity: 100, fromLocationId: null, toLocationId: 'loc-a', createdAt: new Date('2026-03-31T12:00:00Z'), product: { id: 'p1', sku: 'SKU-1', name: 'Alpha', category: 'Widgets' } },
      { id: 'm2', productId: 'p1', movementType: 'OUTBOUND', quantity: 30, fromLocationId: 'loc-a', toLocationId: null, createdAt: new Date('2026-04-04T12:00:00Z'), product: { id: 'p1', sku: 'SKU-1', name: 'Alpha', category: 'Widgets' } },
      { id: 'm3', productId: 'p1', movementType: 'ADJUSTMENT', quantity: -5, fromLocationId: null, toLocationId: 'loc-a', createdAt: new Date('2026-04-10T12:00:00Z'), product: { id: 'p1', sku: 'SKU-1', name: 'Alpha', category: 'Widgets' } },
    ]);

    const snapshot = await buildMonthlyReportSnapshot(mockPrisma as never, { month: '2026-04', warehouseLocationId: 'loc-a', category: 'Widgets' });

    expect(snapshot.payload.summary.openingStock).toBe(100);
    expect(snapshot.payload.summary.outbound).toBe(30);
    expect(snapshot.payload.summary.adjustment).toBe(-5);
    expect(snapshot.payload.summary.endingStock).toBe(65);
    expect(snapshot.payload.reconciliation.balanced).toBe(true);
  });

  it('persists and replays the same closed snapshot', async () => {
    mockPrisma.monthlyReportSnapshot.findUnique.mockResolvedValue({ reportKey: '2026-04|*|*|*', payload: { reportType: 'MONTHLY_INVENTORY' } });
    const existing = await getMonthlyReportSnapshot({ month: '2026-04' });
    expect(existing?.reportKey).toBe('2026-04|*|*|*');

    mockPrisma.monthlyReportSnapshot.findUnique.mockResolvedValue(null);
    mockPrisma.inventoryMovement.findMany.mockResolvedValue([]);
    mockPrisma.monthlyReportSnapshot.create.mockResolvedValue({ reportKey: '2026-04|*|*|*' });
    mockPrisma.monthlyReportSnapshot.upsert.mockResolvedValue({ reportKey: '2026-04|*|*|*' });

    await closeMonthlyReport({ month: '2026-04' }, 'user-1');
    await replayMonthlyReport({ month: '2026-04' }, 'user-1');

    expect(mockPrisma.monthlyReportSnapshot.create).toHaveBeenCalled();
    expect(mockPrisma.monthlyReportSnapshot.upsert).toHaveBeenCalled();
  });
});
