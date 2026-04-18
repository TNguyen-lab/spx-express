import axios from 'axios';
import {
  PurchaseOrderStatus,
  InboundStatus,
  OutboundStatus,
  PackingStatus,
  SortingStatus,
  ShippingStatus,
  InventoryCheckStatus,
} from '../types/canonical';
import type {
  PurchaseOrder,
  Inbound,
  Outbound,
  Packing,
  Sorting,
  Shipment,
  InventoryCheck,
  InventoryCheckItem,
  Product,
  Supplier,
  WarehouseLocation,
  User,
  EventLog,
  Transfer,
  TransferStatus,
  MonthlyReportPayload,
  MonthlyReportMeta,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

const workflowPaths = {
  auth: '/api/auth',
  products: '/api/products',
  suppliers: '/api/suppliers',
  inventory: '/api/inventory',
  locations: '/api/locations',
  orders: '/api/orders',
  inbounds: '/api/inbounds',
  outbounds: '/api/outbounds',
  packings: '/api/packings',
  sortings: '/api/sortings',
  shipments: '/api/shipments',
  inventoryChecks: '/api/inventory-checks',
  transfers: '/api/transfers',
  reports: '/api/reports',
  events: '/api/events',
} as const;

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type CollectionResponse<TKey extends string, TValue> =
  | { total?: number } & Partial<Record<TKey, TValue[]>>
  | TValue[];

export type ItemResponse<TKey extends string, TValue> = { [K in TKey]?: TValue } | TValue;

export interface PaginatedWorkflowParams<TStatus extends string = string>
  extends QueryParams {
  status?: TStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateOrderRequest {
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
}

export interface CreateInboundRequest {
  purchaseOrderId?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; notes?: string }>;
}

export interface CreateOutboundRequest {
  orderRef?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface CreateShipmentRequest {
  sortingId: string;
  shipperId: string;
  carrier: string;
  trackingNumber?: string;
}

export interface CreateInventoryCheckRequest {
  type: 'ROUTINE' | 'SPOT_CHECK' | 'ANNUAL';
  notes?: string;
  productIds?: string[];
  category?: string;
  locationId?: string;
}

const joinPath = (base: string, ...segments: Array<string | number | undefined>) =>
  [base, ...segments.filter((segment): segment is string | number => segment !== undefined && segment !== '')].join('/');

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const get = <TResponse>(url: string, config?: { params?: QueryParams }) => api.get<TResponse>(url, config).then((res) => res.data);
const post = <TResponse>(url: string, data?: unknown) => api.post<TResponse>(url, data).then((res) => res.data);
const del = <TResponse>(url: string) => api.delete<TResponse>(url).then((res) => res.data);

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  login: (email: string, password: string) => post<{ token: string; user: User }>(joinPath(workflowPaths.auth, 'login'), { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    post<{ token: string; user: User }>(joinPath(workflowPaths.auth, 'register'), data),
  me: () => get<{ user: User }>(joinPath(workflowPaths.auth, 'me')),
  getUsers: () => get<{ users: User[] }>(joinPath(workflowPaths.auth, 'users')),
};

// Products
export const productApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    get<CollectionResponse<'products', Product>>(workflowPaths.products, { params }),
  create: (data: Record<string, unknown>) => post<Product>(workflowPaths.products, data),
};

// Suppliers
export const supplierApi = {
  getAll: () => get<CollectionResponse<'suppliers', Supplier>>(workflowPaths.suppliers),
  create: (data: Record<string, unknown>) => post<Supplier>(workflowPaths.suppliers, data),
};

// Inventory
export const inventoryApi = {
  getAll: () => get<{ inventory: Array<{ product: Product; quantity: number; available: number; reserved: number }> }>(workflowPaths.inventory),
};

// Locations
export const locationApi = {
  getAll: () => get<CollectionResponse<'locations', WarehouseLocation>>(workflowPaths.locations),
  create: (data: Record<string, unknown>) => post<WarehouseLocation>(workflowPaths.locations, data),
};

// P01: Purchase Orders
export const p01Api = {
  getOrders: (params?: PaginatedWorkflowParams<PurchaseOrderStatus | 'ALL'>) =>
    get<CollectionResponse<'orders', PurchaseOrder>>(workflowPaths.orders, { params }),
  getOrder: (id: string) => get<ItemResponse<'order', PurchaseOrder>>(joinPath(workflowPaths.orders, id)),
  createOrder: (data: CreateOrderRequest) => post<PurchaseOrder>(workflowPaths.orders, data),
  sendToAccounting: (id: string) => post<PurchaseOrder>(joinPath(workflowPaths.orders, id, 'send-to-accounting')),
  confirmAccounting: (id: string, notes?: string) =>
    post<PurchaseOrder>(joinPath(workflowPaths.orders, id, 'confirm-accounting'), { notes }),
  sendToDirector: (id: string) => post<PurchaseOrder>(joinPath(workflowPaths.orders, id, 'send-to-director')),
  approve: (id: string, notes?: string) => post<PurchaseOrder>(joinPath(workflowPaths.orders, id, 'approve'), { notes }),
  reject: (id: string, notes: string) => post<PurchaseOrder>(joinPath(workflowPaths.orders, id, 'reject'), { notes }),
  sendToSupplier: (id: string) => post<PurchaseOrder>(joinPath(workflowPaths.orders, id, 'send-to-supplier')),
  supplierResponse: (id: string, confirmed: boolean) =>
    post<PurchaseOrder>(joinPath(workflowPaths.orders, id, 'supplier-response'), { confirmed }),
  complete: (id: string) => post<PurchaseOrder>(joinPath(workflowPaths.orders, id, 'complete')),
  cancel: (id: string) => del<PurchaseOrder>(joinPath(workflowPaths.orders, id)),
};

// P02: Inbound
export const p02Api = {
  getInbounds: (params?: PaginatedWorkflowParams<InboundStatus | 'ALL'>) =>
    get<CollectionResponse<'inbounds', Inbound>>(workflowPaths.inbounds, { params }),
  getInbound: (id: string) => get<ItemResponse<'inbound', Inbound>>(joinPath(workflowPaths.inbounds, id)),
  createInbound: (data: CreateInboundRequest) => post<Inbound>(workflowPaths.inbounds, data),
  receive: (id: string) => post<Inbound>(joinPath(workflowPaths.inbounds, id, 'receive')),
  startQualityCheck: (id: string) => post<Inbound>(joinPath(workflowPaths.inbounds, id, 'quality-check')),
  qc: (id: string, passed: boolean, itemUpdates?: Record<string, unknown>[]) =>  
    post<Inbound>(joinPath(workflowPaths.inbounds, id, 'qc'), { passed, itemUpdates }),
  createBarcodes: (id: string) => post<Inbound>(joinPath(workflowPaths.inbounds, id, 'create-barcodes')),
  assignLocation: (id: string, locationId: string, itemId: string) =>
    post<Inbound>(joinPath(workflowPaths.inbounds, id, 'assign-location'), { locationId, itemId }),
  autoAssignLocation: (id: string) => post<Inbound>(joinPath(workflowPaths.inbounds, id, 'auto-assign-location')),
  complete: (id: string) => post<Inbound>(joinPath(workflowPaths.inbounds, id, 'complete')),
  confirmReceipt: (id: string) => post<Inbound>(joinPath(workflowPaths.inbounds, id, 'confirm-receipt')),
  cancel: (id: string, reason?: string) => post<Inbound>(joinPath(workflowPaths.inbounds, id, 'cancel'), { reason }),
};

// P03: Outbound
export const p03Api = {
  getOutbounds: (params?: PaginatedWorkflowParams<OutboundStatus | 'ALL'>) =>
    get<CollectionResponse<'outbounds', Outbound>>(workflowPaths.outbounds, { params }),
  getOutbound: (id: string) => get<ItemResponse<'outbound', Outbound>>(joinPath(workflowPaths.outbounds, id)),
  createOutbound: (data: CreateOutboundRequest) => post<Outbound>(workflowPaths.outbounds, data),
  checkInventory: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'check-inventory')),
  confirmSufficient: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'confirm-sufficient')),
  markInsufficient: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'mark-insufficient')),
  assignPicking: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'assign-picking')),
  assignPicker: (id: string, pickerId: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'assign-picker'), { pickerId }),
  scanItem: (id: string, productId: string, barcode: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'scan-item'), { productId, barcode }),
  pickCorrect: (id: string, itemId: string, pickedQty: number) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'pick-correct'), { itemId, pickedQty }),
  pickWrong: (id: string, itemId: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'pick-wrong'), { itemId }),
  rescan: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'rescan')),
  putInCart: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'put-in-cart')),
  printSlip: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'print-slip')),
  moveToPacking: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'move-to-packing')),
  recheckInventory: (id: string) => post<Outbound>(joinPath(workflowPaths.outbounds, id, 'check-inventory')),
};

// P04: Packing
export const p04Api = {
  getPackings: (params?: PaginatedWorkflowParams<PackingStatus | 'ALL'>) =>
    get<CollectionResponse<'packings', Packing>>(workflowPaths.packings, { params }),
  getPacking: (id: string) => get<ItemResponse<'packing', Packing>>(joinPath(workflowPaths.packings, id)),
  start: (id: string) => post<Packing>(joinPath(workflowPaths.packings, id, 'start')),
  itemPacked: (id: string, itemId: string) => post<Packing>(joinPath(workflowPaths.packings, id, 'item-packed'), { itemId }),
  packed: (id: string, cartonId?: string, palletId?: string, notes?: string) =>
    post<Packing>(joinPath(workflowPaths.packings, id, 'packed'), { cartonId, palletId, notes }),
  seal: (id: string, weight?: number, dimension?: string) =>
    post<Packing>(joinPath(workflowPaths.packings, id, 'seal'), { weight, dimension }),
  onConveyor: (id: string) => post<Packing>(joinPath(workflowPaths.packings, id, 'on-conveyor')),
  moveToSorting: (id: string) => post<Packing>(joinPath(workflowPaths.packings, id, 'move-to-sorting')),
  updateGrouping: (id: string, cartonId?: string, palletId?: string, notes?: string) =>
    post<Packing>(joinPath(workflowPaths.packings, id, 'update-grouping'), { cartonId, palletId, notes }),
  cancel: (id: string, reason?: string) => post<Packing>(joinPath(workflowPaths.packings, id, 'cancel'), { reason }),
};

// P05: Sorting
export const p05Api = {
  getSortings: (params?: PaginatedWorkflowParams<SortingStatus | 'ALL'>) =>
    get<CollectionResponse<'sortings', Sorting>>(workflowPaths.sortings, { params }),
  getSorting: (id: string) => get<ItemResponse<'sorting', Sorting>>(joinPath(workflowPaths.sortings, id)),
  start: (id: string) => post<Sorting>(joinPath(workflowPaths.sortings, id, 'start')),
  qcCheck: (id: string, passed: boolean, notes?: string) =>
    post<Sorting>(joinPath(workflowPaths.sortings, id, 'qc-check'), { passed, notes }),
  classify: (id: string, sizeCategory?: string, zone?: string, notes?: string) =>
    post<Sorting>(joinPath(workflowPaths.sortings, id, 'classify'), { sizeCategory, zone, notes }),
  complete: (id: string) => post<Sorting>(joinPath(workflowPaths.sortings, id, 'complete')),
};

// P06: Shipping
export const p06Api = {
  getShipments: (params?: PaginatedWorkflowParams<ShippingStatus | 'ALL'>) =>
    get<CollectionResponse<'shipments', Shipment>>(workflowPaths.shipments, { params }),
  getShipment: (id: string) => get<ItemResponse<'shipment', Shipment>>(joinPath(workflowPaths.shipments, id)),
  createShipment: (data: CreateShipmentRequest) => post<Shipment>(workflowPaths.shipments, data),
  selectCarrier: (id: string, carrier: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'select-carrier'), { carrier }),
  createTracking: (id: string, trackingNumber?: string) =>
    post<Shipment>(joinPath(workflowPaths.shipments, id, 'create-tracking'), { trackingNumber }),
  pickup: (id: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'pickup')),
  inTransit: (id: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'in-transit')),
  outForDelivery: (id: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'out-for-delivery')),
  deliver: (id: string, notes?: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'deliver'), { notes }),
  fail: (id: string, reason: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'failed'), { reason }),
  return: (id: string, returnNotes?: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'return'), { returnNotes }),
  retryDelivery: (id: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'retry-delivery')),
  dispatchConfirm: (id: string, notes?: string) => post<Shipment>(joinPath(workflowPaths.shipments, id, 'dispatch-confirm'), { notes }),
  proofOfDelivery: (id: string, payload: Record<string, unknown>) =>
    post<Shipment>(joinPath(workflowPaths.shipments, id, 'proof-of-delivery'), payload),
};

// P07: Inventory Check
export const inventoryCheckApi = {
  getChecks: (params?: PaginatedWorkflowParams<InventoryCheckStatus | 'ALL'>) =>
    get<CollectionResponse<'checks', InventoryCheck>>(workflowPaths.inventoryChecks, { params }),
  getCheck: (id: string) => get<ItemResponse<'check', InventoryCheck>>(joinPath(workflowPaths.inventoryChecks, id)),
  getBlindCount: (id: string) => get<{ items: Array<{ id: string; productId: string; product: Product; countedQty: number; status: string }>; checkNumber: string }>(joinPath(workflowPaths.inventoryChecks, id, 'blind-count')),
  createCheck: (data: CreateInventoryCheckRequest) => post<InventoryCheck>(workflowPaths.inventoryChecks, data),
  start: (id: string) => post<InventoryCheck>(joinPath(workflowPaths.inventoryChecks, id, 'start')),
  count: (id: string, itemId: string, actualQty: number, notes?: string) =>
    post<InventoryCheck>(joinPath(workflowPaths.inventoryChecks, id, 'count'), { itemId, actualQty, notes }),
  recount: (id: string, itemIds: string[], notes?: string) =>
    post<InventoryCheck>(joinPath(workflowPaths.inventoryChecks, id, 'recount'), { itemIds, notes }),
  review: (id: string) => post<{ summary: { totalItems: number; itemsCounted: number; itemsWithDiscrepancy: number; totalPositiveDiscrepancy: number; totalNegativeDiscrepancy: number; netDiscrepancy: number; requiresApproval: boolean }; items: InventoryCheckItem[] }>(joinPath(workflowPaths.inventoryChecks, id, 'review')),
  approve: (id: string, approved: boolean, notes?: string) => post<InventoryCheck>(joinPath(workflowPaths.inventoryChecks, id, 'approve'), { approved, notes }),
  comparison: (id: string) => post<InventoryCheck>(joinPath(workflowPaths.inventoryChecks, id, 'comparison')),
  adjust: (id: string) => post<InventoryCheck>(joinPath(workflowPaths.inventoryChecks, id, 'adjust')),
  complete: (id: string, notes?: string) => post<InventoryCheck>(joinPath(workflowPaths.inventoryChecks, id, 'complete'), { notes }),
};

// Transfers
export const transferApi = {
  getTransfers: (params?: PaginatedWorkflowParams<TransferStatus | 'ALL'>) =>
    get<CollectionResponse<'transfers', Transfer>>(workflowPaths.transfers, { params }),
  getTransfer: (id: string) => get<ItemResponse<'transfer', Transfer>>(joinPath(workflowPaths.transfers, id)),
  request: (data: Record<string, unknown>) => post<{ transferId: string; transferNumber: string; status: TransferStatus; message: string }>(joinPath(workflowPaths.transfers, 'request'), data),
  approve: (id: string, notes?: string) => post<{ transferId: string; transferNumber: string; status: TransferStatus; message: string }>(joinPath(workflowPaths.transfers, id, 'approve'), { notes }),
  dispatch: (id: string, items: Array<{ productId: string; quantity: number }>) =>
    post<{ transferId: string; transferNumber: string; status: TransferStatus; message: string }>(joinPath(workflowPaths.transfers, id, 'dispatch'), { items }),
  receive: (id: string, items: Array<{ productId: string; receivedQuantity: number }>, notes?: string) =>
    post<{ transferId: string; transferNumber: string; status: TransferStatus; message: string }>(joinPath(workflowPaths.transfers, id, 'receive'), { items, notes }),
  exception: (id: string, items: Array<{ productId: string; expectedQuantity: number; actualQuantity: number }>, notes?: string) =>
    post<{ transferId: string; transferNumber: string; status: TransferStatus; message: string; hasDiscrepancy: boolean }>(joinPath(workflowPaths.transfers, id, 'exception'), { items, notes }),
  cancel: (id: string, reason?: string) => post<{ transferId: string; transferNumber: string; status: TransferStatus; message: string }>(joinPath(workflowPaths.transfers, id, 'cancel'), { reason }),
  resolve: (id: string, resolution: 'RESOLVED_SOURCE' | 'RESOLVED_DESTINATION' | 'WRITTEN_OFF', notes?: string) =>
    post<{ reconciliationId: string; status: string; message: string }>(joinPath(workflowPaths.transfers, 'reconciliations', id, 'resolve'), { resolution, notes }),
};

// Reporting
export const reportApi = {
  getMonthly: (params: { month: string; warehouseLocationId?: string; productId?: string; category?: string }) =>
    get<{ report: MonthlyReportPayload; meta: MonthlyReportMeta }>(joinPath(workflowPaths.reports, 'monthly'), { params }),
  closeMonthly: (data: { month: string; warehouseLocationId?: string; productId?: string; category?: string }) =>
    post<{ report: MonthlyReportPayload; meta: MonthlyReportMeta }>(joinPath(workflowPaths.reports, 'monthly', 'close'), data),
  replayMonthly: (data: { month: string; warehouseLocationId?: string; productId?: string; category?: string }) =>
    post<{ report: MonthlyReportPayload; meta: MonthlyReportMeta }>(joinPath(workflowPaths.reports, 'monthly', 'replay'), data),
};

// Events
export const eventApi = {
  getAll: (params?: { process?: string; limit?: number }) => 
    get<CollectionResponse<'events', EventLog>>(workflowPaths.events, { params }),
};

export default api;
