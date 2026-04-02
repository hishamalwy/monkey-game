import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPublicRooms, joinRoom } from '../firebase/rooms';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';

export default function BrowseRoomsScreen({ nav }) {
  const { userProfile } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null); // code of room being joined
  const [toast, setToast] = useState('');

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await fetchPublicRooms();
      setRooms(data);
    } catch (e) {
      setToast('فشل تحميل الغرف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleJoin = async (code) => {
    setJoining(code);
    try {
      await joinRoom(code, userProfile);
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'فشل الانضمام');
      setJoining(null);
    }
  };

  const getModeLabel = (mode) => {
    if (mode === 'draw') return '🎨 رسم';
    if (mode === 'survival') return '⚔️ بقاء';
    return '🔊 قرد';
  };

  const getCatName = (room) => {
    if (room.mode === 'survival') return 'مسابقة البقاء';
    const cats = room.mode === 'draw' ? drawCategories : appCategories;
    return cats.find(c => c.id === room.category)?.name || room.category;
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '4px solid var(--bg-dark-purple)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={nav.toHome} className="btn btn-yellow" style={{ padding: '8px 14px', fontSize: 14 }}>
          ← رجوع
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0 }}>
          الغرف العامة 🌍
        </h1>
        <button onClick={loadRooms} className="btn btn-white" style={{ padding: '8px 12px', fontSize: 14 }}>
          🔄
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ marginTop: 40 }}><LoadingSpinner /></div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.6 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🏜️</div>
            <p style={{ fontWeight: 900, color: 'var(--bg-dark-purple)' }}>لا توجد غرف عامة حالياً</p>
            <button onClick={nav.toOnlineSetup} className="btn btn-pink" style={{ marginTop: 20 }}>أنشئ غرفتك الخاصة 🚀</button>
          </div>
        ) : (
          rooms.map(room => {
            const playersCount = room.playerOrder?.length || 0;
            const maxPlayers = room.maxPlayers || 5;
            const isFull = playersCount >= maxPlayers;

            return (
              <div key={room.code} className="card pop" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, background: '#FFF' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, background: 'var(--bg-dark-purple)', color: '#FFF', padding: '2px 8px', fontWeight: 900 }}>
                       {getModeLabel(room.mode)}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>
                      غرفة {room.hostName || 'لاعب'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--bg-pink)' }}>
                    📦 {getCatName(room)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--bg-dark-purple)', opacity: 0.7, marginTop: 4 }}>
                    👥 {playersCount} / {maxPlayers} لاعب
                  </div>
                </div>

                <button 
                  disabled={isFull || joining}
                  onClick={() => handleJoin(room.code)}
                  className={`btn ${isFull ? 'btn-white' : 'btn-yellow'}`}
                  style={{ padding: '10px 20px', fontSize: 16, minWidth: 90 }}
                >
                  {joining === room.code ? <LoadingSpinner size={16} /> : isFull ? 'كاملة' : 'انضم'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
