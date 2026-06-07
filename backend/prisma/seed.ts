import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old data...');
  await prisma.workTask.deleteMany();
  await prisma.lpnItem.deleteMany();
  await prisma.lpn.deleteMany();
  await prisma.inboundReceipt.deleteMany();
  await prisma.location.deleteMany();
  await prisma.productUom.deleteMany();
  await prisma.product.deleteMany();

  console.log('Seeding Products...');
  const p1 = await prisma.product.create({
    data: {
      sku_code: 'SKU-001',
      name: 'Mì Hảo Hảo',
      base_uom: 'Gói',
      ai_total_weight_score: 90
    }
  });

  const p2 = await prisma.product.create({
    data: {
      sku_code: 'SKU-002',
      name: 'Nước khoáng Lavie',
      base_uom: 'Chai',
      ai_total_weight_score: 85
    }
  });

  const p3 = await prisma.product.create({
    data: {
      sku_code: 'SKU-003',
      name: 'Giấy vệ sinh',
      base_uom: 'Cuộn',
      ai_total_weight_score: 40
    }
  });

  console.log('Seeding Locations (2000 Racks)...');
  const rackColsX = [1, 2, 6, 7, 11, 12, 16, 17, 21, 22, 26, 27, 31, 32, 36, 37, 41, 42, 46, 47];
  const rackRowsY = [1, 2, 6, 7, 11, 12, 16, 17];
  
  const locationsData = [];

  for (const x of rackColsX) {
    for (const y of rackRowsY) {
      const zone = y > 10 ? 'A' : 'B';
      for (let z = 1; z <= 4; z++) {
        const slots = ['A', 'B'];
        for (const slot of slots) {
          const locCode = `${zone}-${x.toString().padStart(2, '0')}-${y.toString().padStart(2, '0')}-L${z}-${slot}`;
          locationsData.push({
            location_code: locCode,
            zone: zone,
            coord_x: x,
            coord_y: y,
            level_z: z,
            max_weight_kg: 1000,
            current_weight_kg: 0,
            is_full: false,
            status: 'ACTIVE'
          });
        }
      }
    }
  }

  // Insert in chunks to avoid SQLite limits
  const chunkSize = 500;
  for (let i = 0; i < locationsData.length; i += chunkSize) {
    const chunk = locationsData.slice(i, i + chunkSize);
    await prisma.location.createMany({ data: chunk });
  }

  console.log(`Seeded ${locationsData.length} locations successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
