import React from 'react';

const TABS = [
  { key: 'settings', label: 'الإعدادات', src: 'settings.png' },
  { key: 'store', label: 'المتجر', src: 'shop.png' },
  { key: 'leaderboard', label: 'الترتيب', src: 'leaderboard.png' },
  { key: 'home', label: 'الرئيسية', src: 'home.png' },
];

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="bottom-nav-container">
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onNavigate(tab.key)}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            {isActive && <div className="nav-active-pill" />}
            <img 
              src={`${import.meta.env.BASE_URL}icons/${tab.src}`} 
              alt={tab.label}
              className="icon"
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
            <span className="label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
