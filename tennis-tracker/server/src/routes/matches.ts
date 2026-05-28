import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const { playerId, tournamentId, result, surface, from, to, limit } = req.query;
  const where: Record<string, unknown> = {};
  if (playerId) where.playerId = Number(playerId);
  if (tournamentId) where.tournamentId = Number(tournamentId);
  if (result) where.result = result;
  if (surface) where.surface = surface;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, string>).gte = from as string;
    if (to) (where.date as Record<string, string>).lte = to as string;
  }
  const matches = await prisma.match.findMany({
    where,
    orderBy: { date: 'desc' },
    take: limit ? Number(limit) : undefined,
    include: { player: true, tournament: true },
  });
  res.json(matches);
});

router.post('/', async (req, res) => {
  const match = await prisma.match.create({
    data: req.body,
    include: { player: true, tournament: true },
  });
  res.json(match);
});

router.get('/:id', async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: Number(req.params.id) },
    include: { player: true, tournament: true },
  });
  if (!match) return res.status(404).json({ error: 'Not found' });
  res.json(match);
});

router.put('/:id', async (req, res) => {
  const match = await prisma.match.update({
    where: { id: Number(req.params.id) },
    data: req.body,
    include: { player: true, tournament: true },
  });
  res.json(match);
});

router.delete('/:id', async (req, res) => {
  await prisma.match.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

export default router;
