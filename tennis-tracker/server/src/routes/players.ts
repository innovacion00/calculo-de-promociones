import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const players = await prisma.player.findMany({ where: { active: true } });
  res.json(players);
});

router.get('/:id', async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: Number(req.params.id) } });
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json(player);
});

router.get('/:id/stats', async (req, res) => {
  const id = Number(req.params.id);
  const matches = await prisma.match.findMany({
    where: { playerId: id },
    orderBy: { date: 'desc' },
    include: { tournament: true },
  });

  const wins = matches.filter(m => m.result === 'W').length;
  const losses = matches.filter(m => m.result === 'L').length;
  const total = matches.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Streak
  let currentStreak = 0;
  let streakType: 'W' | 'L' | null = null;
  for (const m of matches) {
    if (m.result !== 'W' && m.result !== 'L') continue;
    if (!streakType) { streakType = m.result as 'W' | 'L'; currentStreak = 1; }
    else if (m.result === streakType) currentStreak++;
    else break;
  }

  // Longest win streak
  let longestWin = 0, cur = 0;
  for (const m of [...matches].reverse()) {
    if (m.result === 'W') { cur++; longestWin = Math.max(longestWin, cur); }
    else cur = 0;
  }

  // Tournaments
  const tIds = new Set(matches.map(m => m.tournamentId).filter(Boolean));
  const countries = new Set(matches.map(m => m.country).filter(Boolean));

  // By surface
  const surfaceMap: Record<string, { matches: number; wins: number }> = {};
  for (const m of matches) {
    const s = m.surface || 'Unknown';
    if (!surfaceMap[s]) surfaceMap[s] = { matches: 0, wins: 0 };
    surfaceMap[s].matches++;
    if (m.result === 'W') surfaceMap[s].wins++;
  }
  const statsBySurface = Object.entries(surfaceMap).map(([surface, d]) => ({
    surface,
    matches: d.matches,
    wins: d.wins,
    winRate: Math.round((d.wins / d.matches) * 100),
  }));

  // Monthly win rate (last 12 months)
  const now = new Date();
  const monthly: Record<string, { wins: number; total: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = { wins: 0, total: 0 };
  }
  for (const m of matches) {
    const key = m.date.substring(0, 7);
    if (monthly[key]) {
      monthly[key].total++;
      if (m.result === 'W') monthly[key].wins++;
    }
  }
  const monthlyChart = Object.entries(monthly).map(([month, d]) => ({
    month,
    winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : null,
    matches: d.total,
  }));

  res.json({
    totalMatches: total,
    wins,
    losses,
    winRate,
    currentStreak,
    streakType,
    longestWinStreak: longestWin,
    tournamentsPlayed: tIds.size,
    countriesPlayed: countries.size,
    statsBySurface,
    monthlyChart,
  });
});

router.put('/:id', async (req, res) => {
  const player = await prisma.player.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(player);
});

export default router;
