const TABS = [
  { key: 'home', label: 'الرئيسية', icon: '🏠' },
  { key: 'leaderboard', label: 'المتصدرين', icon: '🏆' },
  { key: 'friends', label: 'الأصدقاء', icon: '👫' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="bottom-nav" style={{
      display: 'flex', justifyContent: 'space-around',
      padding: '8px 0 12px',
      flexShrink: 0,
    }}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onNavigate(tab.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 12px', borderRadius: 10,
              opacity: isActive ? 1 : 0.5,
              transition: 'opacity 0.15s',
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{
              fontSize: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 700,
              color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
            }}>{tab.label}</span>
            {isActive && (
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-primary)' }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
