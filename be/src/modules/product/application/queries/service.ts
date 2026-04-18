import prisma from '../../../../config/db.js';
import { withTransaction } from '../../../../shared/transactions/index.js';

export interface CreateProductInput {
  name: string;
  sku: string;
  description?: string;
  category?: string;
  unit?: string;
  weight?: number;
  dimensions?: string;
  price?: number;
  minStock?: number;
  image?: string;
}

export async function listProducts(search?: string, page = 1, limit = 20) {
  const where: Record<string, unknown> = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await withTransaction(async (tx) => {
    const [items, count] = await Promise.all([
      tx.product.findMany({
        where,
        include: { inventory: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tx.product.count({ where }),
    ]);

    return [items, count] as const;
  });

  return { products, total, page, limit };
}

export function createProduct(input: CreateProductInput) {
  return prisma.product.create({
    data: {
      name: input.name,
      sku: input.sku,
      description: input.description,
      category: input.category,
      unit: input.unit || 'piece',
      weight: input.weight,
      dimensions: input.dimensions,
      price: input.price || 0,
      minStock: input.minStock || 10,
      image: input.image,
    },
  });
}
