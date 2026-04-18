import { describe, expect, it } from 'vitest';
import { InboundStatus } from '../../constants/workflow-status';
import {
  canTransition,
  getRequiredRoles,
  getValidTransitions,
  isTerminalStatus,
  validateTransition,
} from '../../modules/inbound/domain/aggregates/inbound-policy.js';

const ALL_STATUSES = [
  InboundStatus.INBOUND_CREATED,
  InboundStatus.ITEMS_RECEIVED,
  InboundStatus.QUALITY_CHECKING,
  InboundStatus.QC_PASSED,
  InboundStatus.QC_FAILED,
  InboundStatus.BARCODE_CREATED,
  InboundStatus.LOCATION_ASSIGNED,
  InboundStatus.STAFF_RECEIVED,
  InboundStatus.NEW_PRODUCT_CREATED,
  InboundStatus.INVENTORY_UPDATED,
  InboundStatus.INBOUND_COMPLETED,
  InboundStatus.INBOUND_CANCELLED,
] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  [InboundStatus.INBOUND_CREATED]: [
    InboundStatus.ITEMS_RECEIVED,
    InboundStatus.INBOUND_CANCELLED,
  ],
  [InboundStatus.ITEMS_RECEIVED]: [
    InboundStatus.QUALITY_CHECKING,
  ],
  [InboundStatus.QUALITY_CHECKING]: [
    InboundStatus.QC_PASSED,
    InboundStatus.QC_FAILED,
  ],
  [InboundStatus.QC_PASSED]: [
    InboundStatus.BARCODE_CREATED,
  ],
  [InboundStatus.QC_FAILED]: [
    InboundStatus.INBOUND_CANCELLED,
    InboundStatus.QUALITY_CHECKING,
  ],
  [InboundStatus.BARCODE_CREATED]: [
    InboundStatus.LOCATION_ASSIGNED,
  ],
  [InboundStatus.LOCATION_ASSIGNED]: [
    InboundStatus.STAFF_RECEIVED,
  ],
  [InboundStatus.STAFF_RECEIVED]: [
    InboundStatus.NEW_PRODUCT_CREATED,
    InboundStatus.INVENTORY_UPDATED,
  ],
  [InboundStatus.NEW_PRODUCT_CREATED]: [
    InboundStatus.INVENTORY_UPDATED,
  ],
  [InboundStatus.INVENTORY_UPDATED]: [
    InboundStatus.INBOUND_COMPLETED,
  ],
  [InboundStatus.INBOUND_COMPLETED]: [],
  [InboundStatus.INBOUND_CANCELLED]: [],
};

describe('inbound-state-machine', () => {
  describe('valid transitions', () => {
    it('should allow every valid transition with a required role', () => {
      const transitionCases = [
        // INBOUND_CREATED → ITEMS_RECEIVED (STAFF, ADMIN)
        {
          from: InboundStatus.INBOUND_CREATED,
          to: InboundStatus.ITEMS_RECEIVED,
          role: 'STAFF',
        },
        // INBOUND_CREATED → CANCELLED (QUALITY, ADMIN)
        {
          from: InboundStatus.INBOUND_CREATED,
          to: InboundStatus.INBOUND_CANCELLED,
          role: 'QUALITY',
        },
        // ITEMS_RECEIVED → QUALITY_CHECKING (QUALITY, ADMIN)
        {
          from: InboundStatus.ITEMS_RECEIVED,
          to: InboundStatus.QUALITY_CHECKING,
          role: 'QUALITY',
        },
        // QUALITY_CHECKING → QC_PASSED (QUALITY, ADMIN)
        {
          from: InboundStatus.QUALITY_CHECKING,
          to: InboundStatus.QC_PASSED,
          role: 'QUALITY',
        },
        // QUALITY_CHECKING → QC_FAILED (QUALITY, ADMIN)
        {
          from: InboundStatus.QUALITY_CHECKING,
          to: InboundStatus.QC_FAILED,
          role: 'QUALITY',
        },
        // QC_PASSED → BARCODE_CREATED (STAFF, ADMIN)
        {
          from: InboundStatus.QC_PASSED,
          to: InboundStatus.BARCODE_CREATED,
          role: 'STAFF',
        },
        // QC_FAILED → CANCELLED (WAREHOUSE_DIRECTOR, ADMIN)
        {
          from: InboundStatus.QC_FAILED,
          to: InboundStatus.INBOUND_CANCELLED,
          role: 'WAREHOUSE_DIRECTOR',
        },
        // QC_FAILED → QUALITY_CHECKING (re-check) (QUALITY, ADMIN)
        {
          from: InboundStatus.QC_FAILED,
          to: InboundStatus.QUALITY_CHECKING,
          role: 'QUALITY',
        },
        // BARCODE_CREATED → LOCATION_ASSIGNED (STAFF, ADMIN)
        {
          from: InboundStatus.BARCODE_CREATED,
          to: InboundStatus.LOCATION_ASSIGNED,
          role: 'STAFF',
        },
        // LOCATION_ASSIGNED → STAFF_RECEIVED (STAFF, ADMIN)
        {
          from: InboundStatus.LOCATION_ASSIGNED,
          to: InboundStatus.STAFF_RECEIVED,
          role: 'STAFF',
        },
        // STAFF_RECEIVED → INVENTORY_UPDATED (STAFF, ADMIN)
        {
          from: InboundStatus.STAFF_RECEIVED,
          to: InboundStatus.INVENTORY_UPDATED,
          role: 'STAFF',
        },
        // STAFF_RECEIVED → NEW_PRODUCT_CREATED (STAFF, ADMIN)
        {
          from: InboundStatus.STAFF_RECEIVED,
          to: InboundStatus.NEW_PRODUCT_CREATED,
          role: 'STAFF',
        },
        // NEW_PRODUCT_CREATED → INVENTORY_UPDATED (STAFF, ADMIN)
        {
          from: InboundStatus.NEW_PRODUCT_CREATED,
          to: InboundStatus.INVENTORY_UPDATED,
          role: 'STAFF',
        },
        // INVENTORY_UPDATED → INBOUND_COMPLETED (STAFF, ADMIN)
        {
          from: InboundStatus.INVENTORY_UPDATED,
          to: InboundStatus.INBOUND_COMPLETED,
          role: 'STAFF',
        },
      ] as const;

      for (const testCase of transitionCases) {
        expect(canTransition(testCase.from, testCase.to, testCase.role)).toBe(true);
        expect(() =>
          validateTransition(testCase.from, testCase.to, testCase.role)
        ).not.toThrow();
      }
    });
  });

  describe('invalid transitions', () => {
    it('should reject every invalid status transition', () => {
      for (const from of ALL_STATUSES) {
        for (const to of ALL_STATUSES) {
          if (from === to) {
            continue;
          }

          const isValid = VALID_TRANSITIONS[from]?.includes(to) ?? false;
          if (!isValid) {
            expect(canTransition(from, to, 'ADMIN')).toBe(false);
            expect(() => validateTransition(from, to, 'ADMIN')).toThrow();
          }
        }
      }
    });
  });

  describe('role guards', () => {
    it('should enforce role requirements for each transition', () => {
      const roleCases = [
        // INBOUND_CREATED → ITEMS_RECEIVED: STAFF, ADMIN only
        {
          from: InboundStatus.INBOUND_CREATED,
          to: InboundStatus.ITEMS_RECEIVED,
          allowed: ['STAFF', 'ADMIN'],
          denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // INBOUND_CREATED → CANCELLED: QUALITY, ADMIN only
        {
          from: InboundStatus.INBOUND_CREATED,
          to: InboundStatus.INBOUND_CANCELLED,
          allowed: ['QUALITY', 'ADMIN'],
          denied: ['STAFF', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // ITEMS_RECEIVED → QUALITY_CHECKING: QUALITY, ADMIN only
        {
          from: InboundStatus.ITEMS_RECEIVED,
          to: InboundStatus.QUALITY_CHECKING,
          allowed: ['QUALITY', 'ADMIN'],
          denied: ['STAFF', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // QUALITY_CHECKING → QC_PASSED: QUALITY, ADMIN only
        {
          from: InboundStatus.QUALITY_CHECKING,
          to: InboundStatus.QC_PASSED,
          allowed: ['QUALITY', 'ADMIN'],
          denied: ['STAFF', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // QUALITY_CHECKING → QC_FAILED: QUALITY, ADMIN only
        {
          from: InboundStatus.QUALITY_CHECKING,
          to: InboundStatus.QC_FAILED,
          allowed: ['QUALITY', 'ADMIN'],
          denied: ['STAFF', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // QC_PASSED → BARCODE_CREATED: STAFF, ADMIN only
        {
          from: InboundStatus.QC_PASSED,
          to: InboundStatus.BARCODE_CREATED,
          allowed: ['STAFF', 'ADMIN'],
          denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // QC_FAILED → CANCELLED: WAREHOUSE_DIRECTOR, ADMIN only
        {
          from: InboundStatus.QC_FAILED,
          to: InboundStatus.INBOUND_CANCELLED,
          allowed: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
          denied: ['QUALITY', 'STAFF', 'ACCOUNTING'],
        },
        // QC_FAILED → QUALITY_CHECKING (re-check): QUALITY, ADMIN only
        {
          from: InboundStatus.QC_FAILED,
          to: InboundStatus.QUALITY_CHECKING,
          allowed: ['QUALITY', 'ADMIN'],
          denied: ['STAFF', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // BARCODE_CREATED → LOCATION_ASSIGNED: STAFF, ADMIN only
        {
          from: InboundStatus.BARCODE_CREATED,
          to: InboundStatus.LOCATION_ASSIGNED,
          allowed: ['STAFF', 'ADMIN'],
          denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // LOCATION_ASSIGNED → STAFF_RECEIVED: STAFF, ADMIN only
        {
          from: InboundStatus.LOCATION_ASSIGNED,
          to: InboundStatus.STAFF_RECEIVED,
          allowed: ['STAFF', 'ADMIN'],
          denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // STAFF_RECEIVED → INVENTORY_UPDATED: STAFF, ADMIN only
        {
          from: InboundStatus.STAFF_RECEIVED,
          to: InboundStatus.INVENTORY_UPDATED,
          allowed: ['STAFF', 'ADMIN'],
          denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // STAFF_RECEIVED → NEW_PRODUCT_CREATED: STAFF, ADMIN only
        {
          from: InboundStatus.STAFF_RECEIVED,
          to: InboundStatus.NEW_PRODUCT_CREATED,
          allowed: ['STAFF', 'ADMIN'],
          denied: ['QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR'],
        },
        // WAREHOUSE_DIRECTOR can cancel from QC_FAILED
        {
          from: InboundStatus.QC_FAILED,
          to: InboundStatus.INBOUND_CANCELLED,
          allowed: ['WAREHOUSE_DIRECTOR', 'ADMIN'],
          denied: ['QUALITY', 'STAFF', 'ACCOUNTING'],
        },
      ] as const;

      for (const testCase of roleCases) {
        for (const role of testCase.allowed) {
          expect(canTransition(testCase.from, testCase.to, role)).toBe(true);
          expect(() =>
            validateTransition(testCase.from, testCase.to, role)
          ).not.toThrow();
        }

        for (const role of testCase.denied) {
          expect(canTransition(testCase.from, testCase.to, role)).toBe(false);
          expect(() => validateTransition(testCase.from, testCase.to, role)).toThrow();
        }
      }
    });
  });

  describe('terminal states', () => {
    it('should mark INBOUND_COMPLETED and CANCELLED as terminal', () => {
      expect(isTerminalStatus(InboundStatus.INBOUND_COMPLETED)).toBe(true);
      expect(isTerminalStatus(InboundStatus.INBOUND_CANCELLED)).toBe(true);
    });

    it('should reject transitions from terminal states', () => {
      const terminalStates = [
        InboundStatus.INBOUND_COMPLETED,
        InboundStatus.INBOUND_CANCELLED,
      ];

      for (const from of terminalStates) {
        for (const to of ALL_STATUSES) {
          if (from === to) {
            continue;
          }
          expect(canTransition(from, to, 'ADMIN')).toBe(false);
          expect(() => validateTransition(from, to, 'ADMIN')).toThrow();
        }
      }
    });

    it('should identify non-terminal statuses correctly', () => {
      const nonTerminalStatuses = [
        InboundStatus.INBOUND_CREATED,
        InboundStatus.ITEMS_RECEIVED,
        InboundStatus.QUALITY_CHECKING,
        InboundStatus.QC_PASSED,
        InboundStatus.QC_FAILED,
        InboundStatus.BARCODE_CREATED,
        InboundStatus.LOCATION_ASSIGNED,
        InboundStatus.STAFF_RECEIVED,
        InboundStatus.NEW_PRODUCT_CREATED,
        InboundStatus.INVENTORY_UPDATED,
      ];

      for (const status of nonTerminalStatuses) {
        expect(isTerminalStatus(status)).toBe(false);
      }
    });
  });

  describe('helper functions', () => {
    it('should return valid transitions for each status', () => {
      expect(getValidTransitions(InboundStatus.INBOUND_CREATED)).toEqual([
        InboundStatus.ITEMS_RECEIVED,
        InboundStatus.INBOUND_CANCELLED,
      ]);

      expect(getValidTransitions(InboundStatus.QUALITY_CHECKING)).toEqual([
        InboundStatus.QC_PASSED,
        InboundStatus.QC_FAILED,
      ]);

      expect(getValidTransitions(InboundStatus.STAFF_RECEIVED)).toEqual([
        InboundStatus.NEW_PRODUCT_CREATED,
        InboundStatus.INVENTORY_UPDATED,
      ]);

      expect(getValidTransitions(InboundStatus.INBOUND_COMPLETED)).toEqual([]);
      expect(getValidTransitions(InboundStatus.INBOUND_CANCELLED)).toEqual([]);
    });

    it('should return required roles for transition', () => {
      // QUALITY can create and QC
      expect(
        getRequiredRoles(
          InboundStatus.INBOUND_CREATED,
          InboundStatus.INBOUND_CANCELLED
        )
      ).toEqual(['QUALITY', 'ADMIN']);

      // STAFF can receive and process
      expect(
        getRequiredRoles(
          InboundStatus.INBOUND_CREATED,
          InboundStatus.ITEMS_RECEIVED
        )
      ).toEqual(['STAFF', 'ADMIN']);

      // WAREHOUSE_DIRECTOR can cancel from QC_FAILED
      expect(
        getRequiredRoles(
          InboundStatus.QC_FAILED,
          InboundStatus.INBOUND_CANCELLED
        )
      ).toEqual(['WAREHOUSE_DIRECTOR', 'ADMIN']);

      // No roles for invalid transitions
      expect(
        getRequiredRoles(
          InboundStatus.INBOUND_COMPLETED,
          InboundStatus.ITEMS_RECEIVED
        )
      ).toEqual([]);
    });
  });
});
