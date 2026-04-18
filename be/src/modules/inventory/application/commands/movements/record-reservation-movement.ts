import { publishEventWithTx } from '../../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../../domain/events/inventory.events.js';
import { recordReservationMovement as recordReservationMovementService, type Tx } from './index.js';

export async function recordReservationMovement(tx: Tx, input: Parameters<typeof recordReservationMovementService>[1]) {
  const movement = await recordReservationMovementService(tx, input);
  await publishEventWithTx(tx, InventoryEvents.MovementRecorded, 'InventoryMovement', input.referenceId, { movementType: 'RESERVATION', productId: input.productId, quantity: input.quantity }, input.createdById);
  return movement;
}
