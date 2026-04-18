export const SortingEvents = {
  Received: 'SORTING_RECEIVED',
  Started: 'SORTING_STARTED',
  QcChecked: 'SORTING_QC_CHECKED',
  AssignedRoute: 'SORTING_ASSIGNED_ROUTE',
  AssignedZone: 'SORTING_ASSIGNED_ZONE',
  Classified: 'SORTING_CLASSIFIED',
  ExceptionHandled: 'SORTING_EXCEPTION_HANDLED',
  Completed: 'SORTING_COMPLETED',
} as const;

export type SortingEventName = typeof SortingEvents[keyof typeof SortingEvents];
