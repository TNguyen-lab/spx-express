export type SortingStatusValue = 'PENDING' | 'SORTING' | 'SORTED' | 'COMPLETED';

export interface SortingAggregate {
  id: string;
  sortingNumber: string;
  packingId: string;
  sorterId: string;
  status: SortingStatusValue;
  sortedDate?: Date | null;
  completedDate?: Date | null;
  notes?: string | null;
}

export function canTransitionSorting(currentStatus: SortingStatusValue, nextStatus: SortingStatusValue): boolean {
  const transitions: Record<SortingStatusValue, SortingStatusValue[]> = {
    PENDING: ['SORTING'],
    SORTING: ['SORTED', 'COMPLETED'],
    SORTED: ['COMPLETED'],
    COMPLETED: [],
  };

  return transitions[currentStatus].includes(nextStatus);
}
