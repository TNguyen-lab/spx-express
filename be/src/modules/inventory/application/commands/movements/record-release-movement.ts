import { publishEventWithTx } from '../../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../../domain/events/inventory.events.js';
import { recordReleaseMovement as recordReleaseMovementService, type Tx } from './index.js';

export async function recordReleaseMovement(tx: Tx, input: Parameters<typeof recordReleaseMovementService>[1]) {
  const movement = await recordReleaseMovementService(tx, input);
  await publishEventWithTx(tx, InventoryEvents.MovementRecorded, 'InventoryMovement', input.referenceId, { movementType: 'RELEASE', productId: input.productId, quantity: input.quantity }, input.createdById);
  return movement;
}
