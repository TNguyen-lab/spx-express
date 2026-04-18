import prisma from '../../../../config/db.js';

export interface CreateSupplierInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function listSuppliers() {
  return prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export function createSupplier(input: CreateSupplierInput) {
  return prisma.supplier.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
    },
  });
}
