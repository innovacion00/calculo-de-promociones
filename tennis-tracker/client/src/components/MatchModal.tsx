import { useState, useEffect } from 'react';
import { api, Tournament } from '../lib/api';
import { ROUNDS, SURFACES, COUNTRIES, SCORE_REGEX } from '../lib/utils';

type Props = {
  onClose: () => void;
  onSaved: () => void;
  defaultPlayerId?: number;
};

const emptyForm = {
  playerId: '',
  result: 'W',
  tournamentId: '',
  tournamentName: '',
  city: '',
  country: 'Colombia',
  surface: 'Clay',
  opponentName: '',
  opponentNationality: '',
  score: '',
  round: '1R',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  duration: '',
};

export default function MatchModal({ onClose, onSaved, defaultPlayerId }: Props) {
  const [form, setForm] = useState({ ...emptyForm, playerId: defaultPlayerId ? String(defaultPlayerId) : '' });
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    api.get('/tournaments').then(r => setTournaments(r.data));
  }, []);

  const suggestions = tournaments.filter(t =>
    t.name.toLowerCase().includes(tournamentSearch.toLowerCase())
  ).slice(0, 5);

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.playerId) e.playerId = 'Required';
    if (!form.opponentName.trim()) e.opponentName = 'Required';
    if (!form.date) e.date = 'Required';
    if (form.score && !SCORE_REGEX.test(form.score.trim())) {
      e.score = 'Format: "6-3" or "6-3, 4-6, 7-5"';
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    let tournamentId = form.tournamentId ? Number(form.tournamentId) : undefined;

    // Create tournament on the fly if name given but no id
    if (!tournamentId && tournamentSearch.trim()) {
      const t = await api.post('/tournaments', {
        name: tournamentSearch.trim(),
        city: form.city || 'Unknown',
        country: form.country,
        startDate: form.date,
        endDate: form.date,
        surface: form.surface,
        players: form.playerId === '1' ? 'Santiago' : 'Nicole',
        level: 'Club',
      });
      tournamentId = t.data.id;
    }

    await api.post('/matches', {
      playerId: Number(form.playerId),
      tournamentId: tournamentId || undefined,
      date: form.date,
      result: form.result,
      opponentName: form.opponentName.trim(),
      opponentNationality: form.opponentNationality || undefined,
      score: form.score.trim() || undefined,
      round: form.round,
      surface: form.surface,
      city: form.city || undefined,
      country: form.country,
      notes: form.notes || undefined,
      duration: form.duration ? Number(form.duration) : undefined,
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800">
          <h2 className="font-semibold text-base">Add match</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          {/* Player */}
          <div>
            <label className="label">Player</label>
            <select className="input" value={form.playerId} onChange={e => set('playerId', e.target.value)}>
              <option value="">Select player</option>
              <option value="1">Santiago Dussán (Sub-18)</option>
              <option value="2">Nicole Dussán (Sub-12)</option>
            </select>
            {errors.playerId && <p className="text-red-500 text-xs mt-1">{errors.playerId}</p>}
          </div>

          {/* Date & Result */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="label">Result</label>
              <select className="input" value={form.result} onChange={e => set('result', e.target.value)}>
                <option value="W">W – Win</option>
                <option value="L">L – Loss</option>
                <option value="WO">WO – Walkover</option>
                <option value="P">P – Pending</option>
              </select>
            </div>
          </div>

          {/* Tournament */}
          <div className="relative">
            <label className="label">Tournament (optional)</label>
            <input
              className="input"
              placeholder="Search or create tournament..."
              value={tournamentSearch}
              onChange={e => { setTournamentSearch(e.target.value); setShowSuggestions(true); set('tournamentId', ''); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg mt-1 max-h-40 overflow-y-auto">
                {suggestions.map(t => (
                  <button type="button" key={t.id} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-600 text-sm"
                    onClick={() => { setTournamentSearch(t.name); set('tournamentId', String(t.id)); set('city', t.city); set('country', t.country); set('surface', t.surface); setShowSuggestions(false); }}>
                    {t.name} — {t.city}, {t.country}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Round & Surface */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Round</label>
              <select className="input" value={form.round} onChange={e => set('round', e.target.value)}>
                {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Surface</label>
              <select className="input" value={form.surface} onChange={e => set('surface', e.target.value)}>
                {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* City & Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Bogotá" />
            </div>
            <div>
              <label className="label">Country</label>
              <select className="input" value={form.country} onChange={e => set('country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Opponent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Opponent name</label>
              <input className="input" value={form.opponentName} onChange={e => set('opponentName', e.target.value)} placeholder="J. Pérez" />
              {errors.opponentName && <p className="text-red-500 text-xs mt-1">{errors.opponentName}</p>}
            </div>
            <div>
              <label className="label">Opponent nationality</label>
              <input className="input" value={form.opponentNationality} onChange={e => set('opponentNationality', e.target.value)} placeholder="Colombian" />
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="label">Score</label>
            <input className="input" value={form.score} onChange={e => set('score', e.target.value)} placeholder='6-3, 4-6, 7-5' />
            {errors.score && <p className="text-red-500 text-xs mt-1">{errors.score}</p>}
          </div>

          {/* Duration & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duration (min)</label>
              <input className="input" type="number" value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="90" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-santiago text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50 mt-1">
            {saving ? 'Saving...' : 'Save match'}
          </button>
        </form>
      </div>
    </div>
  );
}
