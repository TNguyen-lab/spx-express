import {
  PurchaseOrderStatus,
  InboundStatus,
  OutboundStatus,
  PackingStatus,
  SortingStatus,
  ShippingStatus,
  InventoryCheckStatus,
} from './canonical';

export type {
  PurchaseOrderStatus,
  InboundStatus,
  OutboundStatus,
  PackingStatus,
  SortingStatus,
  ShippingStatus as ShipmentStatus,
  InventoryCheckStatus,
};

export { WorkflowStatus, getTerminalStatuses } from './canonical';

export type { WorkflowStatusCategory } from './canonical';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'QUALITY' | 'ACCOUNTING' | 'WAREHOUSE_DIRECTOR' | 'STAFF' | 'DRIVER';
  phone?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  weight?: number;
  dimensions?: string;
  price: number;
  minStock: number;
  image?: string;
  inventory?: Inventory;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  available: number;
  reserved: number;
  costPrice: number;
}

export interface WarehouseLocation {
  id: string;
  zone: string;
  row: number;
  shelf: number;
  position?: number;
  capacity: number;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier: Supplier;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
  approvals?: PurchaseOrderApproval[];
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQty: number;
}

export interface PurchaseOrderApproval {
  id: string;
  approverId: string;
  approver: { name: string };
  role: 'ACCOUNTING' | 'WAREHOUSE_DIRECTOR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  approvedAt?: string;
}

export interface Inbound {
  id: string;
  inboundNumber: string;
  purchaseOrderId?: string;
  purchaseOrder?: PurchaseOrder;
  staffId: string;
  staff: { id: string; name: string };
  status: InboundStatus;
  receivedDate?: string;
  qcPassedDate?: string;
  completedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: InboundItem[];
}

export interface InboundItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  receivedQty: number;
  damageQty: number;
  barcode?: string;
  locationId?: string;
  location?: WarehouseLocation;
  notes?: string;
}

export interface Outbound {
  id: string;
  outboundNumber: string;
  orderRef?: string;
  status: OutboundStatus;
  pickerId: string;
  picker: { id: string; name: string };
  pickedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: OutboundItem[];
  packing?: Packing;
}

export interface OutboundItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  pickedQty: number;
  locationId?: string;
  location?: WarehouseLocation;
}

export interface Packing {
  id: string;
  packingNumber: string;
  outboundId: string;
  outbound: Outbound;
  packerId: string;
  packer: { id: string; name: string };
  status: PackingStatus;
  packedDate?: string;
  sealedDate?: string;
  weight?: number;
  dimension?: string;
  notes?: string;
  cartonId?: string;
  palletId?: string;
  itemsPacked?: number;
  sorting?: { id: string; sortingNumber: string; status?: SortingStatus };
  createdAt?: string;
  updatedAt?: string;
}

export interface Sorting {
  id: string;
  sortingNumber: string;
  packingId: string;
  packing: Packing;
  sorterId: string;
  sorter: { id: string; name: string };
  status: SortingStatus;
  sortedDate?: string;
  completedDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  sortingId: string;
  sorting: Sorting;
  shipperId: string;
  shipper: { id: string; name: string };
  carrier: string;
  trackingNumber?: string;
  status: ShippingStatus;
  shippedDate?: string;
  deliveredDate?: string;
  deliveryNotes?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryCheck {
  id: string;
  checkNumber: string;
  checkerId: string;
  checker: { id: string; name: string };
  type: 'ROUTINE' | 'SPOT_CHECK' | 'ANNUAL';
  startDate?: string;
  endDate?: string;
  status: InventoryCheckStatus;
  notes?: string;
  approver?: { id: string; name: string };
  approvedAt?: string;
  scope?: string;
  items: InventoryCheckItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryCheckItem {
  id: string;
  productId: string;
  product: Product;
  systemQty: number;
  actualQty: number;
  discrepancy: number;
  notes?: string;
}

export type TransferStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXCEPTION';

export interface TransferLocation {
  id: string;
  zone?: string;
  row?: number;
  shelf?: number;
  name?: string;
}

export interface TransferItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  receivedQty: number;
  discrepancyNote?: string | null;
  resolved?: boolean;
}

export interface TransferReconciliation {
  id: string;
  productId: string;
  product?: Product;
  expectedQty: number;
  actualQty: number;
  discrepancyQty: number;
  resolution?: 'RESOLVED_SOURCE' | 'RESOLVED_DESTINATION' | 'WRITTEN_OFF';
  resolvedAt?: string | null;
  resolvedById?: string | null;
  notes?: string | null;
}

export interface Transfer {
  id: string;
  transferNumber: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocation?: TransferLocation;
  toLocation?: TransferLocation;
  status: TransferStatus;
  requestedById?: string;
  requestedBy?: { id: string; name: string };
  approvedById?: string | null;
  approvedBy?: { id: string; name: string };
  notes?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  items: TransferItem[];
  reconciliations?: TransferReconciliation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyReportLine {
  productId: string;
  sku: string;
  name: string;
  category: string | null;
  openingStock: number;
  inbound: number;
  outbound: number;
  transferIn: number;
  transferOut: number;
  adjustment: number;
  endingStock: number;
}

export interface MonthlyReportPayload {
  reportType: 'MONTHLY_INVENTORY';
  period: { month: string; start: string; end: string; closedAt: string };
  closeRule: string;
  filters: {
    month: string;
    warehouseLocationId?: string;
    productId?: string;
    category?: string;
  };
  summary: {
    openingStock: number;
    inbound: number;
    outbound: number;
    transferIn: number;
    transferOut: number;
    adjustment: number;
    endingStock: number;
  };
  reconciliation: {
    expectedEndingStock: number;
    ledgerEndingStock: number;
    difference: number;
    balanced: boolean;
  };
  movements: { count: number; sourceHash: string };
  lines: MonthlyReportLine[];
}

export interface MonthlyReportMeta {
  reportKey: string;
  sourceHash: string;
  sourceMovementCount: number;
}

export interface EventLog {
  id: string;
  eventType: string;
  process: string;
  entityType: string;
  entityId: string;
  userId?: string;
  payload?: Record<string, unknown>;
  status: string;
  createdAt: string;
}
