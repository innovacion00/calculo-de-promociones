import { useState, useEffect, useCallback } from 'react';
import { api, Tournament } from '../lib/api';
import MatchRow from '../components/MatchRow';
import { surfaceIcon, countryFlag, SURFACES, COUNTRIES } from '../lib/utils';

function TournamentCard({ t, expanded, onToggle }: { t: Tournament; expanded: boolean; onToggle: () => void }) {
  const wins = t.matches?.filter(m => m.result === 'W').length ?? 0;
  const total = t.matches?.length ?? 0;
  const losses = t.matches?.filter(m => m.result === 'L').length ?? 0;

  const santiagoPct = total > 0 ? Math.round((t.matches?.filter(m => m.playerId === 1).length ?? 0) / total * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <button className="w-full text-left p-4" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{t.name}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {countryFlag[t.country] || ''} {t.city}, {t.country} · {surfaceIcon[t.surface] || ''} {t.surface}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t.startDate} → {t.endDate}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-semibold">
              <span className="text-win">{wins}W</span> / <span className="text-loss">{losses}L</span>
            </div>
            <div className="text-xs text-gray-400">{t.level}</div>
            <div className="mt-1 text-gray-400">
              {expanded ? '▲' : '▼'}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-3 flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700">
            <div className="bg-santiago rounded-full" style={{ width: `${santiagoPct}%` }} />
            <div className="bg-nicole rounded-full flex-1" />
          </div>
        )}
        <div className="text-xs text-gray-400 mt-1">
          {t.players} · {total} match{total !== 1 ? 'es' : ''}
        </div>
      </button>
      {expanded && t.matches && (
        <div className="border-t border-gray-100 dark:border-slate-700 px-4 pb-4 pt-2">
          {t.matches.length === 0 ? (
            <div className="text-xs text-gray-400 py-2">No matches recorded</div>
          ) : (
            t.matches.map(m => <MatchRow key={m.id} match={m} showPlayer />)
          )}
        </div>
      )}
    </div>
  );
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('');
  const [filterSurface, setFilterSurface] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', country: 'Colombia', startDate: '', endDate: '', surface: 'Clay', players: 'Both', level: 'Club' });

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filterCountry) params.set('country', filterCountry);
    if (filterPlayer) params.set('player', filterPlayer);
    if (filterSurface) params.set('surface', filterSurface);
    if (filterYear) params.set('year', filterYear);
    api.get(`/tournaments?${params}`).then(r => setTournaments(r.data));
  }, [filterCountry, filterPlayer, filterSurface, filterYear]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/tournaments', form);
    setShowForm(false);
    load();
  }

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl">Tournaments</h1>
        <button onClick={() => setShowForm(s => !s)} className="bg-santiago text-white px-4 py-2 rounded-xl text-sm font-semibold">
          + Add tournament
        </button>
      </div>

      {/* Add tournament form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Name</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tournament name" />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="label">Country</label>
              <select className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start date</label>
              <input className="input" type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">End date</label>
              <input className="input" type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Surface</label>
              <select className="input" value={form.surface} onChange={e => setForm(f => ({ ...f, surface: e.target.value }))}>
                {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Players</label>
              <select className="input" value={form.players} onChange={e => setForm(f => ({ ...f, players: e.target.value }))}>
                <option value="Both">Both</option>
                <option value="Santiago">Santiago</option>
                <option value="Nicole">Nicole</option>
              </select>
            </div>
            <div>
              <label className="label">Level</label>
              <select className="input" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                {['ITF G1','ITF G2','ITF G3','ITF G4','ITF G5','National','Regional','Club'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-santiago text-white rounded-xl py-2 text-sm font-semibold">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <select className="input text-xs" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
          <option value="">All countries</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input text-xs" value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
          <option value="">All players</option>
          <option value="Santiago">Santiago</option>
          <option value="Nicole">Nicole</option>
        </select>
        <select className="input text-xs" value={filterSurface} onChange={e => setFilterSurface(e.target.value)}>
          <option value="">All surfaces</option>
          {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input text-xs" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {tournaments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No tournaments found. Add one above!</div>
        ) : (
          tournaments.map(t => (
            <TournamentCard key={t.id} t={t} expanded={expanded === t.id}
              onToggle={() => setExpanded(e => e === t.id ? null : t.id)} />
          ))
        )}
      </div>
    </div>
  );
}
