import React from 'react';

const TABS = [
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
  { key: 'store', label: 'المتجر', icon: '🛍️' },
  { key: 'leaderboard', label: 'الترتيب', icon: '📊' },
  { key: 'home', label: 'الرئيسية', icon: '🏠' },
];

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onNavigate(tab.key)}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{ 
              background: isActive ? 'var(--bg-pink)' : 'transparent',
              border: 'none', cursor: 'pointer', outline: 'none',
              padding: '6px'
            }}
          >
            <span style={{ fontSize: 24, marginBottom: 2 }}>{tab.icon}</span>
            <span style={{ fontSize: 12 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
