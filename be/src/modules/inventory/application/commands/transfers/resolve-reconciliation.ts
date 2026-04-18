import { resolveReconciliation as resolveReconciliationService } from './index.js';

export async function resolveReconciliation(tx: Parameters<typeof resolveReconciliationService>[0], input: Parameters<typeof resolveReconciliationService>[1]) {
  return resolveReconciliationService(tx, input);
}
