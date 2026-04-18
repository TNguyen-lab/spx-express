import { publishEventWithTx } from '../../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../../domain/events/inventory.events.js';
import { recordDispatchMovement as recordDispatchMovementService, type Tx } from './index.js';

export async function recordDispatchMovement(tx: Tx, input: Parameters<typeof recordDispatchMovementService>[1]) {
  const movement = await recordDispatchMovementService(tx, input);
  await publishEventWithTx(tx, InventoryEvents.MovementRecorded, 'InventoryMovement', input.referenceId, { movementType: 'OUTBOUND', productId: input.productId, quantity: input.quantity }, input.createdById);
  return movement;
}
