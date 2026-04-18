import { publishEvent } from '../../../../../shared/events/application-event-publisher.js';
import { TransferEvents } from '../../../domain/events/transfer.events.js';
import { dispatchTransfer as dispatchTransferService, type DispatchTransferInput } from './index.js';

export type { DispatchTransferInput };

export async function dispatchTransfer(tx: Parameters<typeof dispatchTransferService>[0], input: DispatchTransferInput) {
  const transfer = await dispatchTransferService(tx, input);
  await publishEvent(TransferEvents.Dispatched, 'Transfer', transfer.id, { transferNumber: transfer.transferNumber, itemCount: input.items.length }, input.staffId);
  return transfer;
}
