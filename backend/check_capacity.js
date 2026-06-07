const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function run() {
  const activeLocs = await prisma.location.count({ where: { status: 'ACTIVE' } });
  const allLocs = await prisma.location.count();
  const currentLpns = await prisma.lpn.count({ where: { status: 'STORED' } });
  
  console.log(`Kho hiện tại có ${allLocs} kệ (${activeLocs} kệ ACTIVE).`);
  console.log(`Đang chứa ${currentLpns} pallet.`);
  
  // Create 500 mock pallets for import (JSON)
  const products = await prisma.product.findMany();
  
  const mockData = [];
  for (let i = 0; i < 500; i++) {
    const p = products[Math.floor(Math.random() * products.length)];
    mockData.push({
      pallet_code: `PALLET-IMPORT-${1000 + i}`,
      product_code: p.sku_code,
      quantity: Math.floor(Math.random() * 50) + 10
    });
  }
  
  fs.writeFileSync('500_pallets_import.json', JSON.stringify(mockData, null, 2));
  console.log('Đã tạo file 500_pallets_import.json');
}

run().catch(console.error).finally(() => prisma.$disconnect());
