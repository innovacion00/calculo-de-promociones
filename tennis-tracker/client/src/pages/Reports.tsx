import { useState } from 'react';

export default function Reports() {
  const [playerId, setPlayerId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  function buildParams() {
    const p = new URLSearchParams();
    if (playerId) p.set('playerId', playerId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (country) p.set('country', country);
    return p.toString();
  }

  async function download(type: 'pdf' | 'excel') {
    setLoading(type);
    const url = `/api/reports/${type}?${buildParams()}`;
    const resp = await fetch(url);
    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = type === 'pdf' ? 'tennis-report.pdf' : 'tennis-matches.xlsx';
    a.click();
    setLoading(null);
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-bold text-xl mb-6">Reports</h1>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-4">
        <h2 className="font-semibold text-sm text-gray-700 dark:text-slate-300">Filter before export</h2>

        <div>
          <label className="label">Player</label>
          <select className="input" value={playerId} onChange={e => setPlayerId(e.target.value)}>
            <option value="">Both players</option>
            <option value="1">Santiago Dussán</option>
            <option value="2">Nicole Dussán</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">From date</label>
            <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To date</label>
            <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Country</label>
          <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
            <option value="">All countries</option>
            <option value="Colombia">Colombia 🇨🇴</option>
            <option value="USA">USA 🇺🇸</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <button onClick={() => download('pdf')} disabled={loading !== null}
            className="w-full bg-loss text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading === 'pdf' ? 'Generating...' : '📄 Export PDF report'}
          </button>
          <button onClick={() => download('excel')} disabled={loading !== null}
            className="w-full bg-win text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading === 'excel' ? 'Generating...' : '📊 Export Excel spreadsheet'}
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400 dark:text-slate-500 text-center">
        PDF includes player summary card + full match history table.<br />
        Excel includes all raw match fields.
      </div>
    </div>
  );
}
