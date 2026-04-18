export type InventoryCheckStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export function canCompleteInventoryCheck(status: InventoryCheckStatus) {
  return status === 'PENDING' || status === 'IN_PROGRESS';
}
