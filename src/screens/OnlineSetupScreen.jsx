import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createRoom } from '../firebase/rooms';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';

const MODES = [
  { id: 'monkey', emoji: '🔊', label: 'القرد بيتكلم', active: true },
  { id: 'draw',   emoji: '🎨', label: 'خمن وارسم',    active: true },
  { id: 'soon1',  emoji: '🔒', label: 'قريباً',         soon: true },
  { id: 'soon2',  emoji: '🔒', label: 'قريباً',         soon: true },
];

export default function OnlineSetupScreen({ nav }) {
  const { userProfile } = useAuth();
  const [mode, setMode]               = useState('monkey');
  const [catOpen, setCatOpen]         = useState(false);
  const [maxPlayers, setMaxPlayers]   = useState(5);
  const [timeLimit, setTimeLimit]     = useState(15);
  const [scoreTarget, setScoreTarget] = useState(120);
  const [drawTime, setDrawTime]       = useState(80);
  const [entryFee, setEntryFee]       = useState(100);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState('');

  const currentCategories = mode === 'draw' ? drawCategories : appCategories;
  const [category, setCategory]       = useState(currentCategories[0].id);

  // Synchronize category if mode changes
  const [lastMode, setLastMode] = useState(mode);
  if (mode !== lastMode) {
    setLastMode(mode);
    setCategory(currentCategories[0].id);
  }

  const selectedCat = currentCategories.find(c => c.id === category) || currentCategories[0];

  const handleCreate = async () => {
    setLoading(true);
    try {
      const code = await createRoom(userProfile, { mode, category, timeLimit, maxPlayers, scoreTarget, drawTime, entryFee, wordChoices: 3 });
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 80 }} />
        <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0 }}>
          إنشاء لعبة جديدة
        </h1>
        <button onClick={nav.toHome} className="btn btn-yellow" style={{ padding: '8px 14px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          خروج ←
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Mode selector */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--bg-dark-purple)', textAlign: 'center', marginBottom: 14 }}>
            اختيار المود
          </h2>
          <div style={{ display: 'flex', gap: 10 }}>
            {MODES.map(m => {
              const selected = mode === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => m.active && setMode(m.id)}
                  style={{
                    flex: 1,
                    border: selected ? '4px solid var(--bg-dark-purple)' : 'var(--brutal-border)',
                    background: selected ? 'var(--bg-pink)' : '#FFF',
                    boxShadow: selected ? 'var(--brutal-shadow)' : '3px 3px 0 rgba(45,27,78,0.25)',
                    padding: '10px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    position: 'relative',
                    opacity: m.soon ? 0.5 : 1,
                    cursor: m.active ? 'pointer' : 'not-allowed',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{m.emoji}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 900, textAlign: 'center', lineHeight: 1.25,
                    color: selected ? '#FFF' : 'var(--bg-dark-purple)',
                  }}>
                    {m.label}
                  </span>
                  {m.soon && (
                    <span style={{
                      position: 'absolute', top: -8, left: -6,
                      background: 'var(--bg-dark-purple)', color: '#FFE300',
                      fontSize: 9, fontWeight: 900, padding: '2px 5px',
                      transform: 'rotate(-8deg)',
                    }}>
                      قريباً
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Category picker */}
        <section>
          <button
            onClick={() => setCatOpen(o => !o)}
            style={{
              width: '100%', background: '#FFF',
              border: 'var(--brutal-border)',
              boxShadow: 'var(--brutal-shadow)',
              padding: '12px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: 15,
              color: 'var(--bg-dark-purple)',
            }}
          >
            <span style={{ fontSize: 16, transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            <span>{selectedCat.emoji} {selectedCat.name}</span>
          </button>

          {catOpen && (
            <div className="slide-up" style={{ border: 'var(--brutal-border)', borderTop: 'none', background: '#FFF' }}>
              {currentCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setCatOpen(false); }}
                  style={{
                    width: '100%', padding: '12px 16px', textAlign: 'right',
                    background: category === cat.id ? 'var(--bg-yellow)' : 'transparent',
                    border: 'none', borderBottom: '2px solid rgba(45,27,78,0.1)',
                    fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14,
                    color: 'var(--bg-dark-purple)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
                  }}
                >
                  {cat.name} {cat.emoji}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Player count */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', textAlign: 'center', marginBottom: 10 }}>
            حدد عدد اللاعبين
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {(mode === 'draw' ? [3, 4, 5, 6, 8] : [2, 3, 4, 5, 6]).map(n => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n)}
                className={`btn ${maxPlayers === n ? 'btn-pink' : 'btn-white'}`}
                style={{ flex: 1, padding: '10px 4px', fontSize: 16 }}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Timer — monkey mode only */}
        {mode === 'monkey' && (
          <section>
            <div style={{ display: 'flex', gap: 8 }}>
              {[10, 15, 20, 0].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeLimit(t)}
                  className={`btn ${timeLimit === t ? 'btn-yellow' : 'btn-white'}`}
                  style={{ flex: 1, padding: '10px 4px', fontSize: 14 }}
                >
                  {t === 0 ? '∞' : `${t}s`}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Draw mode settings */}
        {mode === 'draw' && (
          <>
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', textAlign: 'center', marginBottom: 10 }}>
                هدف النقاط للفوز
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {[120, 240, 360, 480].map(n => (
                  <button
                    key={n}
                    onClick={() => setScoreTarget(n)}
                    className={`btn ${scoreTarget === n ? 'btn-pink' : 'btn-white'}`}
                    style={{ flex: 1, padding: '10px 4px', fontSize: 15 }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', textAlign: 'center', marginBottom: 10 }}>
                وقت الرسم
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {[60, 80, 120].map(t => (
                  <button
                    key={t}
                    onClick={() => setDrawTime(t)}
                    className={`btn ${drawTime === t ? 'btn-yellow' : 'btn-white'}`}
                    style={{ flex: 1, padding: '10px 4px', fontSize: 14 }}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', textAlign: 'center', marginBottom: 10 }}>
                سعر دخول الغرفة (كوينز)
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {[0, 100, 500, 1000].map(n => (
                  <button
                    key={n}
                    onClick={() => setEntryFee(n)}
                    className={`btn ${entryFee === n ? 'btn-yellow' : 'btn-white'}`}
                    style={{ flex: 1, padding: '10px 4px', fontSize: 15 }}
                  >
                    {n === 0 ? 'مجاني' : n}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="btn"
          style={{
            width: '100%', padding: '18px', fontSize: '1.2rem',
            background: 'var(--bg-orange)', color: '#FFF',
            marginTop: 'auto',
          }}
        >
          {loading ? <LoadingSpinner size={22} /> : 'تجهيز الغرفة وبدء الانتظار 🚀'}
        </button>

      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
