import {
  PurchaseOrderStatus,
  type PurchaseOrderStatus as PurchaseOrderWorkflowStatus,
} from '../constants/workflow-status';

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
  PurchaseOrderStatus.ORDER_COMPLETED,
  PurchaseOrderStatus.ORDER_CANCELLED,
  PurchaseOrderStatus.SUPPLIER_REJECTED,
];

const transitions: TransitionMap = {
  [PurchaseOrderStatus.PURCHASE_PLAN_CREATED]: {
    [PurchaseOrderStatus.PLAN_CONFIRMED_BY_ACCOUNTING]: ['QUALITY', 'ADMIN'],
    [PurchaseOrderStatus.ORDER_CANCELLED]: ['QUALITY', 'ADMIN'],
  },
  [PurchaseOrderStatus.PLAN_CONFIRMED_BY_ACCOUNTING]: {
    [PurchaseOrderStatus.PLAN_SENT_TO_DIRECTOR]: ['ACCOUNTING', 'ADMIN'],
    [PurchaseOrderStatus.ORDER_CANCELLED]: ['QUALITY', 'ADMIN'],
  },
  [PurchaseOrderStatus.PLAN_SENT_TO_DIRECTOR]: {
    [PurchaseOrderStatus.PLAN_APPROVED]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
    [PurchaseOrderStatus.ORDER_CANCELLED]: ['QUALITY', 'WAREHOUSE_DIRECTOR', 'ADMIN'],
  },
  [PurchaseOrderStatus.PLAN_APPROVED]: {
    [PurchaseOrderStatus.ORDER_SENT_TO_SUPPLIER]: ['ADMIN', 'WAREHOUSE_DIRECTOR', 'ACCOUNTING'],
  },
  [PurchaseOrderStatus.ORDER_SENT_TO_SUPPLIER]: {
    [PurchaseOrderStatus.SUPPLIER_CONFIRMED]: ['ADMIN'],
    [PurchaseOrderStatus.SUPPLIER_REJECTED]: ['ADMIN'],
    [PurchaseOrderStatus.ORDER_CANCELLED]: ['ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'ADMIN'],
  },
  [PurchaseOrderStatus.SUPPLIER_CONFIRMED]: {
    [PurchaseOrderStatus.ORDER_COMPLETED]: ['ADMIN', 'ACCOUNTING'],
  },
  [PurchaseOrderStatus.SUPPLIER_REJECTED]: {},
  [PurchaseOrderStatus.ORDER_CANCELLED]: {},
  [PurchaseOrderStatus.ORDER_COMPLETED]: {},
};

export function isTerminalStatus(status: PurchaseOrderWorkflowStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getValidTransitions(
  currentStatus: PurchaseOrderWorkflowStatus
): PurchaseOrderWorkflowStatus[] {
  return Object.keys(transitions[currentStatus]) as PurchaseOrderWorkflowStatus[];
}

export function getRequiredRoles(
  currentStatus: PurchaseOrderWorkflowStatus,
  nextStatus: PurchaseOrderWorkflowStatus
): PurchaseOrderRole[] {
  return transitions[currentStatus][nextStatus] ?? [];
}

export function canTransition(
  currentStatus: PurchaseOrderWorkflowStatus,
  nextStatus: PurchaseOrderWorkflowStatus,
  role: string
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
  role: string
): void {
  const validTransitions = getValidTransitions(currentStatus);
  if (!validTransitions.includes(nextStatus)) {
    throw new Error(
      `Invalid transition from ${currentStatus} to ${nextStatus}`
    );
  }

  if (!canTransition(currentStatus, nextStatus, role)) {
    throw new Error(
      `Role ${role} is not allowed to transition from ${currentStatus} to ${nextStatus}`
    );
  }
}
