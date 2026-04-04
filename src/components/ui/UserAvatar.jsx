import { getAvatarUrl } from './AvatarPicker';

export default function UserAvatar({ avatarId, size = 40, style = {} }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '12px',
      overflow: 'hidden',
      border: '3px solid var(--bg-dark-purple)',
      background: '#FFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '2px 2px 0 var(--bg-dark-purple)',
      ...style
    }}>
      <img
        src={getAvatarUrl(avatarId)}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}
