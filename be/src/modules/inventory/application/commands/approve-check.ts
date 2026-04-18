import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { InventoryCheckEvents } from '../../domain/events/inventory-check.events.js';
import { approveCheck as approveCheckService } from '../queries/inventory-queries.js';

export async function approveCheck(checkId: string, approverId: string, approved: boolean, notes?: string) {
  const result = await approveCheckService(checkId, approverId, approved, notes);
  if (result.approved) {
    await publishEvent(InventoryCheckEvents.Approved, 'InventoryCheck', checkId, { approverId }, approverId);
  }
  return result;
}
