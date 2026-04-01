import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import { listenToRoom } from '../firebase/rooms';
import {
  chooseDrawWord, submitDrawGuess, addStroke, clearDrawCanvas,
  endDrawRound, nextDrawRound, revealHint,
} from '../firebase/drawRooms';
import Toast from '../components/ui/Toast';

const COLORS = [
  '#1C1040', '#FFFFFF', '#FF006E', '#4361EE',
  '#39FF14', '#FFE300', '#FF6B00', '#8B4513',
];
const BRUSH_SIZES = { thin: 3, medium: 8, thick: 18 };

function drawStrokeOnCtx(ctx, stroke, W, H) {
  if (!stroke.points || stroke.points.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
  ctx.lineWidth = BRUSH_SIZES[stroke.size] || 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(stroke.points[0].x * W, stroke.points[0].y * H);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x * W, stroke.points[i].y * H);
  }
  ctx.stroke();
}

export default function DrawGameScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [chooseTimer, setChooseTimer] = useState(10);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const lastStrokesLen = useRef(0);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#1C1040');
  const [brushSize, setBrushSize] = useState('medium');

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
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lastStrokesLen.current = 0;
  }, [ds?.roundStatus]);

  // Redraw canvas from strokes on change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ds?.strokes) return;
    const strokes = ds.strokes;

    // Full redraw if strokes were cleared or count went down
    if (strokes.length < lastStrokesLen.current) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      strokes.forEach(s => drawStrokeOnCtx(ctx, s, canvas.width, canvas.height));
    } else {
      // Incremental: only draw new strokes
      const ctx = canvas.getContext('2d');
      for (let i = lastStrokesLen.current; i < strokes.length; i++) {
        drawStrokeOnCtx(ctx, strokes[i], canvas.width, canvas.height);
      }
    }
    lastStrokesLen.current = strokes.length;
  }, [ds?.strokes]);

  // --- Drawing phase timer ---
  useEffect(() => {
    if (!ds || ds.roundStatus !== 'drawing' || !ds.roundEndsAt) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((ds.roundEndsAt - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0 && isHost) {
        endDrawRound(roomCode).catch(() => {});
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [ds?.roundEndsAt, ds?.roundStatus, isHost, roomCode]);

  // --- Choosing phase timer (for drawer) ---
  useEffect(() => {
    if (!ds || ds.roundStatus !== 'choosing' || !isDrawer) return;
    setChooseTimer(10);
    const start = Date.now();
    const id = setInterval(() => {
      const rem = Math.max(0, 10 - Math.floor((Date.now() - start) / 1000));
      setChooseTimer(rem);
      if (rem <= 0) {
        clearInterval(id);
        const first = ds.wordOptions?.[0];
        if (first) chooseDrawWord(roomCode, first).catch(() => {});
      }
    }, 1000);
    return () => clearInterval(id);
  }, [ds?.roundStatus, ds?.drawerUid, roomCode]);

  // --- Hint reveal (host only, at 30%, 55%, 80% elapsed) ---
  useEffect(() => {
    if (!ds || ds.roundStatus !== 'drawing' || !isHost || !ds.roundEndsAt) return;
    const drawTime = (room?.drawTime || 80) * 1000;
    const startTime = ds.roundEndsAt - drawTime;
    const revealAtPct = [0.3, 0.55, 0.8];

    const id = setInterval(() => {
      const elapsed = (Date.now() - startTime) / drawTime;
      const expected = revealAtPct.filter(t => elapsed >= t).length;
      if (expected > (ds.hintRevealCount || 0)) {
        revealHint(roomCode).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(id);
  }, [ds?.roundStatus, ds?.roundEndsAt, ds?.hintRevealCount, isHost, roomCode]);

  // --- All guessers done → end round (host) ---
  useEffect(() => {
    if (!ds || ds.roundStatus !== 'drawing' || !isHost || !room) return;
    const guessers = (room.playerOrder || []).filter(uid => uid !== ds.drawerUid);
    if (guessers.length > 0 && (ds.guessersDone?.length || 0) >= guessers.length) {
      endDrawRound(roomCode).catch(() => {});
    }
  }, [ds?.guessersDone?.length]); // eslint-disable-line

  // --- Auto-advance after reveal (host, 4.5s) ---
  useEffect(() => {
    if (!ds || ds.roundStatus !== 'reveal' || !isHost) return;
    const id = setTimeout(() => nextDrawRound(roomCode).catch(() => {}), 4500);
    return () => clearTimeout(id);
  }, [ds?.roundStatus, isHost, roomCode]);

  // --- Canvas pointer helpers ---
  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    isDrawingRef.current = true;
    currentStrokeRef.current = { tool, color, size: brushSize, points: [pos] };
  }, [isDrawer, tool, color, brushSize, getCanvasPos]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const pts = currentStrokeRef.current.points;
    pts.push(pos);

    const canvas = canvasRef.current;
    if (canvas && pts.length >= 2) {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      ctx.lineWidth = BRUSH_SIZES[brushSize] || 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const prev = pts[pts.length - 2];
      const curr = pts[pts.length - 1];
      ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
      ctx.lineTo(curr.x * canvas.width, curr.y * canvas.height);
      ctx.stroke();
    }
  }, [isDrawer, tool, color, brushSize, getCanvasPos]);

  const handlePointerUp = useCallback(async () => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (stroke.points.length >= 2) {
      lastStrokesLen.current = (ds?.strokes?.length || 0) + 1;
      await addStroke(roomCode, stroke).catch(() => {});
    }
  }, [isDrawer, roomCode, ds?.strokes?.length]);

  const handleSendGuess = async () => {
    const text = guessInput.trim();
    if (!text || !ds || ds.roundStatus !== 'drawing') return;
    if ((ds.guessersDone || []).includes(myUid)) return;
    setGuessInput('');
    await submitDrawGuess(roomCode, myUid, userProfile.username, text, room?.drawTime || 80);
  };

  // --- Loading ---
  if (!room || !ds) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
        🎨
      </div>
    );
  }

  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const drawerPlayer = room.players[ds.drawerUid];
  const myAlreadyGuessed = (ds.guessersDone || []).includes(myUid);
  const scoreTarget = room.scoreTarget || 40;

  // ── CHOOSING ──
  if (ds.roundStatus === 'choosing') {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 20,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52 }}>{isDrawer ? '🎨' : AVATAR_EMOJIS[drawerPlayer?.avatarId ?? 0]}</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '12px 0 4px' }}>
            {isDrawer ? 'اختار كلمة ترسمها!' : `${drawerPlayer?.username || '...'} يختار...`}
          </h2>
          {isDrawer && (
            <p style={{ fontSize: 14, color: 'var(--color-muted)', margin: 0, fontWeight: 700 }}>
              عندك {chooseTimer} ثانية
            </p>
          )}
        </div>

        {isDrawer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
            {(ds.wordOptions || []).map((word, i) => (
              <button
                key={i}
                onClick={() => chooseDrawWord(roomCode, word).catch(() => {})}
                className="btn btn-white"
                style={{ padding: '16px', fontSize: 22, fontWeight: 900, letterSpacing: 3 }}
              >
                {word}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%',
                background: 'var(--bg-pink)',
                animation: `pop 0.7s ${i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        )}

        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700 }}>
          جولة {ds.currentRound} من {ds.totalRounds}
        </div>
      </div>
    );
  }

  // ── REVEAL ──
  if (ds.roundStatus === 'reveal') {
    const sortedPlayers = [...players].sort(
      (a, b) => (ds.scores[b.uid] || 0) - (ds.scores[a.uid] || 0)
    );
    return (
      <div className="slide-up" style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 20, gap: 16,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--color-muted)', margin: '0 0 8px', fontWeight: 700 }}>
            الكلمة كانت
          </p>
          <div style={{
            fontSize: 34, fontWeight: 900, color: 'var(--bg-dark-purple)',
            border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)',
            background: 'var(--bg-yellow)', padding: '10px 28px',
            letterSpacing: 4,
          }}>
            {ds.chosenWord}
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 380 }}>
          {sortedPlayers.map((p, i) => {
            const roundPts = ds.roundScores?.[p.uid] || 0;
            const total = ds.scores?.[p.uid] || 0;
            return (
              <div key={p.uid} className="slide-up" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: i === 0 ? 'var(--bg-yellow)' : '#FFF',
                border: 'var(--brutal-border)', marginBottom: -4,
                animationDelay: `${i * 0.08}s`,
              }}>
                <span style={{ fontSize: 22 }}>{AVATAR_EMOJIS[p.avatarId ?? 0]}</span>
                <span style={{ flex: 1, fontWeight: 900, fontSize: 15, color: 'var(--bg-dark-purple)' }}>
                  {p.username}
                </span>
                {roundPts > 0 && (
                  <span style={{
                    fontSize: 12, color: '#FFF', fontWeight: 900,
                    background: 'var(--bg-dark-purple)', padding: '2px 8px',
                  }}>
                    +{roundPts}
                  </span>
                )}
                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', minWidth: 52, textAlign: 'left' }}>
                  {total}
                </span>
              </div>
            );
          })}
          <div style={{ height: 4 }} />
        </div>

        <p style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700 }}>
          الجولة التالية تبدأ تلقائياً...
        </p>
      </div>
    );
  }

  // ── DRAWING ──
  const timerColor = timeLeft !== null && timeLeft <= 10 ? 'var(--bg-pink)' : 'var(--bg-dark-purple)';
  const timerPct = timeLeft !== null ? (timeLeft / (room.drawTime || 80)) * 100 : 100;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', borderBottom: '3px solid var(--bg-dark-purple)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-muted)' }}>
          {ds.currentRound}/{ds.totalRounds}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>{AVATAR_EMOJIS[drawerPlayer?.avatarId ?? 0]}</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>
            {isDrawer ? '🎨 ارسم!' : `${drawerPlayer?.username} يرسم`}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: timerColor, minWidth: 36, textAlign: 'center' }}>
          {timeLeft ?? ''}
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ height: 5, background: '#E5E7EB', flexShrink: 0 }}>
        <div className="timer-bar" style={{
          height: '100%',
          background: timerPct <= 20 ? 'var(--bg-pink)' : 'var(--bg-orange)',
          width: `${timerPct}%`,
          transition: 'width 0.5s linear, background 0.3s',
        }} />
      </div>

      {/* Score strip */}
      <div style={{
        display: 'flex', gap: 4, padding: '4px 10px', overflowX: 'auto',
        flexShrink: 0, borderBottom: '2px solid rgba(45,27,78,0.12)', alignItems: 'center',
      }}>
        {players.map(p => (
          <div key={p.uid} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '3px 8px', flexShrink: 0,
            background: p.uid === ds.drawerUid ? 'var(--bg-pink)' : 'rgba(45,27,78,0.06)',
            border: '2px solid var(--bg-dark-purple)',
          }}>
            <span style={{ fontSize: 14 }}>{AVATAR_EMOJIS[p.avatarId ?? 0]}</span>
            <span style={{
              fontSize: 10, fontWeight: 900,
              color: p.uid === ds.drawerUid ? '#FFF' : 'var(--bg-dark-purple)',
            }}>
              {ds.scores?.[p.uid] || 0}
            </span>
            {(ds.guessersDone || []).includes(p.uid) && p.uid !== ds.drawerUid && (
              <span style={{ fontSize: 9 }}>✅</span>
            )}
          </div>
        ))}
        <span style={{ marginRight: 'auto', fontSize: 10, color: 'var(--color-muted)', fontWeight: 700, flexShrink: 0, paddingRight: 4 }}>
          هدف: {scoreTarget}
        </span>
      </div>

      {/* Hint bar */}
      <div style={{
        textAlign: 'center', padding: '5px 16px',
        fontSize: 20, fontWeight: 900, letterSpacing: 8,
        color: 'var(--bg-dark-purple)', flexShrink: 0,
        direction: 'rtl', fontFamily: 'monospace',
      }}>
        {isDrawer ? ds.chosenWord : (ds.hint || '')}
      </div>

      {/* Canvas */}
      <div style={{
        flex: 1, padding: '0 10px 4px',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <div style={{
          flex: 1,
          border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)',
          background: '#FFF', position: 'relative', overflow: 'hidden',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block', width: '100%', height: '100%',
              touchAction: 'none',
              cursor: isDrawer ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
          {/* Already guessed overlay */}
          {!isDrawer && myAlreadyGuessed && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(57,255,20,0.12)',
              pointerEvents: 'none',
              fontSize: 48,
            }}>
              ✅
            </div>
          )}
        </div>
      </div>

      {/* Bottom: tools (drawer) or chat (guesser) */}
      {isDrawer ? (
        <div style={{ padding: '6px 10px 10px', flexShrink: 0, borderTop: '2px solid rgba(45,27,78,0.1)' }}>
          {/* Color palette */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('pen'); }}
                style={{
                  width: 26, height: 26, flexShrink: 0,
                  background: c,
                  border: `3px solid ${color === c && tool === 'pen' ? 'var(--bg-pink)' : 'var(--bg-dark-purple)'}`,
                  outline: color === c && tool === 'pen' ? '2px solid var(--bg-pink)' : 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          {/* Tool bar */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { id: 'thin',   label: '• رفيع' },
              { id: 'medium', label: '● وسط' },
              { id: 'thick',  label: '⬤ عريض' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => { setBrushSize(s.id); setTool('pen'); }}
                className={`btn ${brushSize === s.id && tool === 'pen' ? 'btn-pink' : 'btn-white'}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => setTool('eraser')}
              className={`btn ${tool === 'eraser' ? 'btn-pink' : 'btn-white'}`}
              style={{ padding: '4px 12px', fontSize: 14 }}
            >
              🧹
            </button>
            <button
              onClick={() => clearDrawCanvas(roomCode).catch(() => {})}
              className="btn btn-white"
              style={{ padding: '4px 12px', fontSize: 14 }}
            >
              🗑️
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '4px 10px 10px', flexShrink: 0, borderTop: '2px solid rgba(45,27,78,0.1)' }}>
          {/* Recent messages */}
          <div style={{ maxHeight: 56, overflowY: 'auto', marginBottom: 5 }}>
            {[...(ds.messages || [])].sort((a, b) => a.ts - b.ts).slice(-5).map((msg, i) => (
              <div key={i} style={{
                fontSize: 12, fontWeight: 700, direction: 'rtl', textAlign: 'right',
                color: msg.isCorrect ? 'var(--bg-green)' : 'var(--bg-dark-purple)',
                background: msg.isCorrect ? 'rgba(57,255,20,0.1)' : 'transparent',
                padding: '1px 6px',
              }}>
                <span style={{ color: 'var(--color-muted)' }}>{msg.username}: </span>
                {msg.isCorrect ? `✅ ${msg.text} (+${msg.points})` : msg.text}
              </div>
            ))}
          </div>
          {/* Input or done message */}
          {myAlreadyGuessed ? (
            <div style={{
              textAlign: 'center', fontSize: 14, fontWeight: 900,
              color: 'var(--bg-dark-purple)', padding: '8px',
              border: 'var(--brutal-border)', background: 'var(--bg-green)',
            }}>
              ✅ خمّنت صح! انتظر الباقين
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-field"
                placeholder="اكتب تخمينك..."
                value={guessInput}
                onChange={e => setGuessInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendGuess()}
                style={{ flex: 1, direction: 'rtl', fontSize: 15, padding: '8px 12px' }}
              />
              <button onClick={handleSendGuess} className="btn btn-pink" style={{ padding: '8px 16px', fontSize: 14 }}>
                إرسال
              </button>
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
