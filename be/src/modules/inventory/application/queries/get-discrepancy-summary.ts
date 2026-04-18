import { getDiscrepancySummary as getDiscrepancySummaryService } from './inventory-queries.js';

export function getDiscrepancySummary(checkId: string) {
  return getDiscrepancySummaryService(checkId);
}
