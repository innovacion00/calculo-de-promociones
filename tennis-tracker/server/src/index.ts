import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import playersRouter from './routes/players';
import tournamentsRouter from './routes/tournaments';
import matchesRouter from './routes/matches';
import reportsRouter from './routes/reports';
import settingsRouter from './routes/settings';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/players', playersRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { prisma };
