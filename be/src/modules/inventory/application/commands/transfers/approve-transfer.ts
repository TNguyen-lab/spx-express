import { publishEvent } from '../../../../../shared/events/application-event-publisher.js';
import { TransferEvents } from '../../../domain/events/transfer.events.js';
import { approveTransfer as approveTransferService, type ApproveTransferInput } from './index.js';

export type { ApproveTransferInput };

export async function approveTransfer(tx: Parameters<typeof approveTransferService>[0], input: ApproveTransferInput) {
  const transfer = await approveTransferService(tx, input);
  await publishEvent(TransferEvents.Approved, 'Transfer', transfer.id, { transferNumber: transfer.transferNumber, itemCount: transfer.items.length }, input.approvedById);
  return transfer;
}
