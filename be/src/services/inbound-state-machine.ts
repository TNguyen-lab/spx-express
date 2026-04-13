import {
  InboundStatus,
  type InboundStatus as InboundWorkflowStatus,
} from '../constants/workflow-status';

export type InboundRole =
  | 'ADMIN'
  | 'QUALITY'
  | 'ACCOUNTING'
  | 'WAREHOUSE_DIRECTOR'
  | 'STAFF'
  | 'DRIVER';

type TransitionMap = Record<
  InboundWorkflowStatus,
  Partial<Record<InboundWorkflowStatus, InboundRole[]>>
>;

const TERMINAL_STATUSES: InboundWorkflowStatus[] = [
  InboundStatus.INBOUND_COMPLETED,
  InboundStatus.INBOUND_CANCELLED,
];

const transitions: TransitionMap = {
  [InboundStatus.INBOUND_CREATED]: {
    [InboundStatus.ITEMS_RECEIVED]: ['STAFF', 'ADMIN'],
    [InboundStatus.INBOUND_CANCELLED]: ['QUALITY', 'ADMIN'],
  },
  [InboundStatus.ITEMS_RECEIVED]: {
    [InboundStatus.QUALITY_CHECKING]: ['QUALITY', 'ADMIN'],
  },
  [InboundStatus.QUALITY_CHECKING]: {
    [InboundStatus.QC_PASSED]: ['QUALITY', 'ADMIN'],
    [InboundStatus.QC_FAILED]: ['QUALITY', 'ADMIN'],
  },
  [InboundStatus.QC_PASSED]: {
    [InboundStatus.BARCODE_CREATED]: ['STAFF', 'ADMIN'],
  },
  [InboundStatus.QC_FAILED]: {
    [InboundStatus.INBOUND_CANCELLED]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
    [InboundStatus.QUALITY_CHECKING]: ['QUALITY', 'ADMIN'],
  },
  [InboundStatus.BARCODE_CREATED]: {
    [InboundStatus.LOCATION_ASSIGNED]: ['STAFF', 'ADMIN'],
  },
  [InboundStatus.LOCATION_ASSIGNED]: {
    [InboundStatus.STAFF_RECEIVED]: ['STAFF', 'ADMIN'],
  },
  [InboundStatus.STAFF_RECEIVED]: {
    [InboundStatus.INBOUND_COMPLETED]: ['STAFF', 'ADMIN'],
    [InboundStatus.NEW_PRODUCT_CREATED]: ['STAFF', 'ADMIN'],
  },
  [InboundStatus.NEW_PRODUCT_CREATED]: {
    [InboundStatus.INVENTORY_UPDATED]: ['STAFF', 'ADMIN'],
  },
  [InboundStatus.INVENTORY_UPDATED]: {
    [InboundStatus.INBOUND_COMPLETED]: ['STAFF', 'ADMIN'],
  },
  [InboundStatus.INBOUND_COMPLETED]: {},
  [InboundStatus.INBOUND_CANCELLED]: {},
};

export function isTerminalStatus(status: InboundWorkflowStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getValidTransitions(
  currentStatus: InboundWorkflowStatus
): InboundWorkflowStatus[] {
  return Object.keys(transitions[currentStatus]) as InboundWorkflowStatus[];
}

export function getRequiredRoles(
  currentStatus: InboundWorkflowStatus,
  nextStatus: InboundWorkflowStatus
): InboundRole[] {
  return transitions[currentStatus][nextStatus] ?? [];
}

export function canTransition(
  currentStatus: InboundWorkflowStatus,
  nextStatus: InboundWorkflowStatus,
  role: string
): boolean {
  const allowedRoles = getRequiredRoles(currentStatus, nextStatus);
  if (allowedRoles.length === 0) {
    return false;
  }
  return allowedRoles.includes(role as InboundRole);
}

export function validateTransition(
  currentStatus: InboundWorkflowStatus,
  nextStatus: InboundWorkflowStatus,
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