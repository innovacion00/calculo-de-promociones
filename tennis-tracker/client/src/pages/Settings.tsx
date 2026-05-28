import { useState, useEffect } from 'react';
import { api, Player } from '../lib/api';

export default function Settings() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [editing, setEditing] = useState<Record<number, Partial<Player>>>({});
  const [pin, setPin] = useState('');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [saved, setSaved] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    api.get('/players').then(r => setPlayers(r.data));
    api.get('/settings').then(r => {
      if (r.data.pin) { setPinEnabled(true); }
    });
  }, []);

  function setField(id: number, k: keyof Player, v: string) {
    setEditing(e => ({ ...e, [id]: { ...e[id], [k]: v } }));
  }

  async function savePlayer(id: number) {
    await api.put(`/players/${id}`, editing[id]);
    setSaved('Saved!');
    setTimeout(() => setSaved(''), 2000);
    const r = await api.get('/players');
    setPlayers(r.data);
  }

  async function savePin() {
    if (pinEnabled && pin.length === 4) {
      await api.put('/settings/pin', { value: pin });
    } else if (!pinEnabled) {
      await api.put('/settings/pin', { value: '' });
    }
    setSaved('PIN updated!');
    setTimeout(() => setSaved(''), 2000);
  }

  async function downloadBackup() {
    setBackupLoading(true);
    const r = await api.get('/settings/backup');
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tennis-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setBackupLoading(false);
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await api.post('/settings/restore', data);
    setSaved('Data restored!');
    setTimeout(() => setSaved(''), 2000);
    const r = await api.get('/players');
    setPlayers(r.data);
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-bold text-xl mb-6">Settings</h1>
      {saved && <div className="mb-4 bg-win-light text-win text-sm px-4 py-2 rounded-xl">{saved}</div>}

      {/* Player profiles */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 mb-4">
        <h2 className="font-semibold text-sm mb-4 text-gray-700 dark:text-slate-300">Player profiles</h2>
        {players.map(p => (
          <div key={p.id} className="mb-4 last:mb-0">
            <div className={`text-sm font-medium mb-2 ${p.id === 1 ? 'text-santiago' : 'text-nicole'}`}>{p.name}</div>
            <div className="flex flex-col gap-2">
              <div>
                <label className="label">Name</label>
                <input className="input" defaultValue={p.name}
                  onChange={e => setField(p.id, 'name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Category</label>
                  <select className="input" defaultValue={p.category}
                    onChange={e => setField(p.id, 'category', e.target.value)}>
                    <option value="Sub-18">Sub-18</option>
                    <option value="Sub-12">Sub-12</option>
                    <option value="Sub-14">Sub-14</option>
                    <option value="Sub-16">Sub-16</option>
                  </select>
                </div>
                <div>
                  <label className="label">Birthdate</label>
                  <input className="input" type="date" defaultValue={p.birthdate || ''}
                    onChange={e => setField(p.id, 'birthdate', e.target.value)} />
                </div>
              </div>
              <button onClick={() => savePlayer(p.id)}
                className={`w-full ${p.id === 1 ? 'bg-santiago' : 'bg-nicole'} text-white py-2 rounded-xl text-sm font-semibold`}>
                Save {p.name.split(' ')[0]}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PIN */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 mb-4">
        <h2 className="font-semibold text-sm mb-4 text-gray-700 dark:text-slate-300">PIN lock</h2>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={pinEnabled} onChange={e => setPinEnabled(e.target.checked)} className="w-4 h-4" />
            Enable PIN lock
          </label>
        </div>
        {pinEnabled && (
          <div className="mb-3">
            <label className="label">4-digit PIN</label>
            <input className="input" type="password" maxLength={4} pattern="\d{4}" value={pin}
              onChange={e => setPin(e.target.value)} placeholder="••••" />
          </div>
        )}
        <button onClick={savePin} className="w-full bg-gray-800 dark:bg-slate-600 text-white py-2 rounded-xl text-sm font-semibold">
          Save PIN settings
        </button>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
        <h2 className="font-semibold text-sm mb-4 text-gray-700 dark:text-slate-300">Data backup</h2>
        <div className="flex flex-col gap-2">
          <button onClick={downloadBackup} disabled={backupLoading}
            className="w-full border border-gray-300 dark:border-slate-600 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
            {backupLoading ? 'Exporting...' : '💾 Export full database (JSON)'}
          </button>
          <label className="w-full border border-gray-300 dark:border-slate-600 py-2 rounded-xl text-sm font-semibold text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
            📂 Import backup (JSON)
            <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
          </label>
        </div>
      </div>
    </div>
  );
}
