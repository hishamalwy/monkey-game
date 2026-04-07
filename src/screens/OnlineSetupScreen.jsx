import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createRoom } from '../firebase/rooms';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { useNavigation } from '../hooks/useNavigation';

const MODES = [
  { id: 'monkey', emoji: '🔊', label: 'كلكس!', active: true, desc: 'تحدي سريع' },
  { id: 'draw',   emoji: '🎨', label: 'ارسم',    active: true, desc: 'خمن وارسم' },
  { id: 'survival', emoji: '⚔️', label: 'بقاء', active: true, desc: 'بقاء وأقوى' },
  { id: 'charades', emoji: '🎭', label: 'تمثيل', active: true, desc: 'تمثيل صامت' },
];

export default function OnlineSetupScreen() {
  const nav = useNavigation();
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
  const [modeOpen, setModeOpen]       = useState(false);
  const [isPublic, setIsPublic]       = useState(true);
  const [charadesScoreTarget, setCharadesScoreTarget] = useState(20);

  const currentCategories = mode === 'draw' ? drawCategories : appCategories;
  const [category, setCategory]       = useState(currentCategories[0].id);

  const [lastMode, setLastMode] = useState(mode);
  if (mode !== lastMode) {
    setLastMode(mode);
    setCategory(currentCategories[0].id);
  }

  const selectedCat = currentCategories.find(c => c.id === category) || currentCategories[0];

  const handleCreate = async () => {
    setLoading(true);
    try {
      const settings = {
        mode, category, timeLimit, maxPlayers,
        scoreTarget: mode === 'charades' ? charadesScoreTarget : scoreTarget,
        drawTime, entryFee, isPublic, wordChoices: 3,
      };
      const code = await createRoom(userProfile, settings);
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      <div className="bg-stickers">
        <div style={{ position: 'absolute', top: '10%', right: '10%', fontSize: 24, opacity: 0.15, transform: 'rotate(20deg)' }}>🎮</div>
        <div style={{ position: 'absolute', bottom: '15%', left: '10%', fontSize: 32, opacity: 0.15, transform: 'rotate(-15deg)' }}>🐵</div>
      </div>

      <div className="top-nav-brutal" style={{ background: '#FFF', position: 'relative', zIndex: 10, padding: '10px 16px' }}>
        <button onClick={nav.toHome} className="btn btn-white" style={{ padding: '6px 12px', borderRadius: '10px', fontSize: 13 }}>← رجوع</button>
        <h1 style={{ fontSize: 18, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0, flex: 1, textAlign: 'center' }}>تجهيز الغرفة</h1>
        <div style={{ width: 68 }} />
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 5 }}>

        <div
          onClick={() => setModeOpen(!modeOpen)}
          className="card"
          style={{
            padding: '12px 16px', background: '#FFF', borderRadius: '14px', border: '3px solid var(--bg-dark-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', boxShadow: '4px 4px 0 var(--bg-dark-purple)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>{MODES.find(m => m.id === mode)?.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>{MODES.find(m => m.id === mode)?.label}</div>
          </div>
          <div style={{ fontSize: 18, transform: modeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.1s' }}>▼</div>
        </div>

        {modeOpen && (
          <div className="slide-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {MODES.map(m => {
              const selected = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { if (m.active) { setMode(m.id); setModeOpen(false); } }}
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: '12px',
                    background: selected ? 'var(--bg-pink)' : '#FFF',
                    borderColor: 'var(--bg-dark-purple)',
                    boxShadow: selected ? 'none' : '3px 3px 0 var(--bg-dark-purple)',
                    transform: selected ? 'translate(3px, 3px)' : 'none',
                    opacity: m.soon ? 0.6 : 1, textAlign: 'right', cursor: m.active ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div style={{ fontSize: 24 }}>{m.emoji}</div>
                  <div style={{ color: selected ? '#FFF' : 'var(--bg-dark-purple)', fontSize: 14, fontWeight: 950 }}>{m.label}</div>
                </button>
              );
            })}
          </div>
        )}

        <div className="card" style={{ padding: '12px', background: '#FFF', borderRadius: '16px', border: '3px solid var(--bg-dark-purple)', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
             <button onClick={() => setIsPublic(true)} className={`btn ${isPublic ? 'btn-blue' : 'btn-white'}`} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: 14, boxShadow: isPublic ? 'none' : '3px 3px 0 var(--bg-dark-purple)', color: isPublic ? '#FFF' : 'inherit' }}>عامة 🌍</button>
             <button onClick={() => setIsPublic(false)} className={`btn ${!isPublic ? 'btn-blue' : 'btn-white'}`} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: 14, boxShadow: !isPublic ? 'none' : '3px 3px 0 var(--bg-dark-purple)', color: !isPublic ? '#FFF' : 'inherit' }}>خاصة 🔒</button>
          </div>
        </div>

        <div className="card" style={{ padding: '14px', background: '#FFF', borderRadius: '16px', border: '3px solid var(--bg-dark-purple)', boxShadow: '4px 4px 0 var(--bg-dark-purple)', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {mode !== 'survival' && mode !== 'charades' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 950, marginBottom: 6, color: 'var(--bg-pink)' }}>الموضوع 📚</div>
              <button onClick={() => setCatOpen(!catOpen)} className="btn btn-white" style={{ width: '100%', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontWeight: 950, border: '2px solid' }}>
                <span>▼</span>
                <span>{selectedCat.emoji} {selectedCat.name}</span>
              </button>
              {catOpen && (
                <div style={{ marginTop: 8, padding: 4, maxHeight: 150, overflowY: 'auto', border: '2px dashed #DDD', borderRadius: 8 }}>
                  {currentCategories.map(cat => (
                    <button key={cat.id} onClick={() => { setCategory(cat.id); setCatOpen(false); }} style={{ width: '100%', padding: '10px', textAlign: 'right', background: category === cat.id ? 'var(--bg-yellow)' : 'transparent', border: 'none', borderRadius: '6px', fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>{cat.emoji}</span><span>{cat.name}</span></button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 950, marginBottom: 6, color: 'var(--bg-pink)' }}>اللاعبين</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(mode === 'draw' ? [3, 4, 5, 8] : mode === 'charades' ? [4, 5, 6, 8] : [2, 3, 4, 5]).map(n => (
                <button key={n} onClick={() => setMaxPlayers(n)} className={`btn ${maxPlayers === n ? 'btn-pink' : 'btn-white'}`} style={{ flex: 1, padding: '8px 0', fontSize: 14, boxShadow: maxPlayers === n ? 'none' : '2px 2px 0 var(--bg-dark-purple)', borderRadius: '8px', color: maxPlayers === n ? '#FFF' : 'inherit' }}>{n}</button>
              ))}
            </div>
          </div>

          {(mode === 'monkey' || mode === 'survival') && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 950, marginBottom: 6, color: 'var(--bg-pink)' }}>الوقت</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[10, 15, 20, 0].map(t => (
                  <button key={t} onClick={() => setTimeLimit(t)} className={`btn ${timeLimit === t ? 'btn-yellow' : 'btn-white'}`} style={{ flex: 1, padding: '8px 0', fontSize: 13, boxShadow: timeLimit === t ? 'none' : '2px 2px 0 var(--bg-dark-purple)', borderRadius: '8px' }}>{t === 0 ? '∞' : `${t}s`}</button>
                ))}
              </div>
            </div>
          )}

          {mode === 'charades' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 950, marginBottom: 6, color: 'var(--bg-pink)' }}>هدف النقاط 🏆</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[10, 20, 30, 50].map(n => (
                  <button key={n} onClick={() => setCharadesScoreTarget(n)} className={`btn ${charadesScoreTarget === n ? 'btn-yellow' : 'btn-white'}`} style={{ flex: 1, padding: '8px 0', fontSize: 14, boxShadow: charadesScoreTarget === n ? 'none' : '2px 2px 0 var(--bg-dark-purple)', borderRadius: '8px' }}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {mode === 'draw' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
               <div>
                  <div style={{ fontSize: 11, fontWeight: 950, marginBottom: 6, color: 'var(--bg-pink)' }}>هدف النقاط</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[120, 240, 480].map(n => (
                      <button key={n} onClick={() => setScoreTarget(n)} className={`btn ${scoreTarget === n ? 'btn-pink' : 'btn-white'}`} style={{ flex: 1, padding: '8px 0', fontSize: 12, borderRadius: '6px' }}>{n}</button>
                    ))}
                  </div>
               </div>
               <div>
                  <div style={{ fontSize: 11, fontWeight: 950, marginBottom: 6, color: 'var(--bg-pink)' }}>وقت الرسم</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[60, 80, 120].map(t => (
                      <button key={t} onClick={() => setDrawTime(t)} className={`btn ${drawTime === t ? 'btn-yellow' : 'btn-white'}`} style={{ flex: 1, padding: '8px 0', fontSize: 12, borderRadius: '6px' }}>{t}s</button>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="btn btn-pink"
          style={{ width: '100%', padding: '18px', fontSize: '1.25rem', borderRadius: '18px', boxShadow: '6px 6px 0 var(--bg-dark-purple)', marginTop: 'auto' }}
        >
          {loading ? <LoadingSpinner size={22} /> : 'ابدأ اللعبة! 🚀'}
        </button>

      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
