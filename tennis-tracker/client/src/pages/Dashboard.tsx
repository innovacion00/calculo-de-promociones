import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, Player, PlayerStats, Match } from '../lib/api';
import MatchModal from '../components/MatchModal';
import MatchRow from '../components/MatchRow';

function PlayerCard({ player, stats }: { player: Player; stats: PlayerStats | null }) {
  const isS = player.id === 1;
  const color = isS ? 'border-santiago bg-santiago-light' : 'border-nicole bg-nicole-light';
  const textColor = isS ? 'text-santiago' : 'text-nicole';
  const streak = stats?.currentStreak ?? 0;
  const streakType = stats?.streakType;

  return (
    <Link to={`/player/${player.id}`} className={`block border-2 ${color} rounded-2xl p-4 flex-1 min-w-0`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${isS ? 'bg-santiago text-white' : 'bg-nicole text-white'}`}>
          {player.name[0]}
        </div>
        <div className="min-w-0">
          <div className={`font-bold text-sm ${textColor} truncate`}>{player.name}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">{player.category} · 🇨🇴</div>
        </div>
        {streak > 0 && (
          <div className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${streakType === 'W' ? 'bg-win-light text-win' : 'bg-loss-light text-loss'}`}>
            🔥 {streak} {streakType === 'W' ? 'W' : 'L'}
          </div>
        )}
      </div>
      {stats ? (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Matches" value={stats.totalMatches} />
          <Stat label="Wins" value={stats.wins} color="text-win" />
          <Stat label="Win %" value={`${stats.winRate}%`} color={textColor} />
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-2">No matches yet</div>
      )}
    </Link>
  );
}

function Stat({ label, value, color = '' }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div className={`font-bold text-lg leading-none ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<number, PlayerStats>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    const [ps, ms] = await Promise.all([
      api.get('/players').then(r => r.data as Player[]),
      api.get('/matches?limit=8').then(r => r.data as Match[]),
    ]);
    setPlayers(ps);
    setMatches(ms);
    const statsMap: Record<number, PlayerStats> = {};
    await Promise.all(ps.map(async p => {
      statsMap[p.id] = (await api.get(`/players/${p.id}/stats`)).data;
    }));
    setStats(statsMap);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl">Dashboard</h1>
        <button onClick={() => setShowModal(true)}
          className="bg-santiago text-white px-4 py-2 rounded-xl text-sm font-semibold">
          + Add match
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        {players.map(p => (
          <PlayerCard key={p.id} player={p} stats={stats[p.id] ?? null} />
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
        <h2 className="font-semibold text-sm mb-3 text-gray-700 dark:text-slate-300">Recent matches</h2>
        {matches.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">No matches recorded yet. Add your first match!</div>
        ) : (
          matches.map(m => <MatchRow key={m.id} match={m} showPlayer />)
        )}
      </div>

      {showModal && <MatchModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
