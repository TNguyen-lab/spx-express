import { describe, expect, it } from 'vitest';
import { PurchaseOrderStatus } from '../../constants/canonical-status';
import {
  canTransition,
  getRequiredRoles,
  getValidTransitions,
  isTerminalStatus,
  validateTransition,
} from '../../modules/purchase-order/domain/aggregates/purchase-order-policy';

describe('purchase-order-state-machine', () => {
  it('allows the accounting and director approval chain', () => {
    expect(canTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING_ACCOUNTING, 'QUALITY')).toBe(true);
    expect(canTransition(PurchaseOrderStatus.PENDING_ACCOUNTING, PurchaseOrderStatus.PENDING_APPROVAL, 'ACCOUNTING')).toBe(true);
    expect(canTransition(PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.APPROVED, 'WAREHOUSE_DIRECTOR')).toBe(true);
    expect(canTransition(PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.SENT_TO_SUPPLIER, 'ACCOUNTING')).toBe(true);
    expect(canTransition(PurchaseOrderStatus.SENT_TO_SUPPLIER, PurchaseOrderStatus.SUPPLIER_CONFIRMED, 'ADMIN')).toBe(true);
    expect(canTransition(PurchaseOrderStatus.SENT_TO_SUPPLIER, PurchaseOrderStatus.SUPPLIER_REJECTED, 'ADMIN')).toBe(true);
    expect(canTransition(PurchaseOrderStatus.SUPPLIER_REJECTED, PurchaseOrderStatus.CANCELLED, 'ACCOUNTING')).toBe(true);
  });

  it('rejects invalid transitions and roles', () => {
    expect(canTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.APPROVED, 'QUALITY')).toBe(false);
    expect(() => validateTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.APPROVED, 'QUALITY')).toThrow();
    expect(canTransition(PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.SENT_TO_SUPPLIER, 'ACCOUNTING')).toBe(false);
  });

  it('marks only terminal end states as terminal', () => {
    expect(isTerminalStatus(PurchaseOrderStatus.COMPLETED)).toBe(true);
    expect(isTerminalStatus(PurchaseOrderStatus.CANCELLED)).toBe(true);
    expect(isTerminalStatus(PurchaseOrderStatus.SUPPLIER_REJECTED)).toBe(false);
  });

  it('exposes expected transitions and roles', () => {
    expect(getValidTransitions(PurchaseOrderStatus.PENDING_ACCOUNTING)).toEqual([
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.CANCELLED,
    ]);
    expect(getRequiredRoles(PurchaseOrderStatus.SUPPLIER_REJECTED, PurchaseOrderStatus.CANCELLED)).toEqual([
      'ACCOUNTING',
      'ADMIN',
    ]);
  });
});
