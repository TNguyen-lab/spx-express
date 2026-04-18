import {
  PurchaseOrderStatus,
  type PurchaseOrderStatus as PurchaseOrderWorkflowStatus,
} from '../../../../constants/canonical-status.js';

export type PurchaseOrderRole =
  | 'ADMIN'
  | 'QUALITY'
  | 'ACCOUNTING'
  | 'WAREHOUSE_DIRECTOR'
  | 'STAFF'
  | 'DRIVER';

type TransitionMap = Record<
  PurchaseOrderWorkflowStatus,
  Partial<Record<PurchaseOrderWorkflowStatus, PurchaseOrderRole[]>>
>;

const TERMINAL_STATUSES: PurchaseOrderWorkflowStatus[] = [
  PurchaseOrderStatus.COMPLETED,
  PurchaseOrderStatus.CANCELLED,
];

const transitions: TransitionMap = {
  [PurchaseOrderStatus.DRAFT]: {
    [PurchaseOrderStatus.PENDING_ACCOUNTING]: ['QUALITY', 'ADMIN'],
    [PurchaseOrderStatus.CANCELLED]: ['QUALITY', 'ADMIN'],
  },
  [PurchaseOrderStatus.PENDING_ACCOUNTING]: {
    [PurchaseOrderStatus.PENDING_APPROVAL]: ['ACCOUNTING', 'ADMIN'],
    [PurchaseOrderStatus.CANCELLED]: ['ACCOUNTING', 'ADMIN'],
  },
  [PurchaseOrderStatus.PENDING_APPROVAL]: {
    [PurchaseOrderStatus.APPROVED]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
    [PurchaseOrderStatus.CANCELLED]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
  },
  [PurchaseOrderStatus.APPROVED]: {
    [PurchaseOrderStatus.SENT_TO_SUPPLIER]: ['ADMIN', 'WAREHOUSE_DIRECTOR', 'ACCOUNTING'],
  },
  [PurchaseOrderStatus.SENT_TO_SUPPLIER]: {
    [PurchaseOrderStatus.SUPPLIER_CONFIRMED]: ['ADMIN'],
    [PurchaseOrderStatus.SUPPLIER_REJECTED]: ['ADMIN'],
    [PurchaseOrderStatus.CANCELLED]: ['ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'ADMIN'],
  },
  [PurchaseOrderStatus.SUPPLIER_CONFIRMED]: {
    [PurchaseOrderStatus.COMPLETED]: ['ACCOUNTING', 'ADMIN'],
  },
  [PurchaseOrderStatus.SUPPLIER_REJECTED]: {
    [PurchaseOrderStatus.CANCELLED]: ['ACCOUNTING', 'ADMIN'],
  },
  [PurchaseOrderStatus.CANCELLED]: {},
  [PurchaseOrderStatus.COMPLETED]: {},
};

export function isTerminalStatus(status: PurchaseOrderWorkflowStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getValidTransitions(
  currentStatus: PurchaseOrderWorkflowStatus,
): PurchaseOrderWorkflowStatus[] {
  return Object.keys(transitions[currentStatus]) as PurchaseOrderWorkflowStatus[];
}

export function getRequiredRoles(
  currentStatus: PurchaseOrderWorkflowStatus,
  nextStatus: PurchaseOrderWorkflowStatus,
): PurchaseOrderRole[] {
  return transitions[currentStatus][nextStatus] ?? [];
}

export function canTransition(
  currentStatus: PurchaseOrderWorkflowStatus,
  nextStatus: PurchaseOrderWorkflowStatus,
  role: string,
): boolean {
  const allowedRoles = getRequiredRoles(currentStatus, nextStatus);
  if (allowedRoles.length === 0) {
    return false;
  }
  return allowedRoles.includes(role as PurchaseOrderRole);
}

export function validateTransition(
  currentStatus: PurchaseOrderWorkflowStatus,
  nextStatus: PurchaseOrderWorkflowStatus,
  role: string,
): void {
  const validTransitions = getValidTransitions(currentStatus);
  if (!validTransitions.includes(nextStatus)) {
    throw new Error(`Invalid transition from ${currentStatus} to ${nextStatus}`);
  }

  if (!canTransition(currentStatus, nextStatus, role)) {
    throw new Error(`Role ${role} is not allowed to transition from ${currentStatus} to ${nextStatus}`);
  }
}
