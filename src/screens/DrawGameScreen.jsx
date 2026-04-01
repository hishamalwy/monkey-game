import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/ui/UserAvatar';
import { listenToRoom } from '../firebase/rooms';
import {
  chooseDrawWord, submitDrawGuess, addStroke, clearDrawCanvas,
  fillBackground, endDrawRound, nextDrawRound, revealHint, undoLastStroke,
  freezeDrawTime,
} from '../firebase/drawRooms';
import Toast from '../components/ui/Toast';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { leaveRoom } from '../firebase/rooms';

const COLORS = [
  '#FF006E', '#39FF14', '#FFE300', '#FF6B00', '#4361EE', 
  '#F72585', '#4CC9F0', '#7209B7', '#FFFFFF', '#1C1040'
];
const BRUSH_SIZES = { thin: 4, medium: 10, thick: 22, fat: 48 };

const ToolIcon = ({ type, active, isFilled }) => {
  const color = active ? 'var(--bg-pink)' : 'var(--bg-dark-purple)';
  if (type === 'pen') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  );
  if (type === 'glow') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
  if (type === 'eraser') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"/><path d="M17 17L7 7"/>
    </svg>
  );
  if (type === 'line') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><line x1="5" y1="19" x2="19" y2="5" /></svg>;
  if (type === 'rect') return (
     <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'var(--bg-pink)' : 'none'} stroke={color} strokeWidth="2.5">
       <rect x="3" y="3" width="18" height="18" rx="2" fill={active && isFilled ? 'var(--bg-pink)' : 'none'} />
     </svg>
  );
  if (type === 'circle') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'var(--bg-pink)' : 'none'} stroke={color} strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" fill={active && isFilled ? 'var(--bg-pink)' : 'none'} />
    </svg>
  );
  if (type === 'triangle') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'var(--bg-pink)' : 'none'} stroke={color} strokeWidth="2.5">
      <path d="M12 3L2 20h20L12 3z" fill={active && isFilled ? 'var(--bg-pink)' : 'none'} />
    </svg>
  );
  return null;
};

function drawStrokeOnCtx(ctx, stroke, W, H) {
  if (!stroke.points || stroke.points.length < 2) return;
  const pts = stroke.points;
  ctx.lineWidth = BRUSH_SIZES[stroke.size] || 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.type === 'glow') {
    ctx.shadowBlur = 15;
    ctx.shadowColor = stroke.color;
  } else {
    ctx.shadowBlur = 0;
  }

  ctx.beginPath();

  if (stroke.type === 'line') {
    ctx.moveTo(pts[0].x * W, pts[0].y * H);
    ctx.lineTo(pts[pts.length - 1].x * W, pts[pts.length - 1].y * H);
    ctx.stroke();
  } else if (stroke.type === 'rect') {
    const x = pts[0].x * W, y = pts[0].y * H;
    const w = (pts[pts.length - 1].x - pts[0].x) * W;
    const h = (pts[pts.length - 1].y - pts[0].y) * H;
    ctx.strokeRect(x, y, w, h);
  } else if (stroke.type === 'circle') {
    const x1 = pts[0].x * W, y1 = pts[0].y * H;
    const x2 = pts[pts.length - 1].x * W, y2 = pts[pts.length - 1].y * H;
    const r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    ctx.arc(x1, y1, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (stroke.type === 'triangle') {
    const x1 = pts[0].x * W, y1 = pts[0].y * H;
    const x2 = pts[pts.length - 1].x * W, y2 = pts[pts.length - 1].y * H;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1 - (x2 - x1), y2);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Normal pen/eraser
    ctx.moveTo(pts[0].x * W, pts[0].y * H);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x * W, pts[i].y * H);
    }
  }

  if (stroke.isFilled && ['rect', 'circle', 'triangle'].includes(stroke.type)) {
    ctx.fillStyle = stroke.color;
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

export default function DrawGameScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [hintCooldown, setHintCooldown] = useState(0);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const lastStrokesLen = useRef(0);
  const [tool, setTool] = useState('pen'); // pen, eraser, line, rect, circle, triangle
  const [color, setColor] = useState('#1C1040');
  const [brushSize, setBrushSize] = useState('medium');
  const [isFilled, setIsFilled] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const chatRef = useRef(null);
  const vh = useVisualViewport();

  const navRef = useRef(nav);
  useEffect(() => { navRef.current = nav; });

  // Listen to room
  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { navRef.current.toHome(); return; }
      setRoom(data);
      if (data.status === 'draw_over') navRef.current.toDrawGameOver();
    });
    return unsub;
  }, [roomCode]);

  const ds = room?.drawState;
  const myUid = userProfile?.uid;
  const isDrawer = ds?.drawerUid === myUid;
  const isHost = room?.hostUid === myUid;

  // --- Canvas setup when round status changes ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || ds?.roundStatus !== 'drawing') return;
    const container = canvas.parentElement;
    const size = container ? Math.min(container.offsetWidth, container.offsetHeight) : 300;
    canvas.width = size || 300;
    canvas.height = size || 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = ds?.bgFill || '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lastStrokesLen.current = 0;
  }, [ds?.roundStatus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ds?.strokes) return;
    const strokes = ds.strokes;

    const ctx = canvas.getContext('2d');
    const hasBgChange = ds.bgFill !== (canvas.dataset.lastBg || null);

    if (strokes.length < lastStrokesLen.current || hasBgChange) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ds.bgFill || '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      strokes.forEach(s => drawStrokeOnCtx(ctx, s, canvas.width, canvas.height));
      canvas.dataset.lastBg = ds.bgFill || '';
    } else {
      for (let i = lastStrokesLen.current; i < strokes.length; i++) {
        drawStrokeOnCtx(ctx, strokes[i], canvas.width, canvas.height);
      }
    }
    lastStrokesLen.current = strokes.length;
  }, [ds?.strokes, ds?.bgFill]);

  // --- Unified Phase Timer ---
  useEffect(() => {
    let interval;
    const status = ds?.roundStatus;
    const endsAt = (status === 'drawing' ? ds.roundEndsAt : (status === 'choosing' ? ds.choosingEndsAt : null));
    
    if (endsAt) {
      const update = () => {
        const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
        setTimeLeft(left);
        if (left <= 0) {
          if (status === 'drawing' && isHost) endDrawRound(roomCode).catch(() => {});
          if (status === 'choosing' && isDrawer && (ds.wordOptions?.length || 0) > 0) {
             chooseDrawWord(roomCode, ds.wordOptions[0]).catch(() => {});
          }
        }
      };
      update();
      interval = setInterval(update, 1000);
    }
    return () => clearInterval(interval);
  }, [ds?.roundStatus, ds?.roundEndsAt, ds?.choosingEndsAt, isHost, isDrawer, roomCode, ds?.wordOptions]);

  // --- Auto scroll chat ---
  useEffect(() => {
    if (chatRef.current) {
      setTimeout(() => {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 50);
    }
  }, [ds?.messages]);

  // --- Auto-advance after reveal (host, 4.5s) ---
  useEffect(() => {
    if (!ds || ds.roundStatus !== 'reveal' || !isHost) return;
    const id = setTimeout(() => nextDrawRound(roomCode).catch(() => {}), 4500);
    return () => clearTimeout(id);
  }, [ds?.roundStatus, isHost, roomCode]);

  // --- Hint Cooldown timer ---
  useEffect(() => {
    if (hintCooldown <= 0) return;
    const id = setInterval(() => setHintCooldown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [hintCooldown]);

  // --- Canvas pointer helpers ---
  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Number(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)).toFixed(4)),
      y: Number(Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)).toFixed(4)),
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    isDrawingRef.current = true;
    currentStrokeRef.current = { tool, color, size: brushSize, points: [pos], isFilled };
  }, [isDrawer, tool, color, brushSize, getCanvasPos, isFilled]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const pts = currentStrokeRef.current.points;
    
    if (['line', 'rect', 'circle', 'triangle'].includes(tool)) {
      currentStrokeRef.current.points = [pts[0], pos];
    } else {
      const last = pts[pts.length - 1];
      const dist = Math.sqrt(Math.pow(pos.x - last.x, 2) + Math.pow(pos.y - last.y, 2));
      if (dist < 0.005) return; // Decimation threshold
      pts.push(pos);
    }

    const canvas = canvasRef.current;
    if (canvas && pts.length >= 2) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ds.bgFill || '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ds.strokes.forEach(s => drawStrokeOnCtx(ctx, s, canvas.width, canvas.height));
      drawStrokeOnCtx(ctx, { ...currentStrokeRef.current, type: tool }, canvas.width, canvas.height);
    }
  }, [isDrawer, tool, color, brushSize, getCanvasPos, ds?.strokes, ds?.bgFill]);

  const handlePointerUp = useCallback(async () => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const stroke = { ...currentStrokeRef.current, type: tool, bgFill: ds.bgFill };
    currentStrokeRef.current = null;
    if (stroke.points.length >= 2) {
      lastStrokesLen.current = (ds?.strokes?.length || 0) + 1;
      await addStroke(roomCode, stroke).catch(() => {});
    }
  }, [isDrawer, roomCode, ds?.strokes?.length, tool, ds?.bgFill]);

  const handleSendGuess = async () => {
    const text = guessInput.trim();
    if (!text || !ds || ds.roundStatus !== 'drawing') return;
    if (isDrawer) { setToast('ممنوع تخمن رسمتك! 🤫'); setGuessInput(''); return; }
    if ((ds.guessersDone || []).includes(myUid)) return;
    setGuessInput('');
    await submitDrawGuess(roomCode, myUid, userProfile.username, text, room?.drawTime || 80);
  };

  const handleExit = async () => {
    await leaveRoom(roomCode, myUid, isHost);
    navRef.current.toHome();
  };

  const handleFreeze = async () => {
    if (!isDrawer || ds?.powerupUsed) return;
    await freezeDrawTime(roomCode);
  };



  if (!room || !ds) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎨</div>;

  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const drawerPlayer = room.players[ds.drawerUid];
  const myAlreadyGuessed = (ds.guessersDone || []).includes(myUid);

  return (
    <div style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', background: 'var(--bg-yellow)', position: 'relative', overflow: 'hidden' }}>

      {/* Modern Floating Header */}
      <div style={{
        margin: '12px 14px', padding: '10px 16px', 
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
        border: '3px solid var(--bg-dark-purple)', borderRadius: '20px',
        boxShadow: '0 8px 0 rgba(45,27,78,0.2), var(--brutal-shadow)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowExitConfirm(true)} className="btn btn-white" style={{ padding: '6px 12px', fontSize: 13, border: '2px solid var(--bg-dark-purple)', marginLeft: 8 }}>✕</button>
          <div style={{ position: 'relative' }}>
             <UserAvatar avatarId={drawerPlayer?.avatarId ?? 0} size={36} />
             <div style={{ position: 'absolute', bottom: -2, right: -2, fontSize: 14 }}>🎨</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--bg-pink)', lineHeight: 1 }}>الرّسام</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>{drawerPlayer?.username}</div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-muted)' }}>جولة</div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{ds.currentRound}/{ds.totalRounds}</div>
        </div>

        <div style={{ 
          width: 50, height: 50, borderRadius: '50%', border: '4px solid var(--bg-dark-purple)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: (timeLeft ?? 0) <= 10 ? 'var(--bg-pink)' : 'white',
          color: (timeLeft ?? 0) <= 10 ? 'white' : 'var(--bg-dark-purple)',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
            {timeLeft ?? ''}
          </span>
        </div>
      </div>

      {/* Word Reminder (Drawer) or Hint (Guesser) */}
      {ds.roundStatus === 'drawing' && (
        <div style={{ 
          padding: '4px 14px', textAlign: 'center', background: 'rgba(255,255,255,0.5)',
          borderBottom: '2px solid var(--bg-dark-purple)', zIndex: 11
        }}>
          {isDrawer ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-muted)' }}>أنت ترسم:</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--bg-pink)' }}>{ds.chosenWord}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.15em', fontVariantCaps: 'all-small-caps', color: 'var(--bg-dark-purple)' }}>
                {ds.hint}
              </span>
            </div>
          )}
        </div>
      )}

      {ds.roundStatus === 'choosing' && (
        <div className="slide-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {isDrawer ? (
            <div style={{ width: '100%', maxWidth: 320 }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', marginBottom: 24, color: 'var(--bg-dark-purple)', textShadow: '2px 2px 0 white' }}>
                كلماتك لهذا اليوم 🔥
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(ds.wordOptions || []).map((word, i) => (
                  <button 
                    key={word} 
                    onClick={() => chooseDrawWord(roomCode, word)} 
                    className="btn btn-white" 
                    style={{ 
                      padding: '20px', fontSize: 20, borderRadius: '16px',
                      animation: `slideUp 0.3s ease ${i * 0.1}s both`
                    }}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 80, marginBottom: 20, animation: 'pop 1s infinite' }}>🤔</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>
                صاحبك بيفكر يورطكم في إيه...
              </h2>
              <p style={{ fontSize: 16, color: 'var(--color-muted)', fontWeight: 700, marginTop: 10 }}>
                {drawerPlayer?.username} بيختار كلمة الآن
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drawing Phase Tools (Drawer Only) */}
      {isDrawer && ds.roundStatus === 'drawing' && (
        <div style={{ 
          padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 5 
        }}>
          {/* Colors */}
          <div style={{ 
             display: 'flex', overflowX: 'auto', gap: 8, padding: '4px 2px',
             scrollbarWidth: 'none'
          }}>
            {COLORS.map(c => (
              <button 
                key={c} 
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }}
                style={{ 
                  minWidth: 32, height: 32, borderRadius: '50%', background: c, 
                  border: color === c ? '4px solid white' : '3px solid var(--bg-dark-purple)',
                  boxShadow: color === c ? '0 0 10px rgba(0,0,0,0.3)' : 'none',
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }} 
              />
            ))}
          </div>
          {/* Tools Pill */}
          <div style={{ 
            background: 'white', border: '3px solid var(--bg-dark-purple)', borderRadius: '16px',
            padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: 'var(--brutal-shadow)'
          }}>
             <div style={{ display: 'flex', gap: 4 }}>
                {['pen', 'glow', 'eraser', 'line', 'rect', 'circle'].map(t => (
                  <button 
                    key={t} onClick={() => setTool(t)} 
                    style={{ 
                      width: 38, height: 38, borderRadius: '10px', border: 'none',
                      background: tool === t ? 'var(--bg-yellow)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <ToolIcon type={t} active={tool === t} isFilled={isFilled} />
                  </button>
                ))}
             </div>
             <div style={{ height: 24, width: 2, background: 'rgba(0,0,0,0.1)' }} />
             <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => fillBackground(roomCode, color)} title="تلوين الخلفية" style={{ width: 38, height: 38, border: 'none', background: 'transparent', fontSize: 18 }}>🪣</button>
                <button onClick={() => setIsFilled(!isFilled)} title="تعبئة الأشكال" style={{ width: 38, height: 38, border: 'none', background: isFilled ? 'var(--bg-yellow)' : 'transparent', borderRadius: 8, fontSize: 18 }}>{isFilled ? '⬛' : '⬜'}</button>
                <button onClick={() => undoLastStroke(roomCode)} title="تراجع" style={{ width: 38, height: 38, border: 'none', background: 'transparent', fontSize: 18 }}>↩️</button>
                <button onClick={() => clearDrawCanvas(roomCode)} title="مسح الكل" style={{ width: 38, height: 38, border: 'none', background: 'transparent', fontSize: 18 }}>🗑️</button>
                <button 
                  onClick={handleFreeze} 
                  disabled={ds.powerupUsed}
                  className={`btn ${ds.powerupUsed ? 'btn-white' : 'btn-yellow'}`} 
                  style={{ width: 'auto', padding: '0 8px', fontSize: 12, height: 38, opacity: ds.powerupUsed ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8, boxShadow: 'none' }}
                >
                  {ds.powerupUsed ? '⏳' : '❄️'}
                 </button>
             </div>
             <div style={{ height: 24, width: 2, background: 'rgba(0,0,0,0.1)' }} />
             <button 
                onClick={() => { revealHint(roomCode); setHintCooldown(12); }} 
                disabled={ds.hintRevealCount >= (ds.wordLength || 0) - 1 || hintCooldown > 0}
                className="btn btn-yellow" 
                style={{ padding: '4px 12px', fontSize: 11, borderRadius: '8px', boxShadow: 'none', height: 38, opacity: (hintCooldown > 0) ? 0.6 : 1 }}
             >
                {hintCooldown > 0 ? `انتظر ${hintCooldown}ث` : 'كشف حرف 💡'}
             </button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div style={{ flex: '1 1 auto', position: 'relative', background: '#eee', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ 
          aspectRatio: '1/1', 
          width: '100%', 
          maxWidth: 'min(calc(100dvh - 380px), 100%)',
          maxHeight: '100%',
          background: '#fff', 
          border: 'var(--brutal-border)', 
          boxShadow: 'var(--brutal-shadow)', 
          position: 'relative'
        }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', touchAction: 'none' }}
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
          {myAlreadyGuessed && !isDrawer && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(57,255,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, pointerEvents: 'none' }}>✅</div>
          )}
        </div>
      </div>

      {/* Guessing Area */}
      {!isDrawer && ds.roundStatus === 'drawing' && (
        <div style={{ padding: '0 14px 14px', zIndex: 10 }}>
          <div 
             ref={chatRef} 
             style={{ 
               backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
               border: '3px solid var(--bg-dark-purple)', borderRadius: '18px 18px 0 0',
               maxHeight: 120, overflowY: 'auto', padding: '10px 12px',
               marginBottom: -3, borderBottom: 'none'
             }}
          >
            {(ds.messages || []).map((m, i) => (
              <div key={i} style={{ 
                fontSize: 13, marginBottom: 6, display: 'flex', gap: 6, 
                flexDirection: 'row-reverse'
              }}>
                <span style={{ fontWeight: 900, color: m.isCorrect ? 'var(--bg-green)' : 'var(--bg-dark-purple)' }}>{m.username}:</span> 
                <span style={{ 
                  background: m.isCorrect ? 'var(--bg-green)' : 'white',
                  color: m.isCorrect ? '#1C1040' : 'var(--bg-dark-purple)',
                  padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--bg-dark-purple)',
                  fontSize: 12, fontWeight: 700
                }}>
                  {m.isCorrect && m.uid !== myUid ? 'خمّن الكلمة! ✅' : m.text}
                </span>
              </div>
            ))}
          </div>
          {!myAlreadyGuessed && (
            <div style={{ display: 'flex', gap: 8, background: 'white', padding: 8, border: '3px solid var(--bg-dark-purple)', borderRadius: '0 0 18px 18px', boxShadow: 'var(--brutal-shadow)' }}>
              <input 
                value={guessInput} 
                onChange={e => setGuessInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSendGuess()}
                placeholder="اكتب تخمينك هنا..." 
                className="input-field" 
                style={{ flex: 1, border: 'none', boxShadow: 'none', background: 'transparent', padding: '8px' }} 
              />
              <button onClick={handleSendGuess} className="btn btn-pink" style={{ padding: '8px 20px', borderRadius: '12px', boxShadow: 'none' }}>
                خمّن
              </button>
            </div>
          )}
        </div>
      )}
      
      {ds.roundStatus === 'reveal' && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h3>الكلمة كانت: {ds.chosenWord}</h3>
          <button className="btn btn-yellow" onClick={() => isHost && nextDrawRound(roomCode)}>الجولة التالية</button>
        </div>
      )}

      {showExitConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(28,16,63,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card slide-up" style={{ padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 12px' }}>تغادر الغرفة؟</h3>
            <p style={{ fontSize: 14, color: 'var(--bg-dark-purple)', opacity: 0.7, marginBottom: 20 }}>ستخسر نقاطك الحالية في هذه اللعبة.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowExitConfirm(false)} className="btn btn-white" style={{ flex: 1, padding: 14 }}>لأ</button>
              <button onClick={handleExit} className="btn btn-pink" style={{ flex: 1, padding: 14 }}>اخرج</button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(28,16,63,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card slide-up" style={{ padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 12px' }}>تغادر الغرفة؟</h3>
            <p style={{ fontSize: 14, color: 'var(--bg-dark-purple)', opacity: 0.7, marginBottom: 20 }}>ستخسر نقاطك الحالية في هذه اللعبة.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowExitConfirm(false)} className="btn btn-white" style={{ flex: 1, padding: 14 }}>لأ</button>
              <button onClick={handleExit} className="btn btn-pink" style={{ flex: 1, padding: 14 }}>اخرج</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
