import { publishEventWithTx } from '../../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../../domain/events/inventory.events.js';
import { recordInboundMovement as recordInboundMovementService, type Tx } from './index.js';

export async function recordInboundMovement(tx: Tx, input: Parameters<typeof recordInboundMovementService>[1]) {
  const movement = await recordInboundMovementService(tx, input);
  await publishEventWithTx(tx, InventoryEvents.MovementRecorded, 'InventoryMovement', input.referenceId, { movementType: 'INBOUND', productId: input.productId, quantity: input.quantity }, input.createdById);
  return movement;
}
