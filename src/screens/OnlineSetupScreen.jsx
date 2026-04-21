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
  { id: 'buzzer', emoji: '🔔', label: 'بازر', active: true, desc: 'سباق البازر' },
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
  const [entryFee]                     = useState(100);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState('');
  const [modeOpen, setModeOpen]       = useState(false);
  const [isPublic, setIsPublic]       = useState(true);
  const [pointsGoal, setPointsGoal]   = useState(10);
  const [charadesTime, setCharadesTime] = useState(60);

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
      let finalScoreTarget = scoreTarget;
      if (mode === 'charades' || mode === 'buzzer') {
        finalScoreTarget = pointsGoal;
      }

      const settings = {
        mode, category, timeLimit, maxPlayers,
        scoreTarget: finalScoreTarget,
        drawTime, entryFee, isPublic, wordChoices: 3,
        charadesTime: mode === 'charades' ? charadesTime : undefined,
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
        <div style={{ position: 'absolute', top: '10%', right: '10%', fontSize: 24, opacity: 0.12, transform: 'rotate(20deg)' }}>🎮</div>
        <div style={{ position: 'absolute', bottom: '15%', left: '10%', fontSize: 32, opacity: 0.12, transform: 'rotate(-15deg)' }}>🐵</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', position: 'relative', zIndex: 10, padding: '12px 16px' }}>
        <button onClick={nav.toHome} className="btn btn-white" style={{ padding: '6px 14px', borderRadius: 0, fontSize: 13, border: '3px solid #000' }}>← رجوع</button>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--neo-black)', margin: 0, flex: 1, textAlign: 'center' }}>إعداد الغرفة</h1>
        <div style={{ width: 88 }} />
      </div>

      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 5 }}>

        {/* Mode Selector */}
        <div
          onClick={() => setModeOpen(!modeOpen)}
          className="card"
          style={{
            padding: '12px 16px', background: '#FFF', borderRadius: 0, border: '4px solid #000',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', boxShadow: '6px 6px 0 #000'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28, background: 'var(--neo-yellow)', border: '2px solid #000', padding: 4 }}>{MODES.find(m => m.id === mode)?.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#000' }}>{MODES.find(m => m.id === mode)?.label}</div>
          </div>
          <div style={{ fontSize: 18, background: 'var(--neo-cyan)', border: '2px solid #000', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: modeOpen ? 'rotate(180deg)' : 'none', transition: 'none' }}>▼</div>
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
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 0,
                    background: selected ? 'var(--neo-cyan)' : '#FFF',
                    borderColor: '#000', borderWidth: '3px',
                    boxShadow: selected ? 'none' : '4px 4px 0 #000',
                    transform: selected ? 'translate(3px, 3px)' : 'none',
                    opacity: m.soon ? 0.6 : 1, textAlign: 'right', cursor: m.active ? 'pointer' : 'not-allowed',
                    transition: 'none'
                  }}
                >
                  <div style={{ fontSize: 24 }}>{m.emoji}</div>
                  <div style={{ color: '#000', fontSize: 14, fontWeight: 900 }}>{m.label}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Public / Private */}
        <div className="card" style={{ padding: '10px', background: '#FFF', borderRadius: 0, border: '4px solid #000', boxShadow: '6px 6px 0 #000' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setIsPublic(true)} className={`btn ${isPublic ? 'btn-green' : 'btn-white'}`} style={{ flex: 1, padding: '10px', borderRadius: 0, fontSize: 14, boxShadow: isPublic ? 'none' : '3px 3px 0 #000', color: '#000', border: '3px solid #000', fontWeight: 900 }}>عام 🌍</button>
            <button onClick={() => setIsPublic(false)} className={`btn ${!isPublic ? 'btn-pink' : 'btn-white'}`} style={{ flex: 1, padding: '10px', borderRadius: 0, fontSize: 14, boxShadow: !isPublic ? 'none' : '3px 3px 0 #000', color: '#000', border: '3px solid #000', fontWeight: 900 }}>خاص 🔒</button>
          </div>
        </div>

        {/* Settings Card */}
        <div className="card" style={{ padding: '14px', background: '#FFF', borderRadius: 0, border: '4px solid #000', boxShadow: '8px 8px 0 #000', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {mode !== 'survival' && mode !== 'charades' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 8, color: '#000', background: 'var(--neo-pink)', display: 'inline-block', padding: '2px 10px', border: '2.5px solid #000' }}>الفئة</div>
              <button onClick={() => setCatOpen(!catOpen)} className="btn btn-white" style={{ width: '100%', padding: '14px', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 900, border: '4px solid #000' }}>
                <span style={{ background: 'var(--neo-cyan)', border: '2px solid #000', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</span>
                <span>{selectedCat.emoji} {selectedCat.name}</span>
              </button>
              {catOpen && (
                <div style={{ marginTop: 10, padding: 6, maxHeight: 180, overflowY: 'auto', border: '4px solid #000', borderRadius: 0, background: '#FFF' }}>
                  {currentCategories.map(cat => (
                    <button key={cat.id} onClick={() => { setCategory(cat.id); setCatOpen(false); }} style={{ width: '100%', padding: '12px', textAlign: 'left', background: category === cat.id ? 'var(--neo-yellow)' : 'transparent', border: 'none', borderRadius: 0, fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000' }}><span>{cat.emoji}</span><span>{cat.name}</span></button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, fontWeight: 900, marginBottom: 6, color: '#000', background: 'var(--neo-green)', display: 'inline-block', padding: '1px 6px', border: '1.5px solid #000' }}>اللاعبون</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(mode === 'draw' ? [3, 4, 5, 8] : mode === 'charades' ? [4, 5, 6, 8] : [2, 3, 4, 5]).map(n => (
                <button key={n} onClick={() => setMaxPlayers(n)} className={`btn ${maxPlayers === n ? 'btn-pink' : 'btn-white'}`} style={{ flex: 1, padding: '8px 0', fontSize: 14, boxShadow: maxPlayers === n ? 'none' : '3px 3px 0 #000', borderRadius: 0, color: '#000', border: '3px solid #000', fontWeight: 900 }}>{n}</button>
              ))}
            </div>
          </div>

          {(mode === 'monkey' || mode === 'survival') && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, marginBottom: 6, color: '#000', background: 'var(--neo-cyan)', display: 'inline-block', padding: '1px 6px', border: '1.5px solid #000' }}>الوقت</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[10, 15, 20, 0].map(t => (
                  <button key={t} onClick={() => setTimeLimit(t)} className={`btn ${timeLimit === t ? 'btn-yellow' : 'btn-white'}`} style={{ flex: 1, padding: '8px 0', fontSize: 13, boxShadow: timeLimit === t ? 'none' : '3px 3px 0 #000', borderRadius: 0, color: '#000', border: '3px solid #000', fontWeight: 900 }}>{t === 0 ? '∞' : `${t}ث`}</button>
                ))}
              </div>
            </div>
          )}

          {mode === 'charades' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 8, color: '#000', background: 'var(--neo-pink)', display: 'inline-block', padding: '2px 10px', border: '2.5px solid #000' }}>هدف النقاط 🏆</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[10, 20, 30, 50].map(n => (
                  <button key={n} onClick={() => setPointsGoal(n)} className={`btn ${pointsGoal === n ? 'btn-yellow' : 'btn-white'}`} style={{ flex: 1, padding: '10px 0', fontSize: 14, boxShadow: pointsGoal === n ? 'none' : '3px 3px 0 #000', border: '3px solid #000', borderRadius: 0, color: '#000', fontWeight: 900 }}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {mode === 'charades' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 8, color: '#000', background: 'var(--neo-cyan)', display: 'inline-block', padding: '2px 10px', border: '2.5px solid #000' }}>وقت الجولة ⏱️</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[45, 60, 75, 90].map(t => (
                  <button key={t} onClick={() => setCharadesTime(t)} className={`btn ${charadesTime === t ? 'btn-yellow' : 'btn-white'}`} style={{ flex: 1, padding: '10px 0', fontSize: 14, boxShadow: charadesTime === t ? 'none' : '3px 3px 0 #000', border: '3px solid #000', borderRadius: 0, color: '#000', fontWeight: 900 }}>{t}ث</button>
                ))}
              </div>
            </div>
          )}

          {mode === 'draw' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, marginBottom: 8, color: '#000', background: 'var(--neo-pink)', display: 'inline-block', padding: '2px 8px', border: '2.5px solid #000' }}>الهدف</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[120, 240, 480].map(n => (
                    <button key={n} onClick={() => setScoreTarget(n)} className={`btn ${scoreTarget === n ? 'btn-pink' : 'btn-white'}`} style={{ flex: 1, padding: '10px 0', fontSize: 12, borderRadius: 0, border: '3px solid #000', fontWeight: 900 }}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, marginBottom: 8, color: '#000', background: 'var(--neo-yellow)', display: 'inline-block', padding: '2px 8px', border: '2.5px solid #000' }}>الوقت</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[60, 80, 120].map(t => (
                    <button key={t} onClick={() => setDrawTime(t)} className={`btn ${drawTime === t ? 'btn-yellow' : 'btn-white'}`} style={{ flex: 1, padding: '10px 0', fontSize: 12, borderRadius: 0, border: '3px solid #000', fontWeight: 900 }}>{t}ث</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'buzzer' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 8, color: '#000', background: 'var(--neo-pink)', display: 'inline-block', padding: '2px 10px', border: '2.5px solid #000' }}>هدف النقاط 🏆</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setPointsGoal(n)} className={`btn ${pointsGoal === n ? 'btn-yellow' : 'btn-white'}`} style={{ flex: 1, padding: '10px 0', fontSize: 14, boxShadow: pointsGoal === n ? 'none' : '3px 3px 0 #000', border: '3px solid #000', borderRadius: 0, color: '#000', fontWeight: 900 }}>{n}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="btn btn-pink"
          style={{ width: '100%', padding: '20px', fontSize: '1.4rem', borderRadius: 0, boxShadow: '8px 8px 0 #000', marginTop: 'auto', border: '5px solid #000', fontWeight: 900 }}
        >
          {loading ? <LoadingSpinner size={22} /> : 'إنشاء الغرفة 🚀'}
        </button>

      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
