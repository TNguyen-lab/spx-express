export const TransferEvents = {
  Requested: 'TRANSFER_REQUESTED',
  Approved: 'TRANSFER_APPROVED',
  Dispatched: 'TRANSFER_DISPATCHED',
  Received: 'TRANSFER_RECEIVED',
  Exception: 'TRANSFER_EXCEPTION',
  Cancelled: 'TRANSFER_CANCELLED',
} as const;

export type TransferEventName = typeof TransferEvents[keyof typeof TransferEvents];
