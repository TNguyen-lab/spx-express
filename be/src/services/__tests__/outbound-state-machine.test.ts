import { describe, expect, it } from 'vitest';
import { OutboundStatus } from '../../constants/workflow-status';
import {
  canTransition,
  getRequiredRoles,
  getValidTransitions,
  isTerminalStatus,
  validateTransition,
} from '../../modules/outbound/domain/aggregates/outbound-policy.js';

// ============================================================================
// All P03 Outbound statuses
// ============================================================================
const ALL_STATUSES = [
  OutboundStatus.ORDER_RECEIVED,
  OutboundStatus.INVENTORY_CHECKED,
  OutboundStatus.INVENTORY_SUFFICIENT,
  OutboundStatus.INVENTORY_INSUFFICIENT,
  OutboundStatus.PICKING_ASSIGNED,
  OutboundStatus.PICKER_ASSIGNED,
  OutboundStatus.ITEM_SCANNED,
  OutboundStatus.PICKED_CORRECT,
  OutboundStatus.PICKED_WRONG,
  OutboundStatus.PUT_IN_CART,
  OutboundStatus.SLIP_PRINTED,
  OutboundStatus.MOVED_TO_PACKING,
] as const;

// ============================================================================
// Valid P03 transitions (from → [to statuses])
// ============================================================================
const VALID_TRANSITIONS: Record<string, string[]> = {
  [OutboundStatus.ORDER_RECEIVED]: [
    OutboundStatus.INVENTORY_CHECKED,
  ],
  [OutboundStatus.INVENTORY_CHECKED]: [
    OutboundStatus.INVENTORY_SUFFICIENT,
    OutboundStatus.INVENTORY_INSUFFICIENT,
  ],
  [OutboundStatus.INVENTORY_SUFFICIENT]: [
    OutboundStatus.PICKING_ASSIGNED,
  ],
  [OutboundStatus.INVENTORY_INSUFFICIENT]: [
    OutboundStatus.INVENTORY_CHECKED,
  ],
  [OutboundStatus.PICKING_ASSIGNED]: [
    OutboundStatus.PICKER_ASSIGNED,
  ],
  [OutboundStatus.PICKER_ASSIGNED]: [
    OutboundStatus.ITEM_SCANNED,
  ],
  [OutboundStatus.ITEM_SCANNED]: [
    OutboundStatus.PICKED_CORRECT,
    OutboundStatus.PICKED_WRONG,
  ],
  [OutboundStatus.PICKED_CORRECT]: [
    OutboundStatus.PUT_IN_CART,
  ],
  [OutboundStatus.PICKED_WRONG]: [
    OutboundStatus.ITEM_SCANNED,
  ],
  [OutboundStatus.PUT_IN_CART]: [
    OutboundStatus.SLIP_PRINTED,
  ],
  [OutboundStatus.SLIP_PRINTED]: [
    OutboundStatus.MOVED_TO_PACKING,
  ],
  [OutboundStatus.MOVED_TO_PACKING]: [],
};

// ============================================================================
// Outbound State Machine Tests
// ============================================================================
describe('outbound-state-machine', () => {
  // --------------------------------------------------------------------------
  // Valid transitions
  // --------------------------------------------------------------------------
  describe('valid transitions', () => {
    const transitionCases = [
      // ORDER_RECEIVED → INVENTORY_CHECKED (STAFF, ADMIN)
      { from: OutboundStatus.ORDER_RECEIVED, to: OutboundStatus.INVENTORY_CHECKED, role: 'STAFF' },
      // INVENTORY_CHECKED → INVENTORY_SUFFICIENT (WAREHOUSE_DIRECTOR, ADMIN)
      { from: OutboundStatus.INVENTORY_CHECKED, to: OutboundStatus.INVENTORY_SUFFICIENT, role: 'WAREHOUSE_DIRECTOR' },
      // INVENTORY_CHECKED → INVENTORY_INSUFFICIENT (WAREHOUSE_DIRECTOR, ADMIN)
      { from: OutboundStatus.INVENTORY_CHECKED, to: OutboundStatus.INVENTORY_INSUFFICIENT, role: 'WAREHOUSE_DIRECTOR' },
      // INVENTORY_INSUFFICIENT → INVENTORY_CHECKED (re-check when stock replenished)
      { from: OutboundStatus.INVENTORY_INSUFFICIENT, to: OutboundStatus.INVENTORY_CHECKED, role: 'WAREHOUSE_DIRECTOR' },
      // INVENTORY_SUFFICIENT → PICKING_ASSIGNED
      { from: OutboundStatus.INVENTORY_SUFFICIENT, to: OutboundStatus.PICKING_ASSIGNED, role: 'WAREHOUSE_DIRECTOR' },
      // PICKING_ASSIGNED → PICKER_ASSIGNED
      { from: OutboundStatus.PICKING_ASSIGNED, to: OutboundStatus.PICKER_ASSIGNED, role: 'WAREHOUSE_DIRECTOR' },
      // PICKER_ASSIGNED → ITEM_SCANNED
      { from: OutboundStatus.PICKER_ASSIGNED, to: OutboundStatus.ITEM_SCANNED, role: 'STAFF' },
      // ITEM_SCANNED → PICKED_CORRECT
      { from: OutboundStatus.ITEM_SCANNED, to: OutboundStatus.PICKED_CORRECT, role: 'STAFF' },
      // ITEM_SCANNED → PICKED_WRONG (rescan needed)
      { from: OutboundStatus.ITEM_SCANNED, to: OutboundStatus.PICKED_WRONG, role: 'STAFF' },
      // PICKED_WRONG → ITEM_SCANNED (rescan loop)
      { from: OutboundStatus.PICKED_WRONG, to: OutboundStatus.ITEM_SCANNED, role: 'STAFF' },
      // PICKED_CORRECT → PUT_IN_CART
      { from: OutboundStatus.PICKED_CORRECT, to: OutboundStatus.PUT_IN_CART, role: 'STAFF' },
      // PUT_IN_CART → SLIP_PRINTED
      { from: OutboundStatus.PUT_IN_CART, to: OutboundStatus.SLIP_PRINTED, role: 'STAFF' },
      // SLIP_PRINTED → MOVED_TO_PACKING
      { from: OutboundStatus.SLIP_PRINTED, to: OutboundStatus.MOVED_TO_PACKING, role: 'STAFF' },
    ] as const;

    it('should allow every valid transition with the correct role', () => {
      for (const testCase of transitionCases) {
        expect(
          canTransition(testCase.from, testCase.to, testCase.role),
          `canTransition(${testCase.from} → ${testCase.to} as ${testCase.role})`
        ).toBe(true);
        expect(() =>
          validateTransition(testCase.from, testCase.to, testCase.role)
        ).not.toThrow();
      }
    });

    it('should allow ADMIN role for all valid transitions', () => {
      for (const testCase of transitionCases) {
        expect(
          canTransition(testCase.from, testCase.to, 'ADMIN'),
          `canTransition(${testCase.from} → ${testCase.to} as ADMIN)`
        ).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Invalid transitions
  // --------------------------------------------------------------------------
  describe('invalid transitions', () => {
    it('should reject every invalid status transition', () => {
      for (const from of ALL_STATUSES) {
        for (const to of ALL_STATUSES) {
          if (from === to) continue;
          const isValid = VALID_TRANSITIONS[from]?.includes(to) ?? false;
          if (!isValid) {
            expect(canTransition(from, to, 'ADMIN')).toBe(false);
            expect(() => validateTransition(from, to, 'ADMIN')).toThrow();
          }
        }
      }
    });

    it('should reject skipping steps in the workflow', () => {
      // ORDER_RECEIVED cannot skip to PICKER_ASSIGNED
      expect(canTransition(OutboundStatus.ORDER_RECEIVED, OutboundStatus.PICKER_ASSIGNED, 'ADMIN')).toBe(false);
      // ORDER_RECEIVED cannot skip to PUT_IN_CART
      expect(canTransition(OutboundStatus.ORDER_RECEIVED, OutboundStatus.PUT_IN_CART, 'ADMIN')).toBe(false);
      // PICKER_ASSIGNED cannot skip to SLIP_PRINTED
      expect(canTransition(OutboundStatus.PICKER_ASSIGNED, OutboundStatus.SLIP_PRINTED, 'ADMIN')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Role guards
  // --------------------------------------------------------------------------
  describe('role guards', () => {
    const roleCases = [
      // ORDER_RECEIVED → INVENTORY_CHECKED: STAFF, ADMIN only
      {
        from: OutboundStatus.ORDER_RECEIVED,
        to: OutboundStatus.INVENTORY_CHECKED,
        allowed: ['STAFF', 'ADMIN'],
        denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'DRIVER'],
      },
      // INVENTORY_CHECKED → INVENTORY_SUFFICIENT: WAREHOUSE_DIRECTOR, ADMIN only
      {
        from: OutboundStatus.INVENTORY_CHECKED,
        to: OutboundStatus.INVENTORY_SUFFICIENT,
        allowed: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
        denied: ['STAFF', 'QUALITY', 'ACCOUNTING', 'DRIVER'],
      },
      // INVENTORY_CHECKED → INVENTORY_INSUFFICIENT: WAREHOUSE_DIRECTOR, ADMIN only
      {
        from: OutboundStatus.INVENTORY_CHECKED,
        to: OutboundStatus.INVENTORY_INSUFFICIENT,
        allowed: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
        denied: ['STAFF', 'QUALITY', 'ACCOUNTING', 'DRIVER'],
      },
      // INVENTORY_INSUFFICIENT → INVENTORY_CHECKED (re-check): WAREHOUSE_DIRECTOR, ADMIN only
      {
        from: OutboundStatus.INVENTORY_INSUFFICIENT,
        to: OutboundStatus.INVENTORY_CHECKED,
        allowed: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
        denied: ['STAFF', 'QUALITY', 'ACCOUNTING', 'DRIVER'],
      },
      // PICKING_ASSIGNED → PICKER_ASSIGNED: WAREHOUSE_DIRECTOR, ADMIN only
      {
        from: OutboundStatus.PICKING_ASSIGNED,
        to: OutboundStatus.PICKER_ASSIGNED,
        allowed: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
        denied: ['STAFF', 'QUALITY', 'ACCOUNTING', 'DRIVER'],
      },
      // PICKER_ASSIGNED → ITEM_SCANNED: STAFF, ADMIN only
      {
        from: OutboundStatus.PICKER_ASSIGNED,
        to: OutboundStatus.ITEM_SCANNED,
        allowed: ['STAFF', 'ADMIN'],
        denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'DRIVER'],
      },
      // ITEM_SCANNED → PICKED_CORRECT: STAFF, ADMIN only
      {
        from: OutboundStatus.ITEM_SCANNED,
        to: OutboundStatus.PICKED_CORRECT,
        allowed: ['STAFF', 'ADMIN'],
        denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'DRIVER'],
      },
      // ITEM_SCANNED → PICKED_WRONG: STAFF, ADMIN only
      {
        from: OutboundStatus.ITEM_SCANNED,
        to: OutboundStatus.PICKED_WRONG,
        allowed: ['STAFF', 'ADMIN'],
        denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'DRIVER'],
      },
      // PICKED_WRONG → ITEM_SCANNED (rescan): STAFF, ADMIN only
      {
        from: OutboundStatus.PICKED_WRONG,
        to: OutboundStatus.ITEM_SCANNED,
        allowed: ['STAFF', 'ADMIN'],
        denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'DRIVER'],
      },
      // PICKED_CORRECT → PUT_IN_CART: STAFF, ADMIN only
      {
        from: OutboundStatus.PICKED_CORRECT,
        to: OutboundStatus.PUT_IN_CART,
        allowed: ['STAFF', 'ADMIN'],
        denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'DRIVER'],
      },
      // PUT_IN_CART → SLIP_PRINTED: STAFF, ADMIN only
      {
        from: OutboundStatus.PUT_IN_CART,
        to: OutboundStatus.SLIP_PRINTED,
        allowed: ['STAFF', 'ADMIN'],
        denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'DRIVER'],
      },
      // SLIP_PRINTED → MOVED_TO_PACKING: STAFF, ADMIN only
      {
        from: OutboundStatus.SLIP_PRINTED,
        to: OutboundStatus.MOVED_TO_PACKING,
        allowed: ['STAFF', 'ADMIN'],
        denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'DRIVER'],
      },
    ] as const;

    it('should enforce role requirements for each transition', () => {
      for (const testCase of roleCases) {
        for (const role of testCase.allowed) {
          expect(canTransition(testCase.from, testCase.to, role)).toBe(true);
          expect(() => validateTransition(testCase.from, testCase.to, role)).not.toThrow();
        }
        for (const role of testCase.denied) {
          expect(canTransition(testCase.from, testCase.to, role)).toBe(false);
          expect(() => validateTransition(testCase.from, testCase.to, role)).toThrow();
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Terminal states
  // --------------------------------------------------------------------------
  describe('terminal states', () => {
    it('should mark MOVED_TO_PACKING as terminal', () => {
      expect(isTerminalStatus(OutboundStatus.MOVED_TO_PACKING)).toBe(true);
    });

    it('should reject transitions from MOVED_TO_PACKING', () => {
      for (const to of ALL_STATUSES) {
        if (to === OutboundStatus.MOVED_TO_PACKING) continue;
        expect(canTransition(OutboundStatus.MOVED_TO_PACKING, to, 'ADMIN')).toBe(false);
      }
    });

    it('should identify all non-terminal statuses correctly', () => {
      const nonTerminal = [
        OutboundStatus.ORDER_RECEIVED,
        OutboundStatus.INVENTORY_CHECKED,
        OutboundStatus.INVENTORY_SUFFICIENT,
        OutboundStatus.INVENTORY_INSUFFICIENT,
        OutboundStatus.PICKING_ASSIGNED,
        OutboundStatus.PICKER_ASSIGNED,
        OutboundStatus.ITEM_SCANNED,
        OutboundStatus.PICKED_CORRECT,
        OutboundStatus.PICKED_WRONG,
        OutboundStatus.PUT_IN_CART,
        OutboundStatus.SLIP_PRINTED,
      ];
      for (const status of nonTerminal) {
        expect(isTerminalStatus(status)).toBe(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Picked wrong → rescan loop
  // --------------------------------------------------------------------------
  describe('picking loop (PICKED_WRONG → ITEM_SCANNED)', () => {
    it('should allow rescan after wrong pick', () => {
      expect(canTransition(OutboundStatus.PICKED_WRONG, OutboundStatus.ITEM_SCANNED, 'STAFF')).toBe(true);
      expect(canTransition(OutboundStatus.PICKED_WRONG, OutboundStatus.ITEM_SCANNED, 'ADMIN')).toBe(true);
    });

    it('should not allow skipping back to PICKED_CORRECT from PICKED_WRONG', () => {
      expect(canTransition(OutboundStatus.PICKED_WRONG, OutboundStatus.PICKED_CORRECT, 'STAFF')).toBe(false);
      expect(canTransition(OutboundStatus.PICKED_WRONG, OutboundStatus.PUT_IN_CART, 'STAFF')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Inventory insufficient → re-check loop
  // --------------------------------------------------------------------------
  describe('inventory re-check loop (INSUFFICIENT → CHECKED)', () => {
    it('should allow re-checking inventory after insufficient stock', () => {
      expect(canTransition(OutboundStatus.INVENTORY_INSUFFICIENT, OutboundStatus.INVENTORY_CHECKED, 'WAREHOUSE_DIRECTOR')).toBe(true);
      expect(canTransition(OutboundStatus.INVENTORY_INSUFFICIENT, OutboundStatus.INVENTORY_CHECKED, 'ADMIN')).toBe(true);
    });

    it('should not allow skipping from INSUFFICIENT directly to PICKING_ASSIGNED', () => {
      expect(canTransition(OutboundStatus.INVENTORY_INSUFFICIENT, OutboundStatus.PICKING_ASSIGNED, 'ADMIN')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Helper functions
  // --------------------------------------------------------------------------
  describe('helper functions', () => {
    it('should return valid transitions for each status', () => {
      expect(getValidTransitions(OutboundStatus.ORDER_RECEIVED)).toEqual([
        OutboundStatus.INVENTORY_CHECKED,
      ]);
      expect(getValidTransitions(OutboundStatus.INVENTORY_CHECKED)).toEqual([
        OutboundStatus.INVENTORY_SUFFICIENT,
        OutboundStatus.INVENTORY_INSUFFICIENT,
      ]);
      expect(getValidTransitions(OutboundStatus.ITEM_SCANNED)).toEqual([
        OutboundStatus.PICKED_CORRECT,
        OutboundStatus.PICKED_WRONG,
      ]);
      expect(getValidTransitions(OutboundStatus.MOVED_TO_PACKING)).toEqual([]);
    });

    it('should return required roles for transitions', () => {
      expect(getRequiredRoles(OutboundStatus.ORDER_RECEIVED, OutboundStatus.INVENTORY_CHECKED)).toEqual(['STAFF', 'ADMIN']);
      expect(getRequiredRoles(OutboundStatus.INVENTORY_CHECKED, OutboundStatus.INVENTORY_SUFFICIENT)).toEqual(['WAREHOUSE_DIRECTOR', 'ADMIN']);
      expect(getRequiredRoles(OutboundStatus.PICKER_ASSIGNED, OutboundStatus.ITEM_SCANNED)).toEqual(['STAFF', 'ADMIN']);
      // No roles for invalid transitions
      expect(getRequiredRoles(OutboundStatus.ORDER_RECEIVED, OutboundStatus.MOVED_TO_PACKING)).toEqual([]);
    });
  });
});
