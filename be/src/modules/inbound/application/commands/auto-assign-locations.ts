import { withTransaction } from '../../../../modules/shared/transactions.js';
import { publishEventWithTx } from '../../../../shared/events/application-event-publisher.js';
import { InboundEvents } from '../../domain/events/inbound.events.js';
import { validateTransition, type InboundRole } from '../../domain/aggregates/inbound-policy.js';
import { InboundStatus } from '../../../../constants/canonical-status.js';
import { getInboundOrThrow } from './_helpers.js';

export async function autoAssignLocations(id: string, role: InboundRole, userId: string) {
  return withTransaction(async (tx) => {
    const inbound = await getInboundOrThrow(id, tx);
    validateTransition(inbound.status as never, InboundStatus.LOCATION_ASSIGNED as never, role);

    const locations = await tx.warehouseLocation.findMany({ where: { isActive: true }, orderBy: [{ zone: 'asc' }, { row: 'asc' }, { shelf: 'asc' }] });
    if (locations.length === 0) throw new Error('Không có vị trí kho khả dụng. No warehouse locations available. Please create locations first.');

    const itemsWithoutLocation = inbound.items.filter((item) => !item.locationId);
    if (itemsWithoutLocation.length === 0) throw new Error('Tất cả kiện hàng đã được gán vị trí. All items already have locations assigned.');

    const locationUsage = await tx.inboundItem.groupBy({ by: ['locationId'], where: { locationId: { not: null } }, _count: { locationId: true } });
    const usageMap = new Map<string, number>();
    for (const entry of locationUsage) if (entry.locationId) usageMap.set(entry.locationId, entry._count.locationId);

    const sortedLocations = [...locations].sort((a, b) => (usageMap.get(a.id) ?? 0) - (usageMap.get(b.id) ?? 0));
    let locationIndex = 0;
    for (const item of itemsWithoutLocation) {
      const location = sortedLocations[locationIndex % sortedLocations.length];
      await tx.inboundItem.update({ where: { id: item.id }, data: { locationId: location.id } });
      locationIndex++;
    }

    const updated = await tx.inbound.update({ where: { id }, data: { status: 'LOCATION_ASSIGNED' }, include: { purchaseOrder: { include: { supplier: true } }, items: { include: { product: true, location: true } } } });
    await publishEventWithTx(tx, InboundEvents.LocationAssigned, 'Inbound', inbound.id, { inboundNumber: inbound.inboundNumber, autoAssigned: true, itemCount: itemsWithoutLocation.length }, userId);
    return updated;
  });
}
