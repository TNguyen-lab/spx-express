import { PackingStatus } from '../../../../constants/canonical-status.js';

export function validatePackingTransition(currentStatus: string, targetStatus: string): boolean {
  const transitions: Record<string, string[]> = {
    [PackingStatus.PENDING]: [PackingStatus.PACKING, PackingStatus.CANCELLED],
    [PackingStatus.PACKING]: [PackingStatus.PACKED, PackingStatus.CANCELLED],
    [PackingStatus.PACKED]: [PackingStatus.SEALED, PackingStatus.CANCELLED],
    [PackingStatus.SEALED]: [PackingStatus.ON_CONVEYOR, PackingStatus.CANCELLED],
    [PackingStatus.ON_CONVEYOR]: [PackingStatus.CANCELLED],
    [PackingStatus.CANCELLED]: [],
  };

  return transitions[currentStatus]?.includes(targetStatus) ?? false;
}
