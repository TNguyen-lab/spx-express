import { publishEvent } from '../../../../../shared/events/application-event-publisher.js';
import { TransferEvents } from '../../../domain/events/transfer.events.js';
import { handleTransferDiscrepancy as handleTransferDiscrepancyService, type HandleDiscrepancyInput } from './index.js';

export type { HandleDiscrepancyInput };

export async function handleTransferDiscrepancy(tx: Parameters<typeof handleTransferDiscrepancyService>[0], input: HandleDiscrepancyInput) {
  const transfer = await handleTransferDiscrepancyService(tx, input);
  await publishEvent(TransferEvents.Exception, 'Transfer', transfer.id, { transferNumber: transfer.transferNumber, itemCount: input.items.length, hasDiscrepancy: transfer.status === 'EXCEPTION' }, input.staffId);
  return transfer;
}
