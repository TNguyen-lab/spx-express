import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { withTransaction } from '../../../shared/transactions.js';

type Tx = Prisma.TransactionClient & {
  inventoryMovement: {
    findMany: (args: unknown) => Promise<MovementRecord[]>;
  };
  monthlyReportSnapshot: {
    findUnique: (args: unknown) => Promise<MonthlyReportSnapshotRecord | null>;
    create: (args: unknown) => Promise<MonthlyReportSnapshotRecord>;
    upsert: (args: unknown) => Promise<MonthlyReportSnapshotRecord>;
  };
};

export interface MonthlyReportFilters {
  month: string;
  warehouseLocationId?: string;
  productId?: string;
  category?: string;
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
  filters: MonthlyReportFilters;
  summary: {
    openingStock: number;
    inbound: number;
    outbound: number;
    transferIn: number;
    transferOut: number;
    adjustment: number;
    endingStock: number;
  };
  reconciliation: { expectedEndingStock: number; ledgerEndingStock: number; difference: number; balanced: boolean };
  movements: { count: number; sourceHash: string };
  lines: MonthlyReportLine[];
}

export interface MonthlyReportSnapshotRecord {
  id?: string;
  reportKey: string;
  reportType?: 'MONTHLY_INVENTORY';
  periodKey: string;
  periodStart?: Date;
  periodEnd?: Date;
  closedAt?: Date;
  payload: MonthlyReportPayload | Prisma.JsonValue;
  sourceHash: string;
  sourceMovementCount: number;
  closeRule: string;
  createdAt: Date;
  updatedAt: Date;
}

const CLOSE_RULE = 'Monthly period closes at 00:00:00 UTC on the first day of the following month.';

type MovementRecord = {
  id: string;
  productId: string;
  movementType: string;
  quantity: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  createdAt: Date;
  product: { id: string; sku: string; name: string; category: string | null };
};

type MonthlyReportRow = {
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
};

function parseMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Month must use YYYY-MM format');
  }

  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  return { month, start, end };
}

function reportKey(filters: MonthlyReportFilters) {
  return [filters.month, filters.warehouseLocationId ?? '*', filters.productId ?? '*', filters.category ?? '*'].join('|');
}

function locationMatches(movement: MovementRecord, warehouseLocationId?: string) {
  if (!warehouseLocationId) return true;

  if (movement.movementType === 'ADJUSTMENT') {
    return movement.toLocationId === warehouseLocationId || movement.fromLocationId === warehouseLocationId;
  }

  if (['INBOUND', 'TRANSFER_IN', 'RETURNED'].includes(movement.movementType)) {
    return movement.toLocationId === warehouseLocationId;
  }

  if (['OUTBOUND', 'TRANSFER_OUT', 'DAMAGED'].includes(movement.movementType)) {
    return movement.fromLocationId === warehouseLocationId;
  }

  return false;
}

function signedImpact(movement: MovementRecord) {
  switch (movement.movementType) {
    case 'INBOUND':
    case 'TRANSFER_IN':
    case 'RETURNED':
      return movement.quantity;
    case 'OUTBOUND':
    case 'TRANSFER_OUT':
    case 'DAMAGED':
      return -movement.quantity;
    case 'ADJUSTMENT':
      return movement.quantity;
    default:
      return 0;
  }
}

function emptyRow(product: MovementRecord['product']): MonthlyReportRow {
  return { productId: product.id, sku: product.sku, name: product.name, category: product.category, openingStock: 0, inbound: 0, outbound: 0, transferIn: 0, transferOut: 0, adjustment: 0, endingStock: 0 };
}

function accumulateRow(row: MonthlyReportRow, movement: MovementRecord, inPeriod: boolean) {
  const delta = signedImpact(movement);
  if (!inPeriod) {
    row.openingStock += delta;
    row.endingStock += delta;
    return;
  }

  switch (movement.movementType) {
    case 'INBOUND':
    case 'RETURNED':
      row.inbound += movement.quantity;
      break;
    case 'OUTBOUND':
    case 'DAMAGED':
      row.outbound += movement.quantity;
      break;
    case 'TRANSFER_IN':
      row.transferIn += movement.quantity;
      row.inbound += movement.quantity;
      break;
    case 'TRANSFER_OUT':
      row.transferOut += movement.quantity;
      row.outbound += movement.quantity;
      break;
    case 'ADJUSTMENT':
      row.adjustment += movement.quantity;
      break;
  }

  row.endingStock += delta;
}

function hashMovements(movements: MovementRecord[]) {
  const canonical = movements
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
    .map((movement) => ({ id: movement.id, productId: movement.productId, movementType: movement.movementType, quantity: movement.quantity, fromLocationId: movement.fromLocationId, toLocationId: movement.toLocationId, createdAt: movement.createdAt.toISOString() }));

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function closeAt(period: { end: Date }) {
  return period.end;
}

function toPayload(filters: MonthlyReportFilters, period: { month: string; start: Date; end: Date }, rows: MonthlyReportRow[], sourceHash: string, closedAt: Date, sourceMovementCount: number): MonthlyReportPayload {
  const sortedLines = rows.slice().sort((a, b) => a.productId.localeCompare(b.productId));
  const summary = sortedLines.reduce((acc, row) => ({
    openingStock: acc.openingStock + row.openingStock,
    inbound: acc.inbound + row.inbound,
    outbound: acc.outbound + row.outbound,
    transferIn: acc.transferIn + row.transferIn,
    transferOut: acc.transferOut + row.transferOut,
    adjustment: acc.adjustment + row.adjustment,
    endingStock: acc.endingStock + row.endingStock,
  }), { openingStock: 0, inbound: 0, outbound: 0, transferIn: 0, transferOut: 0, adjustment: 0, endingStock: 0 });

  const expectedEndingStock = summary.openingStock + summary.inbound + summary.adjustment - summary.outbound;
  return {
    reportType: 'MONTHLY_INVENTORY',
    period: { month: period.month, start: period.start.toISOString(), end: period.end.toISOString(), closedAt: closedAt.toISOString() },
    closeRule: CLOSE_RULE,
    filters,
    summary,
    reconciliation: { expectedEndingStock, ledgerEndingStock: summary.endingStock, difference: summary.endingStock - expectedEndingStock, balanced: summary.endingStock === expectedEndingStock },
    movements: { count: sourceMovementCount, sourceHash },
    lines: sortedLines,
  };
}

export async function buildMonthlyReportSnapshot(tx: Tx, filters: MonthlyReportFilters) {
  const period = parseMonth(filters.month);
  const movements = await tx.inventoryMovement.findMany({
    where: {
      createdAt: { lt: period.end },
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.category ? { product: { category: filters.category } } : {}),
    },
    include: { product: { select: { id: true, sku: true, name: true, category: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  }) as MovementRecord[];

  const scopedMovements = movements.filter((movement) => locationMatches(movement, filters.warehouseLocationId));
  const sourceHash = hashMovements(scopedMovements);
  const rows = new Map<string, MonthlyReportRow>();

  for (const movement of scopedMovements) {
    const row = rows.get(movement.productId) ?? emptyRow(movement.product);
    accumulateRow(row, movement, movement.createdAt >= period.start);
    rows.set(movement.productId, row);
  }

  const closedAt = closeAt(period);
  const payload = toPayload(filters, period, [...rows.values()], sourceHash, closedAt, scopedMovements.length);
  return {
    reportKey: reportKey(filters),
    reportType: 'MONTHLY_INVENTORY',
    periodKey: period.month,
    periodStart: period.start,
    periodEnd: period.end,
    closedAt,
    payload,
    sourceHash,
    sourceMovementCount: scopedMovements.length,
    closeRule: CLOSE_RULE,
    createdAt: closedAt,
    updatedAt: closedAt,
  } satisfies MonthlyReportSnapshotRecord;
}

export async function closeMonthlyReport(filters: MonthlyReportFilters, generatedById?: string) {
  return withTransaction(async (tx) => {
    const reportTx = tx as Tx;
    const existing = await reportTx.monthlyReportSnapshot.findUnique({ where: { reportKey: reportKey(filters) } });
    if (existing) return existing as unknown as MonthlyReportSnapshotRecord;

    const snapshot = await buildMonthlyReportSnapshot(reportTx, filters);
    const period = parseMonth(filters.month);

    const created = await reportTx.monthlyReportSnapshot.create({
      data: {
        reportKey: snapshot.reportKey,
        reportType: snapshot.reportType,
        periodKey: snapshot.periodKey,
        periodStart: period.start,
        periodEnd: period.end,
        closedAt: snapshot.closedAt,
        warehouseLocationId: filters.warehouseLocationId ?? null,
        productId: filters.productId ?? null,
        category: filters.category ?? null,
        closeRule: snapshot.closeRule,
        sourceHash: snapshot.sourceHash,
        sourceMovementCount: snapshot.sourceMovementCount,
        payload: snapshot.payload,
        generatedById: generatedById ?? null,
      },
    });

    return created as unknown as MonthlyReportSnapshotRecord;
  });
}

export async function replayMonthlyReport(filters: MonthlyReportFilters, generatedById?: string) {
  return withTransaction(async (tx) => {
    const reportTx = tx as Tx;
    const snapshot = await buildMonthlyReportSnapshot(reportTx, filters);
    const period = parseMonth(filters.month);
    const updated = await reportTx.monthlyReportSnapshot.upsert({
      where: { reportKey: snapshot.reportKey },
      create: {
        reportKey: snapshot.reportKey,
        reportType: snapshot.reportType,
        periodKey: snapshot.periodKey,
        periodStart: period.start,
        periodEnd: period.end,
        closedAt: snapshot.closedAt,
        warehouseLocationId: filters.warehouseLocationId ?? null,
        productId: filters.productId ?? null,
        category: filters.category ?? null,
        closeRule: snapshot.closeRule,
        sourceHash: snapshot.sourceHash,
        sourceMovementCount: snapshot.sourceMovementCount,
        payload: snapshot.payload,
        generatedById: generatedById ?? null,
      },
      update: {
        reportType: snapshot.reportType,
        periodKey: snapshot.periodKey,
        periodStart: period.start,
        periodEnd: period.end,
        closedAt: snapshot.closedAt,
        warehouseLocationId: filters.warehouseLocationId ?? null,
        productId: filters.productId ?? null,
        category: filters.category ?? null,
        closeRule: snapshot.closeRule,
        sourceHash: snapshot.sourceHash,
        sourceMovementCount: snapshot.sourceMovementCount,
        payload: snapshot.payload,
        generatedById: generatedById ?? null,
      },
    });

    return updated as unknown as MonthlyReportSnapshotRecord;
  });
}

export async function getMonthlyReportSnapshot(filters: MonthlyReportFilters) {
  return withTransaction(async (tx) => {
    const reportTx = tx as Tx;
    return reportTx.monthlyReportSnapshot.findUnique({ where: { reportKey: reportKey(filters) } });
  });
}
