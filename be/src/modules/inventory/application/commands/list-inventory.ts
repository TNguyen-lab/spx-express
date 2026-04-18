import { listInventory as listInventoryService } from '../queries/inventory-queries.js';

export function listInventory() {
  return listInventoryService();
}
