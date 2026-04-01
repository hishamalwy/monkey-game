const AVATARS = ['🐵', '🦊', '🐺', '🦁', '🐯', '🐻'];

export default function AvatarPicker({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
      {AVATARS.map((emoji, idx) => (
        <button
          key={idx}
          onClick={() => onChange(idx)}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            fontSize: 26,
            background: selected === idx ? 'rgba(233,30,140,0.12)' : 'var(--color-card)',
            border: selected === idx ? '3px solid var(--color-primary)' : '2px solid rgba(28,16,64,0.12)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease',
            boxShadow: selected === idx ? '0 0 0 4px var(--color-primary-glow)' : 'none',
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export const AVATAR_EMOJIS = AVATARS;

