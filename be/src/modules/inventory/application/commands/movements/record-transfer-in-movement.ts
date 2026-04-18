import { publishEventWithTx } from '../../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../../domain/events/inventory.events.js';
import { recordTransferInMovement as recordTransferInMovementService, type Tx } from './index.js';

export async function recordTransferInMovement(tx: Tx, input: Parameters<typeof recordTransferInMovementService>[1]) {
  const movement = await recordTransferInMovementService(tx, input);
  await publishEventWithTx(tx, InventoryEvents.MovementRecorded, 'InventoryMovement', input.referenceId, { movementType: 'TRANSFER_IN', productId: input.productId, quantity: input.quantity }, input.createdById);
  return movement;
}
