import { randomUUID } from 'node:crypto';
import prisma from '../../../../config/db.js';
import { withTransaction } from '../../../../shared/transactions/index.js';

export type AnalysisPeriod = { start: string; end: string };

export type InventorySnapshot = {
  productId: string;
  sku?: string;
  quantity: number;
  minStock?: number;
  category?: string | null;
};

export type MovementPoint = {
  date: string;
  quantity: number;
};

export type BacklogPoint = {
  date: string;
  count: number;
};

export type SlaPoint = {
  date: string;
  breachRate: number; // 0 -> 1
};

export type StaffingPoint = {
  date: string;
  headcount: number;
};

export type AnalyticsDataset = {
  inventory: InventorySnapshot[];
  inbound: MovementPoint[];
  outbound: MovementPoint[];
  backlog: BacklogPoint[];
  sla: SlaPoint[];
  staffing?: StaffingPoint[];
};

export type DetectedIssue = {
  id: string;
  issue: string;
  metric: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  details: string;
};

export type AnalysisResult = {
  warehouseId: string;
  period: AnalysisPeriod;
  issues: DetectedIssue[];
  kpis: {
    averageBacklog: number;
    backlogGrowthRate: number;
    slaBreachRate: number;
    inboundOutboundRatio: number;
    overstockCount: number;
  };
  trends: {
    backlogTrend: 'UP' | 'DOWN' | 'STABLE';
    slaTrend: 'IMPROVING' | 'WORSENING' | 'STABLE';
  };
  generatedAt: string;
  overallScore?: number;
};

export type Proposal = {
  id: string;
  issue: string;
  root_cause: string;
  actions: string[];
  expected_impact: string;
  priority: 'High' | 'Medium' | 'Low';
};

export type GenerateOperationProposalsInput = {
  warehouseId: string;
  analysisPeriod: AnalysisPeriod;
  dataset: AnalyticsDataset;
  userContext?: { id?: string; name?: string; role?: string };
};

function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function parsePeriod(period: AnalysisPeriod) {
  const start = new Date(period.start);
  const end = new Date(period.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('analysis_period phải là ISO date hợp lệ (start/end).');
  }
  if (start >= end) {
    throw new Error('analysis_period.start phải trước analysis_period.end.');
  }
  return { start, end };
}

function normalizeMovements<T extends { date: string }>(points: T[]): T[] {
  return [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function trendFromSeries(values: number[]) {
  if (values.length < 2) return 'STABLE' as const;
  const first = values[0];
  const last = values[values.length - 1];
  const change = (last - first) / Math.max(1, first);
  if (change > 0.1) return 'UP' as const;
  if (change < -0.1) return 'DOWN' as const;
  return 'STABLE' as const;
}

function slaTrendFromSeries(values: number[]) {
  if (values.length < 2) return 'STABLE' as const;
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  if (change > 0.05) return 'WORSENING' as const;
  if (change < -0.05) return 'IMPROVING' as const;
  return 'STABLE' as const;
}

function validatePreconditions(period: AnalysisPeriod, dataset: AnalyticsDataset) {
  const { start, end } = parsePeriod(period);
  const totalDays = daysBetween(start, end);
  if (totalDays < 30) {
    throw new Error('Cần ít nhất 30 ngày dữ liệu để phân tích.');
  }
  if (!dataset.backlog.length || !dataset.sla.length || !dataset.inventory.length) {
    throw new Error('Dataset thiếu backlog, SLA hoặc tồn kho.');
  }
}

function fetchAndPrepareData(dataset: AnalyticsDataset) {
  return {
    inventory: dataset.inventory,
    inbound: normalizeMovements(dataset.inbound),
    outbound: normalizeMovements(dataset.outbound),
    backlog: normalizeMovements(dataset.backlog),
    sla: normalizeMovements(dataset.sla),
    staffing: dataset.staffing ? normalizeMovements(dataset.staffing) : [],
  };
}

function detectIssues(prepared: ReturnType<typeof fetchAndPrepareData>) {
  const backlogCounts = prepared.backlog.map((point) => point.count);
  const avgBacklog = average(backlogCounts);
  const midIndex = Math.floor(backlogCounts.length / 2);
  const firstHalfAvg = average(backlogCounts.slice(0, midIndex));
  const secondHalfAvg = average(backlogCounts.slice(midIndex));
  const backlogGrowthRate = firstHalfAvg === 0 ? 0 : (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

  const inboundTotal = prepared.inbound.reduce((sum, item) => sum + item.quantity, 0);
  const outboundTotal = prepared.outbound.reduce((sum, item) => sum + item.quantity, 0);
  const inboundOutboundRatio = outboundTotal === 0 ? 0 : inboundTotal / outboundTotal;

  const slaRates = prepared.sla.map((point) => point.breachRate);
  const slaBreachRate = average(slaRates);

  const overstockItems = prepared.inventory.filter((item) => {
    const minStock = item.minStock ?? 0;
    return minStock > 0 && item.quantity >= minStock * 2;
  });

  const issues: DetectedIssue[] = [];

  if (backlogGrowthRate > 0.2) {
    issues.push({
      id: randomUUID(),
      issue: `Backlog tăng ${(backlogGrowthRate * 100).toFixed(1)}% so với trung bình`,
      metric: 'BACKLOG_GROWTH',
      severity: 'HIGH',
      details: `Backlog trung bình: ${avgBacklog.toFixed(1)}`,
    });
  }

  if (slaBreachRate > 0.1) {
    issues.push({
      id: randomUUID(),
      issue: `Tỉ lệ SLA breach ${(slaBreachRate * 100).toFixed(1)}%`,
      metric: 'SLA_BREACH',
      severity: slaBreachRate > 0.2 ? 'HIGH' : 'MEDIUM',
      details: `SLA breach trung bình: ${(slaBreachRate * 100).toFixed(1)}%`,
    });
  }

  if (overstockItems.length > 0) {
    issues.push({
      id: randomUUID(),
      issue: `Tồn kho cao ở ${overstockItems.length} sản phẩm`,
      metric: 'OVERSTOCK',
      severity: overstockItems.length > 5 ? 'MEDIUM' : 'LOW',
      details: overstockItems.slice(0, 5).map((item) => item.sku ?? item.productId).join(', '),
    });
  }

  if (inboundOutboundRatio > 1.3) {
    issues.push({
      id: randomUUID(),
      issue: 'Inbound vượt outbound đáng kể',
      metric: 'FLOW_IMBALANCE',
      severity: 'MEDIUM',
      details: `Inbound/Outbound ratio: ${inboundOutboundRatio.toFixed(2)}`,
    });
  }

  return {
    issues,
    avgBacklog,
    backlogGrowthRate,
    slaBreachRate,
    inboundOutboundRatio,
    overstockCount: overstockItems.length,
  };
}

function performRootCauseAnalysis(issues: DetectedIssue[], prepared: ReturnType<typeof fetchAndPrepareData>) {
  const staffingAverage = prepared.staffing.length
    ? average(prepared.staffing.map((point) => point.headcount))
    : null;

  return issues.reduce<Record<string, string>>((acc, issue) => {
    switch (issue.metric) {
      case 'BACKLOG_GROWTH':
        acc[issue.id] = staffingAverage !== null && staffingAverage < 5
          ? 'Nguồn lực xử lý thấp trong giai đoạn cao điểm.'
          : 'Tốc độ xử lý outbound chậm hơn inbound.';
        break;
      case 'SLA_BREACH':
        acc[issue.id] = 'Quy trình xử lý kéo dài hoặc thiếu ưu tiên SLA.';
        break;
      case 'OVERSTOCK':
        acc[issue.id] = 'Kế hoạch inbound chưa cân bằng với nhu cầu outbound.';
        break;
      case 'FLOW_IMBALANCE':
        acc[issue.id] = 'Inbound tăng mạnh nhưng outbound không tăng tương ứng.';
        break;
      default:
        acc[issue.id] = 'Cần phân tích sâu hơn.';
    }
    return acc;
  }, {});
}

function analyzeTrends(prepared: ReturnType<typeof fetchAndPrepareData>) {
  const backlogTrend = trendFromSeries(prepared.backlog.map((point) => point.count));
  const slaTrend = slaTrendFromSeries(prepared.sla.map((point) => point.breachRate));
  return { backlogTrend, slaTrend };
}

function generateProposals(issues: DetectedIssue[], rootCauses: Record<string, string>): Proposal[] {
  return issues.map((issue) => {
    const rootCause = rootCauses[issue.id] ?? 'Chưa xác định';
    const actions: string[] = [];

    switch (issue.metric) {
      case 'BACKLOG_GROWTH':
        actions.push('Tăng nhân lực ca xử lý outbound');
        actions.push('Ưu tiên SKU có backlog cao');
        break;
      case 'SLA_BREACH':
        actions.push('Thiết lập cảnh báo SLA theo giờ');
        actions.push('Tối ưu tuyến xử lý đơn hàng');
        break;
      case 'OVERSTOCK':
        actions.push('Điều chỉnh kế hoạch inbound');
        actions.push('Đẩy chiến dịch xả tồn kho');
        break;
      case 'FLOW_IMBALANCE':
        actions.push('Điều phối inbound theo năng lực outbound');
        actions.push('Chuyển kho một phần hàng tồn');
        break;
      default:
        actions.push('Tổ chức họp rà soát quy trình');
    }

    return {
      id: randomUUID(),
      issue: issue.issue,
      root_cause: rootCause,
      actions,
      expected_impact: 'Giảm backlog 10-20% và cải thiện SLA 5-10%.',
      priority: issue.severity === 'HIGH' ? 'High' : issue.severity === 'MEDIUM' ? 'Medium' : 'Low',
    };
  });
}

function calculateImpactAndPriority(proposals: Proposal[]) {
  return proposals.map((proposal) => {
    if (proposal.priority === 'High') {
      return { ...proposal, expected_impact: 'Giảm backlog 20-30%, cải thiện SLA 10-15%.' };
    }
    if (proposal.priority === 'Medium') {
      return { ...proposal, expected_impact: 'Giảm backlog 10-20%, cải thiện SLA 5-10%.' };
    }
    return { ...proposal, expected_impact: 'Ổn định tồn kho, giảm sai lệch 3-5%.' };
  });
}

async function saveAnalysisResultAndProposals(
  warehouseId: string,
  analysisResult: AnalysisResult,
  proposals: Proposal[],
  userId?: string,
) {
  return withTransaction(async (tx) => {
    const log = await tx.eventLog.create({
      data: {
        eventType: 'ANALYTICS_PROPOSAL_GENERATED',
        process: 'ANALYTICS',
        entityType: 'Warehouse',
        entityId: warehouseId,
        userId: userId ?? null,
        payload: {
          analysisResult,
          proposals,
        },
      },
    });
    return log;
  });
}

export async function generateOperationProposals(input: GenerateOperationProposalsInput) {
  validatePreconditions(input.analysisPeriod, input.dataset);
  const prepared = fetchAndPrepareData(input.dataset);
  const detected = detectIssues(prepared);
  const rootCauses = performRootCauseAnalysis(detected.issues, prepared);
  const trends = analyzeTrends(prepared);
  const proposals = calculateImpactAndPriority(generateProposals(detected.issues, rootCauses));

  const analysisResult: AnalysisResult = {
    warehouseId: input.warehouseId,
    period: input.analysisPeriod,
    issues: detected.issues,
    kpis: {
      averageBacklog: detected.avgBacklog,
      backlogGrowthRate: detected.backlogGrowthRate,
      slaBreachRate: detected.slaBreachRate,
      inboundOutboundRatio: detected.inboundOutboundRatio,
      overstockCount: detected.overstockCount,
    },
    trends,
    generatedAt: new Date().toISOString(),
    overallScore: Math.max(0, 100 - Math.round(detected.slaBreachRate * 100) - Math.round(detected.backlogGrowthRate * 50)),
  };

  const savedLog = await saveAnalysisResultAndProposals(
    input.warehouseId,
    analysisResult,
    proposals,
    input.userContext?.id,
  );

  return {
    analysisResult,
    proposals,
    auditId: savedLog.id,
  };
}