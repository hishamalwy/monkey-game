import { getAvatarUrl } from './AvatarPicker';

export default function UserAvatar({ avatarId, size = 40, style = {} }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 0,
      overflow: 'hidden',
      border: '3px solid #000',
      background: '#FFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '3px 3px 0 #000',
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
