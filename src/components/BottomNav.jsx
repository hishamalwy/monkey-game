import React from 'react';

const TABS = [
  { key: 'settings', label: 'الإعدادات', src: 'settings_gear.png' },
  { key: 'store', label: 'المتجر', src: 'treasure_chest.png' },
  { key: 'leaderboard', label: 'الترتيب', src: 'leaderboard.png' },
  { key: 'home', label: 'الرئيسية', src: 'home.png' },
];

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="bottom-nav-container" role="navigation" aria-label="التنقل الرئيسي">
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onNavigate(tab.key)}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <img 
              src={`${import.meta.env.BASE_URL}icons/${tab.src}`} 
              alt={tab.label}
              className="icon"
            />
            <span className="label" style={{ fontWeight: 900 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
