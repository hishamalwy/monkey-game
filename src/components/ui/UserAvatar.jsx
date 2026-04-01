import { getAvatarUrl } from './AvatarPicker';

export default function UserAvatar({ avatarId, size = 40, style = {} }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      border: '2px solid var(--bg-dark-purple)',
      background: 'var(--bg-yellow)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
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
