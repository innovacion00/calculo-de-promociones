// Sidebar de navegación (isla React). Port de getAvailableModulesForUser + sidebarRebuild.
// Cada módulo es una ruta Astro propia, así que los items son enlaces <a>.
import { useState } from 'react';
import { getAvailableModules, MODULE_ROUTES } from '../../lib/session.js';

/**
 * @param {{ session: import('../../lib/session.js').Session, activeModule?: string }} props
 */
export default function Sidebar({ session, activeModule }) {
  const [collapsed, setCollapsed] = useState(
    typeof localStorage !== 'undefined' && localStorage.getItem('rmd_sidebar_collapsed') === '1',
  );

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rmd_sidebar_collapsed', next ? '1' : '0');
      } catch { /* ignore */ }
      return next;
    });
  };

  const groups = getAvailableModules(session);

  return (
    <aside className={`main-sidebar${collapsed ? ' sb-collapsed' : ''}`}>
      <div className="sb-toggle-btn">
        <button onClick={toggle} title="Colapsar/expandir menú">{collapsed ? '▶' : '◀'}</button>
      </div>
      <nav className="sb-nav">
        {groups.map((group) => (
          <div className="sb-group" key={group.group}>
            <div className="sb-group-label">{group.group}</div>
            {group.items.map((item) => {
              const label = (
                <>
                  <span className="sb-item-icon">{item.icon}</span>
                  <span className="sb-item-label">{item.label}</span>
                </>
              );
              if (item.future) {
                return (
                  <span className="sb-item sb-item-future" data-tooltip={item.label} key={item.id}>
                    {label}
                  </span>
                );
              }
              const href = MODULE_ROUTES[item.id] ?? '#';
              const isActive = item.id === activeModule;
              return (
                <a
                  className={`sb-item${isActive ? ' active' : ''}`}
                  data-tooltip={item.label}
                  href={href}
                  key={item.id}
                >
                  {label}
                </a>
              );
            })}
            <hr className="sb-divider" />
          </div>
        ))}
      </nav>
    </aside>
  );
}
