import {
  PurchaseOrderStatus,
  InboundStatus,
  OutboundStatus,
  PackingStatus,
  SortingStatus,
  ShippingStatus,
  InventoryCheckStatus,
} from './canonical-status';

export {
  PurchaseOrderStatus,
  InboundStatus,
  OutboundStatus,
  PackingStatus,
  SortingStatus,
  ShippingStatus,
  InventoryCheckStatus,
} from './canonical-status';

export type WorkflowStatusCategory =
  | 'PURCHASE_ORDER'
  | 'INBOUND'
  | 'OUTBOUND'
  | 'PACKING'
  | 'SORTING'
  | 'SHIPPING'
  | 'INVENTORY_CHECK';

export const WorkflowStatus = {
  PurchaseOrder: PurchaseOrderStatus,
  Inbound: InboundStatus,
  Outbound: OutboundStatus,
  Packing: PackingStatus,
  Sorting: SortingStatus,
  Shipping: ShippingStatus,
  InventoryCheck: InventoryCheckStatus,
} as const;

export type WorkflowStatus =
  | PurchaseOrderStatus
  | InboundStatus
  | OutboundStatus
  | PackingStatus
  | SortingStatus
  | ShippingStatus
  | InventoryCheckStatus;

const STATUS_CATEGORY_MAP: Record<string, WorkflowStatusCategory> = {
  DRAFT: 'PURCHASE_ORDER',
  PENDING_ACCOUNTING: 'PURCHASE_ORDER',
  PENDING_APPROVAL: 'PURCHASE_ORDER',
  APPROVED: 'PURCHASE_ORDER',
  SENT_TO_SUPPLIER: 'PURCHASE_ORDER',
  SUPPLIER_CONFIRMED: 'PURCHASE_ORDER',
  SUPPLIER_REJECTED: 'PURCHASE_ORDER',
  CANCELLED: 'PURCHASE_ORDER',
  COMPLETED: 'PURCHASE_ORDER',
  INBOUND_CREATED: 'INBOUND',
  ITEMS_RECEIVED: 'INBOUND',
  QUALITY_CHECKING: 'INBOUND',
  QC_PASSED: 'INBOUND',
  QC_FAILED: 'INBOUND',
  BARCODE_CREATED: 'INBOUND',
  LOCATION_ASSIGNED: 'INBOUND',
  STAFF_RECEIVED: 'INBOUND',
  NEW_PRODUCT_CREATED: 'INBOUND',
  INVENTORY_UPDATED: 'INBOUND',
  INBOUND_COMPLETED: 'INBOUND',
  INBOUND_CANCELLED: 'INBOUND',
  ORDER_RECEIVED: 'OUTBOUND',
  INVENTORY_CHECKED: 'OUTBOUND',
  INVENTORY_SUFFICIENT: 'OUTBOUND',
  INVENTORY_INSUFFICIENT: 'OUTBOUND',
  PICKING_ASSIGNED: 'OUTBOUND',
  PICKER_ASSIGNED: 'OUTBOUND',
  ITEM_SCANNED: 'OUTBOUND',
  PICKED_CORRECT: 'OUTBOUND',
  PICKED_WRONG: 'OUTBOUND',
  PUT_IN_CART: 'OUTBOUND',
  SLIP_PRINTED: 'OUTBOUND',
  MOVED_TO_PACKING: 'OUTBOUND',
  PENDING: 'PACKING',
  PACKING: 'PACKING',
  PACKED: 'PACKING',
  SEALED: 'PACKING',
  ON_CONVEYOR: 'PACKING',
  SORTING: 'SORTING',
  SORTED: 'SORTING',
  CREATED: 'SHIPPING',
  PICKED_UP: 'SHIPPING',
  IN_TRANSIT: 'SHIPPING',
  OUT_FOR_DELIVERY: 'SHIPPING',
  DELIVERED: 'SHIPPING',
  FAILED: 'SHIPPING',
  RETURNED: 'SHIPPING',
  IN_PROGRESS: 'INVENTORY_CHECK',
} as const;

const STATUS_DESCRIPTIONS: Record<string, string> = {
  DRAFT: 'Tạo kế hoạch nhập hàng',
  PENDING_ACCOUNTING: 'Kế toán xác nhận',
  PENDING_APPROVAL: 'Gửi cho Giám đốc kho',
  APPROVED: 'Giám đốc kho duyệt',
  SENT_TO_SUPPLIER: 'Gửi đơn cho NCC',
  SUPPLIER_CONFIRMED: 'NCC xác nhận có hàng',
  SUPPLIER_REJECTED: 'NCC không có hàng',
  CANCELLED: 'Kế toán hủy đơn',
  COMPLETED: 'Hoàn tất đặt hàng',
  INBOUND_CREATED: 'Tạo phiếu nhập kho',
  ITEMS_RECEIVED: 'Hàng đến, bắt đầu kiểm tra',
  QUALITY_CHECKING: 'QC đang kiểm tra',
  QC_PASSED: 'QC đạt',
  QC_FAILED: 'QC không đạt (sai số lượng, hư hỏng)',
  BARCODE_CREATED: 'Tạo barcode cho kiện hàng',
  LOCATION_ASSIGNED: 'Gán vị trí lưu kho',
  STAFF_RECEIVED: 'Staff xác nhận nhận hàng',
  NEW_PRODUCT_CREATED: 'Tạo sản phẩm mới (chưa từng có)',
  INVENTORY_UPDATED: 'Cập nhật tồn kho',
  INBOUND_COMPLETED: 'Hoàn tất nhập kho',
  INBOUND_CANCELLED: 'Hủy phiếu nhập kho',
  ORDER_RECEIVED: 'Nhận đơn từ Shopee/sàn TMĐT',
  INVENTORY_CHECKED: 'Kiểm tra tồn kho',
  INVENTORY_SUFFICIENT: 'Đủ hàng',
  INVENTORY_INSUFFICIENT: 'Không đủ hàng -> Chờ',
  PICKING_ASSIGNED: 'Giao cho trưởng phòng điều phối',
  PICKER_ASSIGNED: 'Giao nhân viên lấy hàng',
  ITEM_SCANNED: 'Quét mã sản phẩm',
  PICKED_CORRECT: 'Lấy đúng sản phẩm',
  PICKED_WRONG: 'Lấy sai (quét lại)',
  PUT_IN_CART: 'Cho vào giỏ hàng',
  SLIP_PRINTED: 'In phiếu xuất kho (MB02)',
  MOVED_TO_PACKING: 'Chuyển sang đóng gói',
  PACKING: 'Đang đóng gói',
  PACKED: 'Đã đóng gói xong',
  SEALED: 'Đã dán seal',
  ON_CONVEYOR: 'Đưa lên băng chuyền',
  SORTING: 'Đang phân loại',
  SORTED: 'Đã phân loại xong',
  CREATED: 'Tạo lô hàng vận chuyển',
  PICKED_UP: 'Hãng lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  OUT_FOR_DELIVERY: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  FAILED: 'Giao thất bại',
  RETURNED: 'Hoàn hàng',
  IN_PROGRESS: 'Đang kiểm kê',
} as const;

export function getAllWorkflowStatuses(): string[] {
  return [
    ...Object.values(PurchaseOrderStatus),
    ...Object.values(InboundStatus),
    ...Object.values(OutboundStatus),
    ...Object.values(PackingStatus),
    ...Object.values(SortingStatus),
    ...Object.values(ShippingStatus),
    ...Object.values(InventoryCheckStatus),
  ];
}

export function isValidWorkflowStatus(status: string): boolean {
  return status in STATUS_CATEGORY_MAP;
}

export function getWorkflowStatusCategory(
  status: string
): WorkflowStatusCategory | null {
  return STATUS_CATEGORY_MAP[status] ?? null;
}

export function getStatusDescription(status: string): string | null {
  return STATUS_DESCRIPTIONS[status] ?? null;
}

export function getStatusesByCategory(
  category: WorkflowStatusCategory
): string[] {
  return Object.entries(STATUS_CATEGORY_MAP)
    .filter(([, cat]) => cat === category)
    .map(([status]) => status);
}

export function getTerminalStatuses(): string[] {
  return [
    PurchaseOrderStatus.COMPLETED,
    PurchaseOrderStatus.CANCELLED,
    PurchaseOrderStatus.SUPPLIER_REJECTED,
    InboundStatus.INBOUND_COMPLETED,
    InboundStatus.INBOUND_CANCELLED,
    OutboundStatus.MOVED_TO_PACKING,
    PackingStatus.ON_CONVEYOR,
    SortingStatus.COMPLETED,
    ShippingStatus.DELIVERED,
    ShippingStatus.FAILED,
    ShippingStatus.RETURNED,
    InventoryCheckStatus.COMPLETED,
  ];
}

export function isTerminalStatus(status: string): boolean {
  return getTerminalStatuses().includes(status);
}
