import { publishEventWithTx } from '../../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../../domain/events/inventory.events.js';
import { recordTransferOutMovement as recordTransferOutMovementService, type Tx } from './index.js';

export async function recordTransferOutMovement(tx: Tx, input: Parameters<typeof recordTransferOutMovementService>[1]) {
  const movement = await recordTransferOutMovementService(tx, input);
  await publishEventWithTx(tx, InventoryEvents.MovementRecorded, 'InventoryMovement', input.referenceId, { movementType: 'TRANSFER_OUT', productId: input.productId, quantity: input.quantity }, input.createdById);
  return movement;
}
