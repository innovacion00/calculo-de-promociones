import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const settings = await prisma.settings.findMany();
  const obj: Record<string, string> = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json(obj);
});

router.put('/:key', async (req, res) => {
  const s = await prisma.settings.upsert({
    where: { key: req.params.key },
    update: { value: req.body.value },
    create: { key: req.params.key, value: req.body.value },
  });
  res.json(s);
});

router.get('/backup', async (_req, res) => {
  const players = await prisma.player.findMany();
  const tournaments = await prisma.tournament.findMany();
  const matches = await prisma.match.findMany();
  const settings = await prisma.settings.findMany();
  res.json({ players, tournaments, matches, settings });
});

router.post('/restore', async (req, res) => {
  const { players, tournaments, matches, settings } = req.body;
  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany();
    await tx.tournament.deleteMany();
    await tx.player.deleteMany();
    await tx.settings.deleteMany();
    if (players) await tx.player.createMany({ data: players });
    if (tournaments) await tx.tournament.createMany({ data: tournaments });
    if (matches) await tx.match.createMany({ data: matches });
    if (settings) await tx.settings.createMany({ data: settings });
  });
  res.json({ ok: true });
});

export default router;
