import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { InventoryCheckEvents } from '../../domain/events/inventory-check.events.js';
import { completeCheck as completeCheckService } from '../queries/inventory-queries.js';

export async function completeCheck(checkId: string, userId: string, notes?: string) {
  const result = await completeCheckService(checkId, notes);
  await publishEvent(InventoryCheckEvents.Completed, 'InventoryCheck', checkId, {
    checkNumber: result.checkNumber,
    totalDiscrepancy: result.totalDiscrepancy,
    itemsChecked: result.itemsChecked,
  }, userId);
  return result;
}
