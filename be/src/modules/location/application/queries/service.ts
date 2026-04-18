import prisma from '../../../../config/db.js';

export interface CreateLocationInput {
  zone: string;
  row: number;
  shelf: number;
  position?: number;
  capacity?: number;
}

export function listLocations() {
  return prisma.warehouseLocation.findMany({
    where: { isActive: true },
    orderBy: [{ zone: 'asc' }, { row: 'asc' }, { shelf: 'asc' }],
  });
}

export function createLocation(input: CreateLocationInput) {
  return prisma.warehouseLocation.create({
    data: {
      zone: input.zone,
      row: input.row,
      shelf: input.shelf,
      position: input.position ?? null,
      capacity: input.capacity || 100,
    },
  });
}
