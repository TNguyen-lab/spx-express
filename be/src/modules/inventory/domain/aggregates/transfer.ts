export type TransferStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXCEPTION';

export function validateTransferTransition(currentStatus: TransferStatus, targetStatus: TransferStatus): boolean {
  const transitions: Record<TransferStatus, TransferStatus[]> = {
    PENDING: ['APPROVED', 'CANCELLED'],
    APPROVED: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['IN_TRANSIT', 'EXCEPTION'],
    IN_TRANSIT: ['RECEIVED', 'EXCEPTION'],
    RECEIVED: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
    EXCEPTION: ['RECEIVED', 'CANCELLED'],
  };

  return transitions[currentStatus]?.includes(targetStatus) ?? false;
}
