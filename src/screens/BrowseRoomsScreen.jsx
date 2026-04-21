import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { fetchPublicRooms, joinRoom } from '../firebase/rooms';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import Toast from '../components/ui/Toast';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';
import { useNavigation } from '../hooks/useNavigation';

export default function BrowseRoomsScreen() {
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playClick, playJoin } = useAudio();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [toast, setToast] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [modeFilter, setModeFilter] = useState('all');

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await fetchPublicRooms();
      setRooms(data);
    } catch {
      setToast('فشل تحميل الغرف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, []);

  const handleJoin = async (code) => {
    playClick();
    setJoining(code);
    try {
      await joinRoom(code, userProfile);
      playJoin();
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'فشل الانضمام');
      setJoining(null);
    }
  };

  const getModeLabel = (mode) => {
    if (mode === 'draw') return '🎨 ارسم وخمن';
    if (mode === 'survival') return '⚔️ البقاء';
    if (mode === 'charades') return '🎭 بدون كلام';
    if (mode === 'buzzer') return '🔔 البازر';
    return '🔊 كلكس';
  };

  const getModeColor = (mode) => {
    if (mode === 'draw') return 'var(--neo-cyan)';
    if (mode === 'survival') return 'var(--neo-pink)';
    if (mode === 'charades') return 'var(--neo-purple)';
    if (mode === 'buzzer') return 'var(--neo-cyan)';
    return 'var(--neo-yellow)';
  };

  const getCatName = (room) => {
    if (room.mode === 'survival') return 'ثقافة عامة';
    if (room.mode === 'charades') return 'أفلام ومسلسلات';
    if (room.mode === 'buzzer') return 'سباق البازر';
    const cats = room.mode === 'draw' ? drawCategories : appCategories;
    return cats.find(c => c.id === room.category)?.name || room.category;
  };

  const handleManualJoin = async (codeStr) => {
    if (codeStr.length !== 4) return;
    playClick();
    setJoining(codeStr);
    try {
      await joinRoom(codeStr, userProfile);
      playJoin();
      nav.toLobby(codeStr);
    } catch (e) {
      setToast(e.message || 'كود غير صحيح');
      setJoining(null);
    }
  };

  const handleCodeChange = (val) => {
    const code = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setJoinCode(code);
    if (code.length === 4) handleManualJoin(code);
  };

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      <style>{`
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .refreshing { animation: rotate 0.8s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF', borderBottom: '5px solid #000' }}>
        <button onClick={nav.toHome} className="pop" style={{ background: '#FFF', border: '4.5px solid #000', padding: '10px 18px', fontSize: 13, fontWeight: 900, boxShadow: '4px 4px 0 #000', cursor: 'pointer', borderRadius: 0, transition: 'none' }}>
          ← رجوع
        </button>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>الغرف العامة 🌍</div>
        <button onClick={loadRooms} className="pop" style={{ background: 'var(--neo-cyan)', border: '4.5px solid #000', padding: '8px 14px', fontSize: 20, fontWeight: 900, boxShadow: '4px 4px 0 #000', cursor: 'pointer', borderRadius: 0, transition: 'none' }}>
          <span className={loading ? 'refreshing' : ''} style={{ display: 'inline-block' }}>🔄</span>
        </button>
      </div>

      {/* Code Entry */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{
          background: 'var(--neo-yellow)', border: '5px solid #000',
          boxShadow: '6px 6px 0 #000', padding: '16px',
          borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: 0.1, transform: 'rotate(20deg)', pointerEvents: 'none' }}>🎫</div>

          <h1 style={{ fontSize: 14, fontWeight: 900, color: '#000', marginBottom: 16, textAlign: 'center', marginTop: 0, zIndex: 2, fontStyle: 'italic' }}>
            ادخل كود الغرفة
          </h1>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', direction: 'ltr', justifyContent: 'center', gap: 10, zIndex: 2 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="pop" style={{
                width: 48, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 900, background: '#FFF', color: '#000',
                border: `4px solid ${joinCode.length === i ? 'var(--neo-cyan)' : '#000'}`,
                boxShadow: joinCode.length === i ? '4px 4px 0 var(--neo-cyan)' : '4px 4px 0 rgba(0,0,0,0.1)',
                borderRadius: 0, transition: 'none',
                transform: joinCode.length === i ? 'translateY(-4px)' : 'none'
              }}>
                {joinCode[i] || ''}
              </div>
            ))}
            <input
              type="text"
              autoFocus
              value={joinCode}
              onChange={e => handleCodeChange(e.target.value)}
              maxLength={4}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', direction: 'ltr' }}
            />
          </div>
          {joining && joinCode.length === 4 && (
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
              <LoadingSpinner size={20} color="#000" />
            </div>
          )}
        </div>
        
        {rooms.some(r => (r.playerOrder?.length || 0) < (r.maxPlayers || 5)) && (
          <button
            onClick={() => {
              const availableRoom = rooms.find(r => (r.playerOrder?.length || 0) < (r.maxPlayers || 5));
              if (availableRoom) handleJoin(availableRoom.code);
            }}
            disabled={joining}
            className="pop"
            style={{
              width: '100%', marginTop: 12, padding: '16px', fontSize: 16, fontWeight: 900,
              background: 'var(--neo-green)', color: '#000', border: '4px solid #000',
              boxShadow: '6px 6px 0 #000', borderRadius: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            مباراة سريعة ⚡
          </button>
        )}
      </div>

      {/* Room List */}
      <div className="brutal-bg" style={{ flex: 1, padding: '12px 20px 20px', overflowY: 'auto', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 900, color: '#000', margin: 0, background: 'var(--neo-green)', padding: '2px 8px', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}>
            الغرف المتاحة 👇
          </h2>
        </div>

        {/* Mode Filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'all', emoji: '🌍', label: 'الكل' },
            { id: 'monkey', emoji: '🔊', label: 'كلكس' },
            { id: 'draw', emoji: '🎨', label: 'رسم' },
            { id: 'survival', emoji: '⚔️', label: 'بقاء' },
            { id: 'charades', emoji: '🎭', label: 'تمثيل' },
            { id: 'buzzer', emoji: '🔔', label: 'بازر' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setModeFilter(f.id)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 900,
                background: modeFilter === f.id ? 'var(--neo-yellow)' : '#FFF',
                border: '2.5px solid #000', borderRadius: 0,
                boxShadow: modeFilter === f.id ? 'none' : '2px 2px 0 #000',
                transform: modeFilter === f.id ? 'translate(2px, 2px)' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                whiteSpace: 'nowrap', color: '#000', transition: 'none',
              }}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            <div style={{ marginTop: 40 }}><LoadingSpinner /></div>
          ) : rooms.length === 0 ? (
            <EmptyState
              icon="🏜️"
              title="لا توجد غرف"
              description="لا توجد غرف متاحة حالياً. أنشئ غرفة وادعو أصدقاءك!"
              action={nav.toOnlineSetup}
              actionLabel="أنشئ غرفة 🚀"
            />
          ) : (() => {
            const filtered = rooms.filter(r => modeFilter === 'all' || r.mode === modeFilter);
            return filtered.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="لا توجد غرف بهذا النوع"
                description="جرب فلتر آخر أو أنشئ غرفة جديدة"
                action={() => setModeFilter('all')}
                actionLabel="عرض الكل"
              />
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filtered.map((room, idx) => {
              const playersCount = room.playerOrder?.length || 0;
              const maxPlayers = room.maxPlayers || 5;
              const isFull = playersCount >= maxPlayers;

              return (
                <div
                  key={room.code}
                  className="pop"
                  style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: '#FFF',
                    border: '3px solid #000', boxShadow: '6px 6px 0 #000',
                    borderRadius: 0, animationDelay: `${idx * 100}ms`
                  }}
                >
                  <div style={{
                    width: 44, height: 44,
                    background: getModeColor(room.mode),
                    border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0, borderRadius: 0, boxShadow: '2px 2px 0 #000'
                  }}>
                    {room.mode === 'survival' ? '⚔️' : room.mode === 'draw' ? '🎨' : room.mode === 'charades' ? '🎭' : room.mode === 'buzzer' ? '🔔' : '🔊'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 9, background: '#000', color: 'var(--neo-yellow)', padding: '1px 8px', borderRadius: 0, fontWeight: 900 }}>
                        {getModeLabel(room.mode)}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: '#000', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getCatName(room)}
                    </h3>
                    <div style={{ fontSize: 11, fontWeight: 900, color: '#000', opacity: 0.7 }}>
                      كود: #{room.code} • {playersCount}/{maxPlayers} لاعب
                    </div>
                  </div>

                  <button
                    disabled={isFull || joining}
                    onClick={() => handleJoin(room.code)}
                    className="pop"
                    style={{
                      padding: '10px 20px', fontSize: 14, fontWeight: 900, minWidth: 80,
                      background: isFull ? '#DDD' : 'var(--neo-cyan)',
                      color: '#000',
                      border: '3.5px solid #000',
                      boxShadow: isFull ? 'none' : '4px 4px 0 #000',
                      borderRadius: 0, cursor: isFull ? 'not-allowed' : 'pointer',
                      transition: 'none',
                      transform: joining === room.code ? 'translate(2px, 2px)' : 'none'
                    }}
                  >
                    {joining === room.code ? '...' : isFull ? 'ممتلئة' : 'انضم'}
                  </button>
                </div>
              );
            })}
            </div>
            );
          })()}
         </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
