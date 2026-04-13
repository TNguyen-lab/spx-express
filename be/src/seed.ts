import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create users
  const hashedPassword = bcrypt.hashSync('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@spx.com' },
    update: {},
    create: {
      email: 'admin@spx.com',
      password: hashedPassword,
      name: 'Administrator',
      role: 'ADMIN',
      phone: '0912345678',
    },
  });

  const quality = await prisma.user.upsert({
    where: { email: 'quality@spx.com' },
    update: {},
    create: {
      email: 'quality@spx.com',
      password: hashedPassword,
      name: 'Nguyễn Văn A',
      role: 'QUALITY',
      phone: '0912345679',
    },
  });

  const accounting = await prisma.user.upsert({
    where: { email: 'accounting@spx.com' },
    update: {},
    create: {
      email: 'accounting@spx.com',
      password: hashedPassword,
      name: 'Trần Thị B',
      role: 'ACCOUNTING',
      phone: '0912345680',
    },
  });

  const director = await prisma.user.upsert({
    where: { email: 'director@spx.com' },
    update: {},
    create: {
      email: 'director@spx.com',
      password: hashedPassword,
      name: 'Lê Văn C',
      role: 'WAREHOUSE_DIRECTOR',
      phone: '0912345681',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@spx.com' },
    update: {},
    create: {
      email: 'staff@spx.com',
      password: hashedPassword,
      name: 'Phạm Văn D',
      role: 'STAFF',
      phone: '0912345682',
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: 'driver@spx.com' },
    update: {},
    create: {
      email: 'driver@spx.com',
      password: hashedPassword,
      name: 'Nguyễn Văn E',
      role: 'DRIVER',
      phone: '0912345683',
    },
  });

  console.log('✅ Users created');

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { id: 'supplier-1' },
      update: {},
      create: {
        id: 'supplier-1',
        name: 'Công ty TNHH Điện tử Việt Nam',
        email: 'contact@vietnamelec.com',
        phone: '02412345678',
        address: 'Hà Nội, Việt Nam',
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'supplier-2' },
      update: {},
      create: {
        id: 'supplier-2',
        name: 'Công ty CP Thời trang ABC',
        email: 'info@abcfashion.vn',
        phone: '02812345678',
        address: 'TP. Hồ Chí Minh, Việt Nam',
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'supplier-3' },
      update: {},
      create: {
        id: 'supplier-3',
        name: 'Công ty TNHH TM Gia dụng Toàn Cầu',
        email: 'sales@globalhome.vn',
        phone: '02512345678',
        address: 'Đà Nẵng, Việt Nam',
      },
    }),
  ]);

  console.log('✅ Suppliers created');

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'IPP15P256' },
      update: {},
      create: {
        sku: 'IPP15P256',
        name: 'iPhone 15 Pro 256GB',
        category: 'Điện thoại',
        unit: 'piece',
        weight: 0.171,
        dimensions: '146.6 x 70.6 x 8.25 mm',
        price: 29990000,
        minStock: 10,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'MBA13M3' },
      update: {},
      create: {
        sku: 'MBA13M3',
        name: 'MacBook Air 13" M3',
        category: 'Laptop',
        unit: 'piece',
        weight: 1.24,
        dimensions: '304.1 x 215 x 11.3 mm',
        price: 28990000,
        minStock: 5,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'IPWA1GEN' },
      update: {},
      create: {
        sku: 'IPWA1GEN',
        name: 'Apple Watch Series 9',
        category: 'Đồng hồ thông minh',
        unit: 'piece',
        weight: 0.032,
        dimensions: '45 x 38 x 10.7 mm',
        price: 8990000,
        minStock: 20,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'AIRPODS3' },
      update: {},
      create: {
        sku: 'AIRPODS3',
        name: 'AirPods 3rd Gen',
        category: 'Tai nghe',
        unit: 'piece',
        weight: 0.0577,
        dimensions: '54 x 46.4 x 21.38 mm',
        price: 4990000,
        minStock: 30,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'IPAD10_64' },
      update: {},
      create: {
        sku: 'IPAD10_64',
        name: 'iPad 10th Gen 64GB',
        category: 'Tablet',
        unit: 'piece',
        weight: 0.481,
        dimensions: '248.6 x 179.5 x 7 mm',
        price: 11990000,
        minStock: 15,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SHIRT_M_BLK' },
      update: {},
      create: {
        sku: 'SHIRT_M_BLK',
        name: 'Áo thun nam form regular - Đen',
        category: 'Thời trang',
        unit: 'piece',
        weight: 0.2,
        price: 299000,
        minStock: 100,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'PANTS_KHAKI_32' },
      update: {},
      create: {
        sku: 'PANTS_KHAKI_32',
        name: 'Quần khaki nam 32 - Kaki',
        category: 'Thời trang',
        unit: 'piece',
        weight: 0.4,
        price: 599000,
        minStock: 50,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'JKT_BLK_L' },
      update: {},
      create: {
        sku: 'JKT_BLK_L',
        name: 'Áo khoác nam - Đen L',
        category: 'Thời trang',
        unit: 'piece',
        weight: 0.8,
        price: 1299000,
        minStock: 30,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BLENDER_500W' },
      update: {},
      create: {
        sku: 'BLENDER_500W',
        name: 'Máy xay sinh tố 500W',
        category: 'Gia dụng',
        unit: 'piece',
        weight: 1.5,
        dimensions: '200 x 150 x 300 mm',
        price: 890000,
        minStock: 20,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'KETTLE_1.7L' },
      update: {},
      create: {
        sku: 'KETTLE_1.7L',
        name: 'Bình đun nước 1.7L',
        category: 'Gia dụng',
        unit: 'piece',
        weight: 1.2,
        dimensions: '220 x 180 x 260 mm',
        price: 450000,
        minStock: 30,
      },
    }),
  ]);

  console.log('✅ Products created');

  // Create inventory
  for (const product of products) {
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity: Math.floor(Math.random() * 100) + 20,
        available: Math.floor(Math.random() * 80) + 20,
        costPrice: product.price * 0.7,
      },
    });
  }

  console.log('✅ Inventory created');

  // Create warehouse locations
  const zones = ['A', 'B', 'C', 'D'];
  for (const zone of zones) {
    for (let row = 1; row <= 5; row++) {
      for (let shelf = 1; shelf <= 4; shelf++) {
        await prisma.warehouseLocation.upsert({
          where: { id: `loc-${zone}-${row}-${shelf}` },
          update: {},
          create: {
            id: `loc-${zone}-${row}-${shelf}`,
            zone,
            row,
            shelf,
            capacity: 100,
          },
        });
      }
    }
  }

  console.log('✅ Warehouse locations created');
  console.log('🌿 Seed completed!');
  console.log('');
  console.log('📝 Login credentials:');
  console.log('   admin@spx.com / 123456 (ADMIN)');
  console.log('   quality@spx.com / 123456 (QUALITY)');
  console.log('   accounting@spx.com / 123456 (ACCOUNTING)');
  console.log('   director@spx.com / 123456 (WAREHOUSE_DIRECTOR)');
  console.log('   staff@spx.com / 123456 (STAFF)');
  console.log('   driver@spx.com / 123456 (DRIVER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
