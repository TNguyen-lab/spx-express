import {
  OutboundStatus,
  type OutboundStatus as OutboundWorkflowStatus,
} from '../constants/workflow-status';

export type OutboundRole =
  | 'ADMIN'
  | 'QUALITY'
  | 'ACCOUNTING'
  | 'WAREHOUSE_DIRECTOR'
  | 'STAFF'
  | 'DRIVER';

type TransitionMap = Record<
  OutboundWorkflowStatus,
  Partial<Record<OutboundWorkflowStatus, OutboundRole[]>>
>;

const TERMINAL_STATUSES: OutboundWorkflowStatus[] = [
  OutboundStatus.MOVED_TO_PACKING,
];

const transitions: TransitionMap = {
  [OutboundStatus.ORDER_RECEIVED]: {
    [OutboundStatus.INVENTORY_CHECKED]: ['STAFF', 'ADMIN'],
  },
  [OutboundStatus.INVENTORY_CHECKED]: {
    [OutboundStatus.INVENTORY_SUFFICIENT]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
    [OutboundStatus.INVENTORY_INSUFFICIENT]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
  },
  [OutboundStatus.INVENTORY_SUFFICIENT]: {
    [OutboundStatus.PICKING_ASSIGNED]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
  },
  [OutboundStatus.INVENTORY_INSUFFICIENT]: {
    [OutboundStatus.INVENTORY_CHECKED]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
  },
  [OutboundStatus.PICKING_ASSIGNED]: {
    [OutboundStatus.PICKER_ASSIGNED]: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
  },
  [OutboundStatus.PICKER_ASSIGNED]: {
    [OutboundStatus.ITEM_SCANNED]: ['STAFF', 'ADMIN'],
  },
  [OutboundStatus.ITEM_SCANNED]: {
    [OutboundStatus.PICKED_CORRECT]: ['STAFF', 'ADMIN'],
    [OutboundStatus.PICKED_WRONG]: ['STAFF', 'ADMIN'],
  },
  [OutboundStatus.PICKED_CORRECT]: {
    [OutboundStatus.PUT_IN_CART]: ['STAFF', 'ADMIN'],
  },
  [OutboundStatus.PICKED_WRONG]: {
    [OutboundStatus.ITEM_SCANNED]: ['STAFF', 'ADMIN'],
  },
  [OutboundStatus.PUT_IN_CART]: {
    [OutboundStatus.SLIP_PRINTED]: ['STAFF', 'ADMIN'],
  },
  [OutboundStatus.SLIP_PRINTED]: {
    [OutboundStatus.MOVED_TO_PACKING]: ['STAFF', 'ADMIN'],
  },
  [OutboundStatus.MOVED_TO_PACKING]: {},
};

export function isTerminalStatus(status: OutboundWorkflowStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getValidTransitions(
  currentStatus: OutboundWorkflowStatus
): OutboundWorkflowStatus[] {
  return Object.keys(transitions[currentStatus]) as OutboundWorkflowStatus[];
}

export function getRequiredRoles(
  currentStatus: OutboundWorkflowStatus,
  nextStatus: OutboundWorkflowStatus
): OutboundRole[] {
  return transitions[currentStatus][nextStatus] ?? [];
}

export function canTransition(
  currentStatus: OutboundWorkflowStatus,
  nextStatus: OutboundWorkflowStatus,
  role: string
): boolean {
  const allowedRoles = getRequiredRoles(currentStatus, nextStatus);
  if (allowedRoles.length === 0) {
    return false;
  }
  return allowedRoles.includes(role as OutboundRole);
}

export function validateTransition(
  currentStatus: OutboundWorkflowStatus,
  nextStatus: OutboundWorkflowStatus,
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