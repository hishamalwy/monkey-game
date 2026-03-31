const EMOJIS = ['🐵','🦊','🐺','🦁','🐯','🐻','🦝','🐸'];

export default function ScoreBoard({ players, currentPlayerIndex }) {
  return (
    <div style={{
      display: 'flex', gap: 8, justifyContent: 'center',
      padding: '10px 12px', flexWrap: 'wrap',
    }}>
      {players.map((p, idx) => {
        const isCurrent = idx === currentPlayerIndex;
        const qm = p.quarterMonkeys;
        const full = Math.floor(qm / 4);
        const frac = qm % 4;
        const fracLabel = ['', '¼', '½', '¾'][frac];
        const label = full > 0
          ? `${'🐒'.repeat(full)}${fracLabel}`
          : (frac > 0 ? fracLabel : '—');

        return (
          <div key={p.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 14px',
            background: isCurrent ? 'rgba(233,30,140,0.12)' : 'rgba(255,255,255,0.6)',
            border: isCurrent ? '2px solid var(--color-primary)' : '2px solid rgba(28,16,64,0.08)',
            borderRadius: 14,
            transition: 'all 0.3s ease',
            boxShadow: isCurrent ? '0 0 20px var(--color-primary-glow)' : 'none',
            minWidth: 64,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>
              {p.avatarEmoji || EMOJIS[idx % EMOJIS.length]}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, marginTop: 4,
              color: isCurrent ? 'var(--color-primary)' : 'var(--color-header)',
              maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'center',
            }}>{p.name}</span>
            <span style={{
              fontSize: 12, marginTop: 3,
              color: qm > 0 ? 'var(--color-secondary)' : 'var(--color-muted)',
              fontWeight: 700,
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
