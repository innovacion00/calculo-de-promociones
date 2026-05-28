import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const { country, player, surface, year } = req.query;
  const where: Record<string, unknown> = {};
  if (country) where.country = country;
  if (player) where.players = { contains: player as string };
  if (surface) where.surface = surface;
  if (year) {
    where.startDate = { gte: `${year}-01-01`, lte: `${year}-12-31` };
  }
  const tournaments = await prisma.tournament.findMany({
    where,
    orderBy: { startDate: 'desc' },
    include: { matches: { include: { player: true } } },
  });
  res.json(tournaments);
});

router.post('/', async (req, res) => {
  const tournament = await prisma.tournament.create({ data: req.body });
  res.json(tournament);
});

router.get('/:id', async (req, res) => {
  const t = await prisma.tournament.findUnique({
    where: { id: Number(req.params.id) },
    include: { matches: { include: { player: true } } },
  });
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

router.put('/:id', async (req, res) => {
  const t = await prisma.tournament.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(t);
});

router.delete('/:id', async (req, res) => {
  await prisma.tournament.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

export default router;
