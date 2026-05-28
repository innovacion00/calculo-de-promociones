import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.player.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Santiago Dussán',
      category: 'Sub-18',
      birthdate: '2007-01-01',
      nationality: 'Colombian',
      active: true,
    },
  });

  await prisma.player.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Nicole Dussán',
      category: 'Sub-12',
      birthdate: '2013-01-01',
      nationality: 'Colombian',
      active: true,
    },
  });

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
