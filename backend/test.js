const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.location.count().then(count => {
  console.log('Total locations:', count);
  return prisma.$disconnect();
}).catch(e => {
  console.error(e);
  return prisma.$disconnect();
});
