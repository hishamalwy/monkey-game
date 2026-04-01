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
  '#000000', '#545454', '#9E9E9E', '#FFFFFF',
  '#FF1744', '#FF6D00', '#FFD600', '#76FF03',
  '#00E5FF', '#2979FF', '#AA00FF', '#FF4081',
  '#FF8A80', '#FFCC80', '#FFFF8D', '#CCFF90',
  '#80DEEA', '#82B1FF', '#EA80FC', '#8D6E63',
];

const BRUSH_SIZES = { thin: 4, medium: 10, thick: 22, fat: 48 };

const TOOLS = [
  { id: 'pen',    icon: '✏️' },
  { id: 'glow',   icon: '✨' },
  { id: 'eraser', icon: '⬜' },
  { id: 'line',   icon: '📏' },
  { id: 'rect',   icon: '▭' },
  { id: 'circle', icon: '○' },
];

function drawStrokeOnCtx(ctx, stroke, W, H) {
  if (!stroke.points || stroke.points.length < 2) return;
  const pts = stroke.points;
  ctx.lineWidth = BRUSH_SIZES[stroke.size] || 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;

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
  } else if (stroke.type === 'rect') {
    const x = pts[0].x * W, y = pts[0].y * H;
    const w = (pts[pts.length - 1].x - pts[0].x) * W;
    const h = (pts[pts.length - 1].y - pts[0].y) * H;
    if (stroke.isFilled) { ctx.fillStyle = stroke.color; ctx.fillRect(x, y, w, h); }
    ctx.strokeRect(x, y, w, h);
    return;
  } else if (stroke.type === 'circle') {
    const x1 = pts[0].x * W, y1 = pts[0].y * H;
    const x2 = pts[pts.length - 1].x * W, y2 = pts[pts.length - 1].y * H;
    const r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    ctx.arc(x1, y1, r, 0, Math.PI * 2);
  } else if (stroke.type === 'triangle') {
    const x1 = pts[0].x * W, y1 = pts[0].y * H;
    const x2 = pts[pts.length - 1].x * W, y2 = pts[pts.length - 1].y * H;
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x1 - (x2 - x1), y2); ctx.closePath();
  } else {
    if (stroke.type === 'eraser') ctx.strokeStyle = stroke.bgFill || '#FFFFFF';
    ctx.moveTo(pts[0].x * W, pts[0].y * H);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * W, pts[i].y * H);
  }

  if (stroke.isFilled && ['circle', 'triangle'].includes(stroke.type)) {
    ctx.fillStyle = stroke.color; ctx.fill();
  }
  ctx.stroke();
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
  const colorRef = useRef('#000000'); // ref for always-fresh color in pointer handlers
  const toolRef = useRef('pen');
  const brushRef = useRef('medium');
  const isFilledRef = useRef(false);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState('medium');
  const [isFilled, setIsFilled] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const chatRef = useRef(null);
  const vh = useVisualViewport();

  // Keep refs in sync with state
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { brushRef.current = brushSize; }, [brushSize]);
  useEffect(() => { isFilledRef.current = isFilled; }, [isFilled]);

  const navRef = useRef(nav);
  useEffect(() => { navRef.current = nav; });

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

  // Canvas setup when round starts
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

  // Redraw strokes
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

  // Unified phase timer
  useEffect(() => {
    let interval;
    const status = ds?.roundStatus;
    const endsAt = status === 'drawing' ? ds.roundEndsAt : (status === 'choosing' ? ds.choosingEndsAt : null);
    if (endsAt) {
      const update = () => {
        const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
        setTimeLeft(left);
        if (left <= 0) {
          if (status === 'drawing' && isHost) endDrawRound(roomCode).catch(() => {});
          if (status === 'choosing' && isDrawer && (ds.wordOptions?.length || 0) > 0)
            chooseDrawWord(roomCode, ds.wordOptions[0]).catch(() => {});
        }
      };
      update();
      interval = setInterval(update, 1000);
    }
    return () => clearInterval(interval);
  }, [ds?.roundStatus, ds?.roundEndsAt, ds?.choosingEndsAt, isHost, isDrawer, roomCode, ds?.wordOptions]);

  // Auto scroll chat
  useEffect(() => {
    if (chatRef.current) setTimeout(() => { chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
  }, [ds?.messages]);

  // Auto-advance after reveal
  useEffect(() => {
    if (!ds || ds.roundStatus !== 'reveal' || !isHost) return;
    const id = setTimeout(() => nextDrawRound(roomCode).catch(() => {}), 4500);
    return () => clearTimeout(id);
  }, [ds?.roundStatus, isHost, roomCode]);

  // Hint cooldown
  useEffect(() => {
    if (hintCooldown <= 0) return;
    const id = setInterval(() => setHintCooldown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [hintCooldown]);

  // Canvas pointer helpers — use refs so color/tool are always fresh
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
    currentStrokeRef.current = {
      tool: toolRef.current,
      color: colorRef.current,
      size: brushRef.current,
      points: [pos],
      isFilled: isFilledRef.current,
    };
  }, [isDrawer, getCanvasPos]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const pts = currentStrokeRef.current.points;
    const t = toolRef.current;

    if (['line', 'rect', 'circle', 'triangle'].includes(t)) {
      currentStrokeRef.current.points = [pts[0], pos];
    } else {
      const last = pts[pts.length - 1];
      const dist = Math.sqrt(Math.pow(pos.x - last.x, 2) + Math.pow(pos.y - last.y, 2));
      if (dist < 0.005) return;
      pts.push(pos);
    }

    const canvas = canvasRef.current;
    if (canvas && pts.length >= 2) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = (ds?.bgFill) || '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      (ds?.strokes || []).forEach(s => drawStrokeOnCtx(ctx, s, canvas.width, canvas.height));
      drawStrokeOnCtx(ctx, { ...currentStrokeRef.current, type: t }, canvas.width, canvas.height);
    }
  }, [isDrawer, getCanvasPos, ds?.strokes, ds?.bgFill]);

  const handlePointerUp = useCallback(async () => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const stroke = { ...currentStrokeRef.current, type: toolRef.current, bgFill: ds?.bgFill || '#FFFFFF' };
    currentStrokeRef.current = null;
    if (stroke.points.length >= 2) {
      lastStrokesLen.current = (ds?.strokes?.length || 0) + 1;
      await addStroke(roomCode, stroke).catch(() => {});
    }
  }, [isDrawer, roomCode, ds?.strokes?.length, ds?.bgFill]);

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

  if (!room || !ds) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a2a6c', color: 'white', fontSize: 32 }}>🎨</div>
  );

  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const drawerPlayer = room.players[ds.drawerUid];
  const myAlreadyGuessed = (ds.guessersDone || []).includes(myUid);
  const isLowTime = (timeLeft ?? 0) <= 10 && (timeLeft ?? 0) > 0;

  // ────────────────────────────────────────────
  // CHOOSING PHASE
  // ────────────────────────────────────────────
  if (ds.roundStatus === 'choosing') {
    return (
      <div style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#1a2a6c 0%,#b21f1f 50%,#fdbb2d 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
          <button onClick={() => setShowExitConfirm(true)} style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 12, padding: '6px 14px', fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>✕</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700 }}>جولة</div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 900 }}>{ds.currentRound}</div>
          </div>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 20 }}>
            {timeLeft}
          </div>
        </div>

        <div className="slide-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 24px' }}>
          {isDrawer ? (
            <div style={{ width: '100%', maxWidth: 340 }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 52, marginBottom: 8 }}>🎨</div>
                <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>اختر كلمتك!</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700, margin: '8px 0 0' }}>أنت الرسام لهذه الجولة</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(ds.wordOptions || []).map((word, i) => (
                  <button
                    key={word}
                    onClick={() => chooseDrawWord(roomCode, word)}
                    style={{
                      padding: '18px 24px', fontSize: 20, fontWeight: 900,
                      background: 'rgba(255,255,255,0.95)', color: '#1a2a6c',
                      border: 'none', borderRadius: 18,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
                      transform: 'translateY(0)',
                      transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                      animation: `slideUp 0.3s ease ${i * 0.1}s both`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
                <UserAvatar avatarId={drawerPlayer?.avatarId ?? 0} size={80} />
                <div style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 24, background: 'white', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>🎨</div>
              </div>
              <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: '0 0 8px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                {drawerPlayer?.username}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 700, margin: 0 }}>بيختار الكلمة...</p>
              <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: `pop 1.2s ease ${i * 0.3}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {showExitConfirm && <ExitConfirmModal onCancel={() => setShowExitConfirm(false)} onConfirm={handleExit} />}
        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </div>
    );
  }

  // ────────────────────────────────────────────
  // REVEAL PHASE
  // ────────────────────────────────────────────
  if (ds.roundStatus === 'reveal') {
    const roundScores = ds.roundScores || {};
    const sortedPlayers = [...players].sort((a, b) => (ds.scores?.[b.uid] || 0) - (ds.scores?.[a.uid] || 0));
    return (
      <div style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#0f2027 0%,#203a43 50%,#2c5364 100%)', overflow: 'hidden' }}>
        <div className="slide-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 8, animation: 'pop 0.5s ease' }}>🎉</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>الكلمة كانت</div>
          <div style={{ color: 'white', fontSize: 32, fontWeight: 900, marginBottom: 28, textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>{ds.chosenWord}</div>
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedPlayers.map((p, i) => {
              const gained = roundScores[p.uid] || 0;
              const total = ds.scores?.[p.uid] || 0;
              return (
                <div key={p.uid} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: i === 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.08)',
                  borderRadius: 14, border: i === 0 ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: 16, width: 24, textAlign: 'center' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </div>
                  <UserAvatar avatarId={p.avatarId ?? 0} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 900, fontSize: 14 }}>{p.username}</div>
                  </div>
                  {gained > 0 && (
                    <div style={{ color: '#76FF03', fontWeight: 900, fontSize: 13 }}>+{gained}</div>
                  )}
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{total}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20, color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700 }}>الجولة التالية قريباً...</div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────
  // DRAWING PHASE
  // ────────────────────────────────────────────
  const scoreTarget = ds.scoreTarget || room.scoreTarget || 100;

  return (
    <div style={{
      width: '100%', height: vh,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #1e3c72 0%, #2a5298 100%)',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', flexShrink: 0,
      }}>
        <button
          onClick={() => setShowExitConfirm(true)}
          style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: 10, padding: '5px 12px', fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
        >✕</button>

        {/* Drawer info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '4px 10px', flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <UserAvatar avatarId={drawerPlayer?.avatarId ?? 0} size={28} />
            <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: 10 }}>🎨</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>الرسام</div>
            <div style={{ color: 'white', fontSize: 12, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawerPlayer?.username}</div>
          </div>
        </div>

        {/* Round */}
        <div style={{ textAlign: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '4px 10px' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700 }}>جولة</div>
          <div style={{ color: 'white', fontSize: 14, fontWeight: 900 }}>{ds.currentRound}</div>
        </div>

        {/* Timer */}
        <div style={{
          width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
          background: isLowTime ? 'rgba(255,71,87,0.8)' : 'rgba(255,255,255,0.15)',
          border: `3px solid ${isLowTime ? '#FF4757' : 'rgba(255,255,255,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: 17,
          transition: 'all 0.3s',
          animation: isLowTime ? 'pulse-soft 0.6s infinite' : 'none',
        }}>
          {timeLeft}
        </div>
      </div>

      {/* ── WORD / HINT ── */}
      <div style={{
        padding: '6px 12px 8px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {isDrawer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '8px 16px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700 }}>ترسم:</span>
            <span style={{ color: '#FFD600', fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>{ds.chosenWord}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '90%' }}>
            {(ds.hint || '').split('').map((ch, i) => (
              ch === ' ' ? (
                <div key={i} style={{ width: 8 }} />
              ) : (
                <div key={i} style={{
                  width: ch !== '_' ? 'auto' : 22, minWidth: 22,
                  height: 32, borderRadius: 6,
                  background: ch !== '_' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.15)',
                  border: `2px solid ${ch !== '_' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#1e3c72', fontWeight: 900, fontSize: 15,
                  padding: ch !== '_' ? '0 4px' : 0,
                  transition: 'all 0.3s',
                  boxShadow: ch !== '_' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}>
                  {ch !== '_' ? ch : ''}
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* ── SCORES STRIP ── */}
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {players.map(p => {
          const score = ds.scores?.[p.uid] || 0;
          const isDrawing = p.uid === ds.drawerUid;
          const guessed = (ds.guessersDone || []).includes(p.uid);
          return (
            <div key={p.uid} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              minWidth: 54, padding: '6px 8px', borderRadius: 12, flexShrink: 0,
              background: isDrawing ? 'rgba(255,214,0,0.25)' : guessed ? 'rgba(118,255,3,0.2)' : 'rgba(255,255,255,0.1)',
              border: `1.5px solid ${isDrawing ? 'rgba(255,214,0,0.5)' : guessed ? 'rgba(118,255,3,0.4)' : 'rgba(255,255,255,0.15)'}`,
            }}>
              <div style={{ position: 'relative' }}>
                <UserAvatar avatarId={p.avatarId ?? 0} size={26} />
                {isDrawing && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 10 }}>🎨</span>}
                {guessed && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 10 }}>✅</span>}
              </div>
              <div style={{ color: 'white', fontSize: 10, fontWeight: 900, textAlign: 'center', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</div>
              <div style={{
                color: '#FFD600', fontSize: 11, fontWeight: 900,
                background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '1px 6px',
              }}>{score}</div>
              {/* Score progress bar */}
              <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: '#FFD600', width: `${Math.min(100, (score / scoreTarget) * 100)}%`, transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CANVAS ── */}
      <div style={{
        flex: '1 1 auto', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'relative',
          aspectRatio: '1/1',
          width: '100%',
          maxWidth: 'min(calc(100dvh - 430px), 100%)',
          maxHeight: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          border: '3px solid rgba(255,255,255,0.2)',
        }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          {myAlreadyGuessed && !isDrawer && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(118,255,3,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, pointerEvents: 'none' }}>✅</div>
          )}
        </div>
      </div>

      {/* ── DRAWER TOOLS ── */}
      {isDrawer && (
        <div style={{ padding: '8px 10px', flexShrink: 0 }}>
          {/* Color palette */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', padding: '4px 2px', marginBottom: 6, scrollbarWidth: 'none' }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }}
                style={{
                  minWidth: 28, width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: c,
                  border: color === c ? '3px solid #FFD600' : '2px solid rgba(255,255,255,0.3)',
                  boxShadow: color === c ? '0 0 0 2px rgba(255,214,0,0.5), 0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.2)',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                  cursor: 'pointer',
                  outline: c === '#FFFFFF' ? '1px solid rgba(255,255,255,0.4)' : 'none',
                }}
              />
            ))}
          </div>

          {/* Row 1 — tools + brush sizes (horizontally scrollable) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            overflowX: 'auto', scrollbarWidth: 'none',
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
            borderRadius: '12px 12px 0 0', padding: '6px 8px',
            border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
          }}>
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => setTool(t.id)} style={{
                width: 36, height: 36, minWidth: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: tool === t.id ? 'rgba(255,214,0,0.3)' : 'transparent',
                outline: tool === t.id ? '2px solid #FFD600' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                transition: 'all 0.15s', flexShrink: 0,
              }}>
                {t.icon}
              </button>
            ))}

            <div style={{ width: 1, minWidth: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 4px', flexShrink: 0 }} />

            {Object.entries(BRUSH_SIZES).map(([name, px]) => (
              <button key={name} onClick={() => setBrushSize(name)} style={{
                width: 36, height: 36, minWidth: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: brushSize === name ? 'rgba(255,214,0,0.3)' : 'transparent',
                outline: brushSize === name ? '2px solid #FFD600' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
                <div style={{ width: Math.min(px, 22), height: Math.min(px, 22), borderRadius: '50%', background: 'white', opacity: brushSize === name ? 1 : 0.45 }} />
              </button>
            ))}
          </div>

          {/* Row 2 — actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(10px)',
            borderRadius: '0 0 12px 12px', padding: '5px 8px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <button onClick={() => setIsFilled(!isFilled)} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer', background: isFilled ? 'rgba(255,214,0,0.3)' : 'transparent', outline: isFilled ? '2px solid #FFD600' : '2px solid transparent', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isFilled ? '⬛' : '⬜'}
            </button>
            <button onClick={() => fillBackground(roomCode, color)} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🪣</button>
            <button onClick={() => undoLastStroke(roomCode)} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↩️</button>
            <button onClick={() => clearDrawCanvas(roomCode)} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>

            <div style={{ flex: 1 }} />

            <button
              onClick={() => !ds.powerupUsed && freezeDrawTime(roomCode)}
              disabled={ds.powerupUsed}
              style={{
                padding: '5px 10px', borderRadius: 9, border: 'none', cursor: ds.powerupUsed ? 'default' : 'pointer',
                background: ds.powerupUsed ? 'rgba(255,255,255,0.05)' : 'rgba(0,229,255,0.2)',
                color: ds.powerupUsed ? 'rgba(255,255,255,0.3)' : '#00E5FF',
                fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 3,
                outline: ds.powerupUsed ? 'none' : '1px solid rgba(0,229,255,0.4)',
              }}
            >
              {ds.powerupUsed ? '⏳' : '❄️'} +15ث
            </button>

            <button
              onClick={() => { if (ds.hintRevealCount < (ds.wordLength || 0) - 1 && hintCooldown <= 0) { revealHint(roomCode); setHintCooldown(12); } }}
              disabled={ds.hintRevealCount >= (ds.wordLength || 0) - 1 || hintCooldown > 0}
              style={{
                padding: '5px 10px', borderRadius: 9, border: 'none',
                cursor: hintCooldown > 0 ? 'default' : 'pointer',
                background: 'rgba(255,214,0,0.2)',
                color: hintCooldown > 0 ? 'rgba(255,255,255,0.4)' : '#FFD600',
                fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: 12,
                outline: '1px solid rgba(255,214,0,0.3)',
              }}
            >
              {hintCooldown > 0 ? `${hintCooldown}ث` : '💡 حرف'}
            </button>
          </div>
        </div>
      )}

      {/* ── GUESSER AREA ── */}
      {!isDrawer && (
        <div style={{ padding: '4px 10px 10px', flexShrink: 0 }}>
          {/* Messages */}
          <div
            ref={chatRef}
            style={{
              maxHeight: 90, overflowY: 'auto', marginBottom: 6,
              display: 'flex', flexDirection: 'column', gap: 4,
              scrollbarWidth: 'none',
            }}
          >
            {(ds.messages || []).slice(-8).map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', flexDirection: 'row-reverse' }}>
                <span style={{ color: m.isCorrect ? '#76FF03' : 'rgba(255,255,255,0.7)', fontWeight: 900, fontSize: 11, flexShrink: 0 }}>{m.username}:</span>
                <span style={{
                  background: m.isCorrect ? 'rgba(118,255,3,0.2)' : 'rgba(255,255,255,0.1)',
                  color: m.isCorrect ? '#76FF03' : 'rgba(255,255,255,0.85)',
                  border: `1px solid ${m.isCorrect ? 'rgba(118,255,3,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                }}>
                  {m.isCorrect && m.uid !== myUid ? '✅ خمّن الكلمة!' : m.text}
                </span>
              </div>
            ))}
          </div>

          {/* Input */}
          {!myAlreadyGuessed ? (
            <div style={{
              display: 'flex', gap: 8,
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)',
              borderRadius: 14, padding: '6px 8px',
              border: '1.5px solid rgba(255,255,255,0.2)',
            }}>
              <input
                value={guessInput}
                onChange={e => setGuessInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendGuess()}
                placeholder="اكتب تخمينك..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'white', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14,
                  direction: 'rtl',
                }}
              />
              <button
                onClick={handleSendGuess}
                style={{
                  background: '#2979FF', border: 'none', color: 'white',
                  borderRadius: 10, padding: '6px 16px', cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: 13,
                }}
              >
                خمّن
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#76FF03', fontWeight: 900, fontSize: 14, padding: '8px', background: 'rgba(118,255,3,0.1)', borderRadius: 14, border: '1px solid rgba(118,255,3,0.3)' }}>
              ✅ أحسنت! خمّنت الكلمة
            </div>
          )}
        </div>
      )}

      {/* Also show chat for drawer (read-only) */}
      {isDrawer && (
        <div style={{ padding: '4px 10px 10px', flexShrink: 0 }}>
          <div style={{ maxHeight: 60, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, scrollbarWidth: 'none' }}>
            {(ds.messages || []).slice(-4).map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', flexDirection: 'row-reverse' }}>
                <span style={{ color: m.isCorrect ? '#76FF03' : 'rgba(255,255,255,0.6)', fontWeight: 900, fontSize: 10, flexShrink: 0 }}>{m.username}:</span>
                <span style={{ color: m.isCorrect ? '#76FF03' : 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700 }}>
                  {m.isCorrect ? '✅ خمّن!' : '...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showExitConfirm && <ExitConfirmModal onCancel={() => setShowExitConfirm(false)} onConfirm={handleExit} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function ExitConfirmModal({ onCancel, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card slide-up" style={{ padding: 28, width: '100%', maxWidth: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🚪</div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 10px' }}>تغادر الغرفة؟</h3>
        <p style={{ fontSize: 14, color: 'var(--bg-dark-purple)', opacity: 0.6, marginBottom: 20 }}>ستخسر نقاطك الحالية.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} className="btn btn-white" style={{ flex: 1, padding: 14 }}>لأ</button>
          <button onClick={onConfirm} className="btn btn-pink" style={{ flex: 1, padding: 14 }}>اخرج</button>
        </div>
      </div>
    </div>
  );
}
