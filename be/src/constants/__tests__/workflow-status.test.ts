import { describe, it, expect } from 'vitest';
import {
  WorkflowStatus,
  PurchaseOrderStatus,
  InboundStatus,
  OutboundStatus,
  PackingStatus,
  SortingStatus,
  ShippingStatus,
  InventoryCheckStatus,
  isValidWorkflowStatus,
  getWorkflowStatusCategory,
  getStatusDescription,
} from '../workflow-status';

describe('WorkflowStatus Constants (Canonical)', () => {
  describe('P01: Purchase Order Status', () => {
    it('should have all required purchase order statuses with plain names', () => {
      expect(PurchaseOrderStatus.DRAFT).toBe('DRAFT');
      expect(PurchaseOrderStatus.PENDING_ACCOUNTING).toBe('PENDING_ACCOUNTING');
      expect(PurchaseOrderStatus.PENDING_APPROVAL).toBe('PENDING_APPROVAL');
      expect(PurchaseOrderStatus.APPROVED).toBe('APPROVED');
      expect(PurchaseOrderStatus.SENT_TO_SUPPLIER).toBe('SENT_TO_SUPPLIER');
      expect(PurchaseOrderStatus.SUPPLIER_CONFIRMED).toBe('SUPPLIER_CONFIRMED');
      expect(PurchaseOrderStatus.SUPPLIER_REJECTED).toBe('SUPPLIER_REJECTED');
      expect(PurchaseOrderStatus.CANCELLED).toBe('CANCELLED');
      expect(PurchaseOrderStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have correct count of purchase order statuses', () => {
      const purchaseOrderStatuses = Object.values(PurchaseOrderStatus);
      expect(purchaseOrderStatuses).toHaveLength(9);
    });
  });

  describe('P02: Inbound Status', () => {
    it('should have all required inbound statuses with plain names', () => {
      expect(InboundStatus.INBOUND_CREATED).toBe('INBOUND_CREATED');
      expect(InboundStatus.ITEMS_RECEIVED).toBe('ITEMS_RECEIVED');
      expect(InboundStatus.QUALITY_CHECKING).toBe('QUALITY_CHECKING');
      expect(InboundStatus.QC_PASSED).toBe('QC_PASSED');
      expect(InboundStatus.QC_FAILED).toBe('QC_FAILED');
      expect(InboundStatus.BARCODE_CREATED).toBe('BARCODE_CREATED');
      expect(InboundStatus.LOCATION_ASSIGNED).toBe('LOCATION_ASSIGNED');
      expect(InboundStatus.STAFF_RECEIVED).toBe('STAFF_RECEIVED');
      expect(InboundStatus.NEW_PRODUCT_CREATED).toBe('NEW_PRODUCT_CREATED');
      expect(InboundStatus.INVENTORY_UPDATED).toBe('INVENTORY_UPDATED');
      expect(InboundStatus.INBOUND_COMPLETED).toBe('INBOUND_COMPLETED');
      expect(InboundStatus.INBOUND_CANCELLED).toBe('INBOUND_CANCELLED');
    });

    it('should have correct count of inbound statuses', () => {
      const inboundStatuses = Object.values(InboundStatus);
      expect(inboundStatuses).toHaveLength(12);
    });
  });

  describe('P03: Outbound Status', () => {
    it('should have all required outbound statuses with plain names', () => {
      expect(OutboundStatus.ORDER_RECEIVED).toBe('ORDER_RECEIVED');
      expect(OutboundStatus.INVENTORY_CHECKED).toBe('INVENTORY_CHECKED');
      expect(OutboundStatus.INVENTORY_SUFFICIENT).toBe('INVENTORY_SUFFICIENT');
      expect(OutboundStatus.INVENTORY_INSUFFICIENT).toBe('INVENTORY_INSUFFICIENT');
      expect(OutboundStatus.PICKING_ASSIGNED).toBe('PICKING_ASSIGNED');
      expect(OutboundStatus.PICKER_ASSIGNED).toBe('PICKER_ASSIGNED');
      expect(OutboundStatus.ITEM_SCANNED).toBe('ITEM_SCANNED');
      expect(OutboundStatus.PICKED_CORRECT).toBe('PICKED_CORRECT');
      expect(OutboundStatus.PICKED_WRONG).toBe('PICKED_WRONG');
      expect(OutboundStatus.PUT_IN_CART).toBe('PUT_IN_CART');
      expect(OutboundStatus.SLIP_PRINTED).toBe('SLIP_PRINTED');
      expect(OutboundStatus.MOVED_TO_PACKING).toBe('MOVED_TO_PACKING');
    });

    it('should have correct count of outbound statuses', () => {
      const outboundStatuses = Object.values(OutboundStatus);
      expect(outboundStatuses).toHaveLength(12);
    });
  });

  describe('P04: Packing Status', () => {
    it('should have all required packing statuses with plain names', () => {
      expect(PackingStatus.PENDING).toBe('PENDING');
      expect(PackingStatus.PACKING).toBe('PACKING');
      expect(PackingStatus.PACKED).toBe('PACKED');
      expect(PackingStatus.SEALED).toBe('SEALED');
      expect(PackingStatus.ON_CONVEYOR).toBe('ON_CONVEYOR');
      expect(PackingStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should have correct count of packing statuses', () => {
      const packingStatuses = Object.values(PackingStatus);
      expect(packingStatuses).toHaveLength(6);
    });
  });

  describe('P05: Sorting Status', () => {
    it('should have all required sorting statuses with plain names', () => {
      expect(SortingStatus.PENDING).toBe('PENDING');
      expect(SortingStatus.SORTING).toBe('SORTING');
      expect(SortingStatus.SORTED).toBe('SORTED');
      expect(SortingStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have correct count of sorting statuses', () => {
      const sortingStatuses = Object.values(SortingStatus);
      expect(sortingStatuses).toHaveLength(4);
    });
  });

  describe('P06: Shipping Status', () => {
    it('should have all required shipping statuses with plain names', () => {
      expect(ShippingStatus.CREATED).toBe('CREATED');
      expect(ShippingStatus.PICKED_UP).toBe('PICKED_UP');
      expect(ShippingStatus.IN_TRANSIT).toBe('IN_TRANSIT');
      expect(ShippingStatus.OUT_FOR_DELIVERY).toBe('OUT_FOR_DELIVERY');
      expect(ShippingStatus.DELIVERED).toBe('DELIVERED');
      expect(ShippingStatus.FAILED).toBe('FAILED');
      expect(ShippingStatus.RETURNED).toBe('RETURNED');
    });

    it('should have correct count of shipping statuses', () => {
      const shippingStatuses = Object.values(ShippingStatus);
      expect(shippingStatuses).toHaveLength(7);
    });
  });

  describe('P07: Inventory Check Status', () => {
    it('should have all required inventory check statuses with plain names', () => {
      expect(InventoryCheckStatus.PENDING).toBe('PENDING');
      expect(InventoryCheckStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(InventoryCheckStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have correct count of inventory check statuses', () => {
      const inventoryCheckStatuses = Object.values(InventoryCheckStatus);
      expect(inventoryCheckStatuses).toHaveLength(3);
    });
  });

  describe('WorkflowStatus Union Type', () => {
    it('should have correct total count of all workflow statuses', () => {
      const allStatuses = Object.values(WorkflowStatus).flatMap(v => Object.values(v));
      expect(allStatuses).toHaveLength(53);
    });
  });

  describe('isValidWorkflowStatus', () => {
    it('should return true for valid workflow status', () => {
      expect(isValidWorkflowStatus('DRAFT')).toBe(true);
      expect(isValidWorkflowStatus('INBOUND_CREATED')).toBe(true);
      expect(isValidWorkflowStatus('ORDER_RECEIVED')).toBe(true);
      expect(isValidWorkflowStatus('PENDING')).toBe(true);
      expect(isValidWorkflowStatus('SORTED')).toBe(true);
      expect(isValidWorkflowStatus('CREATED')).toBe(true);
      expect(isValidWorkflowStatus('PENDING')).toBe(true);
    });

    it('should return false for invalid workflow status', () => {
      expect(isValidWorkflowStatus('INVALID_STATUS')).toBe(false);
      expect(isValidWorkflowStatus('P01_DRAFT')).toBe(false);
      expect(isValidWorkflowStatus('P02_INBOUND_CREATED')).toBe(false);
      expect(isValidWorkflowStatus('')).toBe(false);
    });
  });

  describe('getWorkflowStatusCategory', () => {
    it('should return correct category for purchase order statuses', () => {
      expect(getWorkflowStatusCategory('DRAFT')).toBe('PURCHASE_ORDER');
      expect(getWorkflowStatusCategory('APPROVED')).toBe('PURCHASE_ORDER');
      expect(getWorkflowStatusCategory('SENT_TO_SUPPLIER')).toBe('PURCHASE_ORDER');
    });

    it('should return correct category for inbound statuses', () => {
      expect(getWorkflowStatusCategory('INBOUND_CREATED')).toBe('INBOUND');
      expect(getWorkflowStatusCategory('INBOUND_COMPLETED')).toBe('INBOUND');
    });

    it('should return correct category for outbound statuses', () => {
      expect(getWorkflowStatusCategory('ORDER_RECEIVED')).toBe('OUTBOUND');
      expect(getWorkflowStatusCategory('MOVED_TO_PACKING')).toBe('OUTBOUND');
    });

    it('should return correct category for packing statuses', () => {
      expect(getWorkflowStatusCategory('PENDING')).toBe('PACKING');
      expect(getWorkflowStatusCategory('ON_CONVEYOR')).toBe('PACKING');
    });

    it('should return correct category for sorting statuses', () => {
      expect(getWorkflowStatusCategory('SORTING')).toBe('SORTING');
      expect(getWorkflowStatusCategory('SORTED')).toBe('SORTING');
    });

    it('should return correct category for shipping statuses', () => {
      expect(getWorkflowStatusCategory('CREATED')).toBe('SHIPPING');
      expect(getWorkflowStatusCategory('DELIVERED')).toBe('SHIPPING');
    });

    it('should return correct category for inventory check statuses', () => {
      expect(getWorkflowStatusCategory('IN_PROGRESS')).toBe('INVENTORY_CHECK');
    });

    it('should return null for invalid status', () => {
      expect(getWorkflowStatusCategory('INVALID_STATUS')).toBeNull();
    });
  });

  describe('getStatusDescription', () => {
    it('should return description for DRAFT', () => {
      expect(getStatusDescription('DRAFT')).toBe('Tạo kế hoạch nhập hàng');
    });

    it('should return description for PENDING_ACCOUNTING', () => {
      expect(getStatusDescription('PENDING_ACCOUNTING')).toBe('Kế toán xác nhận');
    });

    it('should return description for PENDING_APPROVAL', () => {
      expect(getStatusDescription('PENDING_APPROVAL')).toBe('Gửi cho Giám đốc kho');
    });

    it('should return description for APPROVED', () => {
      expect(getStatusDescription('APPROVED')).toBe('Giám đốc kho duyệt');
    });

    it('should return description for SENT_TO_SUPPLIER', () => {
      expect(getStatusDescription('SENT_TO_SUPPLIER')).toBe('Gửi đơn cho NCC');
    });

    it('should return description for SUPPLIER_CONFIRMED', () => {
      expect(getStatusDescription('SUPPLIER_CONFIRMED')).toBe('NCC xác nhận có hàng');
    });

    it('should return description for SUPPLIER_REJECTED', () => {
      expect(getStatusDescription('SUPPLIER_REJECTED')).toBe('NCC không có hàng');
    });

    it('should return description for CANCELLED', () => {
      expect(getStatusDescription('CANCELLED')).toBe('Kế toán hủy đơn');
    });

    it('should return description for COMPLETED', () => {
      expect(getStatusDescription('COMPLETED')).toBe('Hoàn tất đặt hàng');
    });

    it('should return description for QC_PASSED', () => {
      expect(getStatusDescription('QC_PASSED')).toBe('QC đạt');
    });

    it('should return description for QC_FAILED', () => {
      expect(getStatusDescription('QC_FAILED')).toBe('QC không đạt (sai số lượng, hư hỏng)');
    });

    it('should return description for INVENTORY_SUFFICIENT', () => {
      expect(getStatusDescription('INVENTORY_SUFFICIENT')).toBe('Đủ hàng');
    });

    it('should return description for INVENTORY_INSUFFICIENT', () => {
      expect(getStatusDescription('INVENTORY_INSUFFICIENT')).toBe('Không đủ hàng -> Chờ');
    });

    it('should return description for PICKED_CORRECT', () => {
      expect(getStatusDescription('PICKED_CORRECT')).toBe('Lấy đúng sản phẩm');
    });

    it('should return description for PICKED_WRONG', () => {
      expect(getStatusDescription('PICKED_WRONG')).toBe('Lấy sai (quét lại)');
    });

    it('should return description for DELIVERED', () => {
      expect(getStatusDescription('DELIVERED')).toBe('Đã giao hàng');
    });

    it('should return description for FAILED', () => {
      expect(getStatusDescription('FAILED')).toBe('Giao thất bại');
    });

    it('should return description for RETURNED', () => {
      expect(getStatusDescription('RETURNED')).toBe('Hoàn hàng');
    });

    it('should return null for invalid status', () => {
      expect(getStatusDescription('INVALID_STATUS')).toBeNull();
    });
  });
});