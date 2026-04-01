const AVATARS = [0, 1, 2, 3, 4];

export default function AvatarPicker({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
      {AVATARS.map((idx) => (
        <button
          key={idx}
          onClick={() => onChange(idx)}
          style={{
            width: 70, height: 70, borderRadius: '50%',
            overflow: 'hidden',
            background: selected === idx ? 'var(--bg-pink)' : '#FFF',
            border: selected === idx ? '4px solid var(--bg-dark-purple)' : 'var(--brutal-border)',
            boxShadow: selected === idx ? 'var(--brutal-shadow)' : 'none',
            cursor: 'pointer', padding: 0, transition: 'all 0.1s ease',
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL}avatars/${idx}.jpg`}
            alt={`avatar-${idx}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </button>
      ))}
    </div>
  );
}

export const AVATAR_EMOJIS = AVATARS;
export const getAvatarUrl = (idx) => `${import.meta.env.BASE_URL}avatars/${idx ?? 0}.jpg`;
