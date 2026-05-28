import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PlayerProfile from './pages/PlayerProfile';
import Tournaments from './pages/Tournaments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { useState, useEffect } from 'react';

function BottomNav() {
  const location = useLocation();
  const tabs = [
    { to: '/', label: 'Dashboard', icon: '🏠' },
    { to: '/player/1', label: 'Santiago', icon: '🎾' },
    { to: '/player/2', label: 'Nicole', icon: '🎾' },
    { to: '/tournaments', label: 'Tournaments', icon: '🏆' },
    { to: '/reports', label: 'Reports', icon: '📊' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex z-40 md:hidden">
      {tabs.map(t => {
        const active = t.to === '/' ? location.pathname === '/' : location.pathname.startsWith(t.to);
        return (
          <NavLink key={t.to} to={t.to} className={`flex-1 flex flex-col items-center py-2 text-xs ${active ? 'text-santiago font-semibold' : 'text-gray-500 dark:text-slate-400'}`}>
            <span className="text-lg">{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function SideNav() {
  const tabs = [
    { to: '/', label: 'Dashboard', icon: '🏠' },
    { to: '/player/1', label: 'Santiago', icon: '🎾' },
    { to: '/player/2', label: 'Nicole', icon: '🎾' },
    { to: '/tournaments', label: 'Tournaments', icon: '🏆' },
    { to: '/reports', label: 'Reports', icon: '📊' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];
  return (
    <nav className="hidden md:flex flex-col w-56 min-h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 p-4 gap-1 fixed">
      <div className="font-bold text-lg mb-4 text-santiago dark:text-white">🎾 Dussán Tennis</div>
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-santiago-light text-santiago font-semibold dark:bg-slate-700 dark:text-white' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`
          }>
          <span>{t.icon}</span>{t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        <SideNav />
        <div className="md:ml-56 pb-16 md:pb-0">
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 md:hidden bg-white dark:bg-slate-900">
            <span className="font-bold text-santiago dark:text-white">🎾 Dussán Tennis Tracker</span>
            <button onClick={() => setDark(d => !d)} className="text-xl">{dark ? '☀️' : '🌙'}</button>
          </header>
          <header className="hidden md:flex items-center justify-end px-6 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <button onClick={() => setDark(d => !d)} className="text-xl">{dark ? '☀️' : '🌙'}</button>
          </header>
          <main className="p-4 md:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/player/:id" element={<PlayerProfile />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
