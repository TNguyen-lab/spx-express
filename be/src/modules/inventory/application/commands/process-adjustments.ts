import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../domain/events/inventory.events.js';
import { processAdjustments as processAdjustmentsService, type ProcessAdjustmentsInput } from '../queries/inventory-queries.js';

export type { ProcessAdjustmentsInput };

export async function processAdjustments(input: ProcessAdjustmentsInput) {
  const result = await processAdjustmentsService(input);
  await publishEvent(InventoryEvents.AdjustmentProcessed, 'InventoryCheck', input.checkId, {
    adjustedItems: result.adjustedItems,
  }, input.userId);
  return result;
}
