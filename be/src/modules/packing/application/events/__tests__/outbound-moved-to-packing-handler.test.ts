import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  packing: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../../../config/db.js', () => ({
  default: mockPrisma,
}));

describe('handleOutboundMovedToPackingEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a packing record when none exists', async () => {
    mockPrisma.packing.findUnique.mockResolvedValue(null);
    mockPrisma.packing.create.mockResolvedValue({
      id: 'pack-1',
      packingNumber: 'PK202600001',
      outboundId: 'out-1',
      packerId: 'user-1',
      status: 'PENDING',
    });

    const { handleOutboundMovedToPackingEvent } = await import('../outbound-moved-to-packing-handler.js');

    const result = await handleOutboundMovedToPackingEvent({
      outboundId: 'out-1',
      outboundNumber: 'OUT202600001',
      packingNumber: 'PK202600001',
      userId: 'user-1',
      tx: mockPrisma as never,
    });

    expect(mockPrisma.packing.create).toHaveBeenCalledWith({
      data: {
        packingNumber: 'PK202600001',
        outboundId: 'out-1',
        packerId: 'user-1',
        status: 'PENDING',
      },
    });
    expect(result.id).toBe('pack-1');
  });
});
