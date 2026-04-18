import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../domain/events/inventory.events.js';
import { submitBlindCount as submitBlindCountService, type SubmitCountInput } from '../queries/inventory-queries.js';

export type { SubmitCountInput };

export async function submitBlindCount(checkId: string, userId: string, input: SubmitCountInput) {
  const item = await submitBlindCountService(checkId, userId, input);
  await publishEvent(InventoryEvents.CountSubmitted, 'InventoryCheck', checkId, {
    itemId: item.id,
    productId: item.productId,
    actualQty: item.countedQty,
    discrepancy: item.discrepancy,
  }, userId);
  return item;
}
