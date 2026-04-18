import { listTransfers as listTransfersService } from '../commands/transfers/index.js';

export function listTransfers(filters: Parameters<typeof listTransfersService>[0]) {
  return listTransfersService(filters);
}
