import { STORE_ITEMS, getOwnedAvatars } from '../../utils/store';

export default function AvatarPicker({ selected, onChange, purchases = [], onLockedClick }) {
  const ownedAvatars = getOwnedAvatars(purchases);
  const allAvatars = STORE_ITEMS.avatars || [];

  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
      {allAvatars.map((item) => {
        const isOwned = ownedAvatars.includes(item.avatarId);
        const isActive = selected === item.avatarId;

        return (
          <div key={item.id} style={{ textAlign: 'center' }}>
            <button
              onClick={() => isOwned ? onChange(item.avatarId) : onLockedClick?.()}
              style={{
                width: 76, height: 76, 
                borderRadius: 0,
                overflow: 'hidden',
                background: isActive ? 'var(--neo-pink)' : '#FFF',
                border: isActive ? '4px solid #000' : '3px solid #000',
                boxShadow: isActive ? 'var(--brutal-shadow)' : '4px 4px 0 #000',
                cursor: 'pointer', padding: 0, 
                position: 'relative',
                transition: 'all 0.1s ease',
                transform: isActive ? 'translate(4px, 4px)' : 'none',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}avatars/${item.avatarId}.jpg`}
                alt={`avatar-${item.avatarId}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isOwned ? 1 : 0.3 }}
              />
              {!isOwned && (
                <div style={{
                  position: 'absolute', inset: 0, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.1)'
                }}>
                  <span style={{ fontSize: 24 }}>🔒</span>
                </div>
              )}
            </button>
            <div style={{ fontSize: 11, fontWeight: 900, marginTop: 6, color: '#000' }}>
              {isOwned ? (isActive ? 'مختار' : 'مملوك') : `${item.price} 🪙`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const getAvatarUrl = (idx) => `${import.meta.env.BASE_URL}avatars/${idx ?? 1}.jpg`;
