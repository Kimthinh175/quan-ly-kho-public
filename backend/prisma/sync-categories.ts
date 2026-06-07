import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu đồng bộ Category...');

  // Tạo 3 Category mặc định
  const catFood = await prisma.category.upsert({
    where: { code: 'FOOD' },
    update: {},
    create: { code: 'FOOD', name: 'Thực phẩm', description: 'Đồ ăn các loại' }
  });

  const catDrink = await prisma.category.upsert({
    where: { code: 'DRINK' },
    update: {},
    create: { code: 'DRINK', name: 'Đồ uống', description: 'Nước giải khát' }
  });

  const catHome = await prisma.category.upsert({
    where: { code: 'HOME' },
    update: {},
    create: { code: 'HOME', name: 'Gia dụng', description: 'Đồ dùng gia đình' }
  });

  // Đồng bộ Product hiện tại
  console.log('Gán Category cho Products cũ...');
  
  await prisma.product.updateMany({
    where: { sku_code: 'SKU-001' },
    data: { category_id: catFood.id }
  });

  await prisma.product.updateMany({
    where: { sku_code: 'SKU-002' },
    data: { category_id: catDrink.id }
  });

  await prisma.product.updateMany({
    where: { sku_code: 'SKU-003' },
    data: { category_id: catHome.id }
  });

  console.log('Đồng bộ thành công!');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
