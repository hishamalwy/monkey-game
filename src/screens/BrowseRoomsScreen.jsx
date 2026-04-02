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

  const [joinCode, setJoinCode] = useState('');

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

  const handleManualJoin = async (codeStr) => {
    if (codeStr.length !== 4) return;
    setJoining(codeStr);
    try {
      await joinRoom(codeStr, userProfile);
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '4px solid var(--bg-dark-purple)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={nav.toHome} className="btn btn-yellow" style={{ padding: '8px 14px', fontSize: 14 }}>
          ← رجوع
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0 }}>
          انضم لغرفة 🤝
        </h1>
        <button onClick={loadRooms} className="btn btn-white" style={{ padding: '8px 12px', fontSize: 14 }}>
          🔄
        </button>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Manual Join Section */}
        <section style={{ textAlign: 'center' }}>
           <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', marginBottom: 12 }}>أدخل كود الغرفة</h2>
           <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 10 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="card" style={{
                  width: 50, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 900, background: '#FFF',
                  border: `3px solid ${joinCode.length === i ? 'var(--bg-pink)' : 'var(--bg-dark-purple)'}`,
                  boxShadow: joinCode.length === i ? '4px 4px 0 var(--bg-pink)' : '4px 4px 0 var(--bg-dark-purple)',
                  transition: 'all 0.1s'
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
                style={{
                  position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%'
                }}
              />
           </div>
           {joining && joinCode.length === 4 && <div style={{ marginTop: 10 }}><LoadingSpinner size={20} /></div>}
        </section>

        <div style={{ height: 4, background: 'var(--bg-dark-purple)', opacity: 0.1, borderRadius: 2 }} />

        {/* Public Rooms List */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', marginBottom: 16 }}>
             🌍 غرف عامة متاحة
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading ? (
              <div style={{ marginTop: 20 }}><LoadingSpinner /></div>
            ) : rooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.6 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🏜️</div>
                <p style={{ fontWeight: 900, color: 'var(--bg-dark-purple)', fontSize: 14 }}>لا توجد غرف عامة حالياً</p>
              </div>
            ) : (
              rooms.map(room => {
                const playersCount = room.playerOrder?.length || 0;
                const maxPlayers = room.maxPlayers || 5;
                const isFull = playersCount >= maxPlayers;

                return (
                  <div key={room.code} className="card pop" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, background: '#FFF' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, background: 'var(--bg-dark-purple)', color: '#FFF', padding: '1px 6px', fontWeight: 900 }}>
                           {getModeLabel(room.mode)}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>
                          {room.hostName || 'لاعب'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--bg-pink)' }}>
                        📦 {getCatName(room)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', marginRight: 8 }}>
                       <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--bg-dark-purple)', opacity: 0.6 }}>👥 {playersCount}/{maxPlayers}</div>
                       <button 
                        disabled={isFull || joining}
                        onClick={() => handleJoin(room.code)}
                        className={`btn ${isFull ? 'btn-white' : 'btn-yellow'}`}
                        style={{ padding: '6px 14px', fontSize: 14, minWidth: 70, marginTop: 4 }}
                      >
                        {joining === room.code ? <LoadingSpinner size={12} /> : isFull ? 'كاملة' : 'انضم'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
