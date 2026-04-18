import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { InventoryEvents } from '../../domain/events/inventory.events.js';
import { createCountSession as createCountSessionService, type CreateCountSessionInput } from '../queries/inventory-queries.js';

export type { CreateCountSessionInput };

export async function createCountSession(input: CreateCountSessionInput) {
  const check = await createCountSessionService(input);
  await publishEvent(InventoryEvents.CountSessionCreated, 'InventoryCheck', check.id, {
    checkNumber: check.checkNumber,
    productCount: check.items.length,
    scope: input.scope?.productIds ? `${input.scope.productIds.length} products` : 'all products',
  }, input.checkerId);
  return check;
}
