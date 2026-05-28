import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router = Router();
const prisma = new PrismaClient();

async function getMatchesForExport(query: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = Number(query.playerId);
  if (query.tournamentId) where.tournamentId = Number(query.tournamentId);
  if (query.country) where.country = query.country;
  if (query.from || query.to) {
    where.date = {};
    if (query.from) (where.date as Record<string, string>).gte = query.from as string;
    if (query.to) (where.date as Record<string, string>).lte = query.to as string;
  }
  return prisma.match.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { player: true, tournament: true },
  });
}

router.get('/pdf', async (req: Request, res: Response) => {
  const matches = await getMatchesForExport(req.query as Record<string, unknown>);
  const playerId = req.query.playerId ? Number(req.query.playerId) : null;
  const player = playerId ? await prisma.player.findUnique({ where: { id: playerId } }) : null;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="tennis-report.pdf"');

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text('Dussán Tennis Tracker', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Match Report', { align: 'center' });
  doc.moveDown();

  if (player) {
    const wins = matches.filter(m => m.result === 'W').length;
    const total = matches.length;
    doc.fontSize(14).font('Helvetica-Bold').text(`Player: ${player.name}`);
    doc.fontSize(11).font('Helvetica')
      .text(`Category: ${player.category}`)
      .text(`Total matches: ${total}  |  Wins: ${wins}  |  Losses: ${total - wins}  |  Win rate: ${total > 0 ? Math.round(wins / total * 100) : 0}%`);
    doc.moveDown();
  }

  // Table header
  const cols = [60, 90, 55, 50, 90, 60, 50];
  const headers = ['Date', 'Tournament', 'Round', 'Result', 'Opponent', 'Score', 'Surface'];
  let y = doc.y;
  doc.fontSize(9).font('Helvetica-Bold');
  let x = 40;
  headers.forEach((h, i) => { doc.text(h, x, y, { width: cols[i], lineBreak: false }); x += cols[i]; });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  doc.fontSize(8).font('Helvetica');
  for (const m of matches) {
    if (doc.y > 750) { doc.addPage(); }
    y = doc.y;
    x = 40;
    const row = [
      m.date,
      m.tournament?.name || m.city || '-',
      m.round || '-',
      m.result,
      m.opponentName,
      m.score || '-',
      m.surface || '-',
    ];
    row.forEach((cell, i) => {
      doc.text(String(cell), x, y, { width: cols[i], lineBreak: false });
      x += cols[i];
    });
    doc.moveDown(0.5);
  }

  doc.end();
});

router.get('/excel', async (req: Request, res: Response) => {
  const matches = await getMatchesForExport(req.query as Record<string, unknown>);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dussán Tennis Tracker';
  const sheet = workbook.addWorksheet('Matches');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Player', key: 'player', width: 20 },
    { header: 'Tournament', key: 'tournament', width: 25 },
    { header: 'Round', key: 'round', width: 8 },
    { header: 'Result', key: 'result', width: 8 },
    { header: 'Opponent', key: 'opponent', width: 22 },
    { header: 'Opponent Nationality', key: 'opponentNationality', width: 20 },
    { header: 'Score', key: 'score', width: 18 },
    { header: 'Surface', key: 'surface', width: 12 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'Country', key: 'country', width: 12 },
    { header: 'Duration (min)', key: 'duration', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const m of matches) {
    sheet.addRow({
      date: m.date,
      player: m.player.name,
      tournament: m.tournament?.name || '-',
      round: m.round || '-',
      result: m.result,
      opponent: m.opponentName,
      opponentNationality: m.opponentNationality || '-',
      score: m.score || '-',
      surface: m.surface || '-',
      city: m.city || '-',
      country: m.country || '-',
      duration: m.duration || '-',
      notes: m.notes || '-',
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="tennis-matches.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
