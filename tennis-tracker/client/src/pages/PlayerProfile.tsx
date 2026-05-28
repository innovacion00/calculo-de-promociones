import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, Player, PlayerStats, Match, Tournament } from '../lib/api';
import MatchModal from '../components/MatchModal';
import MatchRow from '../components/MatchRow';
import { surfaceIcon } from '../lib/utils';

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const playerId = Number(id);
  const isS = playerId === 1;
  const accent = isS ? 'text-santiago' : 'text-nicole';
  const border = isS ? 'border-santiago' : 'border-nicole';
  const bg = isS ? 'bg-santiago' : 'bg-nicole';

  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [filterTournament, setFilterTournament] = useState('');
  const [filterSurface, setFilterSurface] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = useCallback(async () => {
    const [p, s, ms, ts] = await Promise.all([
      api.get(`/players/${playerId}`).then(r => r.data),
      api.get(`/players/${playerId}/stats`).then(r => r.data),
      api.get(`/matches?playerId=${playerId}`).then(r => r.data),
      api.get('/tournaments').then(r => r.data),
    ]);
    setPlayer(p);
    setStats(s);
    setMatches(ms);
    setTournaments(ts);
  }, [playerId]);

  useEffect(() => { load(); }, [load]);

  const filtered = matches.filter(m => {
    if (filterTournament && m.tournamentId !== Number(filterTournament)) return false;
    if (filterSurface && m.surface !== filterSurface) return false;
    if (filterResult && m.result !== filterResult) return false;
    if (filterFrom && m.date < filterFrom) return false;
    if (filterTo && m.date > filterTo) return false;
    return true;
  });

  // Head-to-head
  const h2h: Record<string, { wins: number; losses: number }> = {};
  for (const m of matches) {
    if (!h2h[m.opponentName]) h2h[m.opponentName] = { wins: 0, losses: 0 };
    if (m.result === 'W') h2h[m.opponentName].wins++;
    if (m.result === 'L') h2h[m.opponentName].losses++;
  }
  const h2hList = Object.entries(h2h).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses)).slice(0, 8);

  if (!player) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className={`flex items-center gap-4 mb-6 p-4 rounded-2xl border-2 ${border} ${isS ? 'bg-santiago-light' : 'bg-nicole-light'}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${bg} text-white`}>{player.name[0]}</div>
        <div>
          <h1 className={`font-bold text-xl ${accent}`}>{player.name}</h1>
          <div className="text-sm text-gray-500 dark:text-slate-400">{player.category} · 🇨🇴 Colombian</div>
        </div>
        <button onClick={() => setShowModal(true)}
          className={`ml-auto ${bg} text-white px-4 py-2 rounded-xl text-sm font-semibold`}>
          + Add match
        </button>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Matches', v: stats.totalMatches },
            { label: 'Wins', v: stats.wins, color: 'text-win' },
            { label: 'Losses', v: stats.losses, color: 'text-loss' },
            { label: 'Win %', v: `${stats.winRate}%`, color: accent },
            { label: 'Tournaments', v: stats.tournamentsPlayed },
            { label: 'Countries', v: stats.countriesPlayed },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
              <div className={`font-bold text-xl ${s.color || ''}`}>{s.v}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Streak */}
      {stats && stats.currentStreak > 0 && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${stats.streakType === 'W' ? 'bg-win-light text-win' : 'bg-loss-light text-loss'}`}>
          🔥 Current streak: {stats.currentStreak} {stats.streakType === 'W' ? 'wins' : 'losses'} in a row · Longest win streak: {stats.longestWinStreak}
        </div>
      )}

      {/* Monthly chart */}
      {stats && stats.monthlyChart.some(m => m.matches > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <h2 className="font-semibold text-sm mb-3">Monthly win rate (last 12 months)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.monthlyChart} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={m => m.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Win rate']} labelFormatter={l => `Month: ${l}`} />
              <Line type="monotone" dataKey="winRate" stroke={isS ? '#3266ad' : '#D4537E'} strokeWidth={2} dot connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Surface stats */}
      {stats && stats.statsBySurface.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <h2 className="font-semibold text-sm mb-3">Stats by surface</h2>
          <div className="flex flex-col gap-2">
            {stats.statsBySurface.map(s => (
              <div key={s.surface} className="flex items-center gap-2">
                <span className="w-6 text-center">{surfaceIcon[s.surface] || '🎾'}</span>
                <span className="text-sm w-20">{s.surface}</span>
                <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${isS ? 'bg-santiago' : 'bg-nicole'}`} style={{ width: `${s.winRate}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-24 text-right">{s.wins}W / {s.matches - s.wins}L · {s.winRate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match history */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <h2 className="font-semibold text-sm mb-3">Match history</h2>
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <select className="input text-xs" value={filterTournament} onChange={e => setFilterTournament(e.target.value)}>
            <option value="">All tournaments</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input text-xs" value={filterSurface} onChange={e => setFilterSurface(e.target.value)}>
            <option value="">All surfaces</option>
            {['Clay', 'Hard', 'Grass', 'Synthetic', 'Variable'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input text-xs" value={filterResult} onChange={e => setFilterResult(e.target.value)}>
            <option value="">All results</option>
            <option value="W">Wins</option>
            <option value="L">Losses</option>
          </select>
          <input className="input text-xs" type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="From" />
        </div>
        {filtered.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">No matches found</div>
        ) : (
          filtered.map(m => <MatchRow key={m.id} match={m} />)
        )}
      </div>

      {/* Head-to-head */}
      {h2hList.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <h2 className="font-semibold text-sm mb-3">Head-to-head records</h2>
          <div className="flex flex-col gap-2">
            {h2hList.map(([name, rec]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="font-medium">{name}</span>
                <span className="text-gray-500 dark:text-slate-400">
                  <span className="text-win font-semibold">{rec.wins}W</span> – <span className="text-loss font-semibold">{rec.losses}L</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && <MatchModal onClose={() => setShowModal(false)} onSaved={load} defaultPlayerId={playerId} />}
    </div>
  );
}
