import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { InventoryCheckEvents } from '../../domain/events/inventory-check.events.js';
import { initiateRecount as initiateRecountService } from '../queries/inventory-queries.js';

export async function initiateRecount(checkId: string, itemIds: string[], notes?: string) {
  const result = await initiateRecountService(checkId, itemIds, notes);
  await publishEvent(InventoryCheckEvents.RecountRequested, 'InventoryCheck', checkId, { itemCount: itemIds.length }, undefined);
  return result;
}
