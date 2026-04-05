import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/ui/UserAvatar';
import { listenToRoom } from '../firebase/rooms';
import {
  chooseDrawWord, submitDrawGuess, addStroke, clearDrawCanvas,
  endDrawRound, nextDrawRound, revealHint, undoLastStroke,
  revealWordLength,
} from '../firebase/drawRooms';
import ExitConfirmModal from '../components/shared/ExitConfirmModal';
import Toast from '../components/ui/Toast';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { leaveRoom } from '../firebase/rooms';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

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
  } else {
    if (stroke.type === 'eraser') ctx.strokeStyle = stroke.bgFill || '#FFFFFF';
    ctx.moveTo(pts[0].x * W, pts[0].y * H);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * W, pts[i].y * H);
  }
  if (stroke.isFilled && ['circle'].includes(stroke.type)) { ctx.fillStyle = stroke.color; ctx.fill(); }
  ctx.stroke();
}

export default function DrawGameScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
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
  const colorRef = useRef('#000000');
  const toolRef = useRef('pen');
  const brushRef = useRef('medium');
  const isFilledRef = useRef(false);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize] = useState('medium');
  const [isFilled] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const chatRef = useRef(null);
  const vh = useVisualViewport();

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { brushRef.current = brushSize; }, [brushSize]);
  useEffect(() => { isFilledRef.current = isFilled; }, [isFilled]);

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { nav.toHome(); return; }
      setRoom(data);
      if (data.status === 'draw_over') nav.toDrawGameOver();
    });
    return unsub;
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const ds = room?.drawState;
  const myUid = userProfile?.uid;
  const isDrawer = ds?.drawerUid === myUid;
  const isHost = room?.hostUid === myUid;

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
  }, [ds?.roundStatus, ds?.bgFill]);

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

  useEffect(() => {
    if (chatRef.current) setTimeout(() => { chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
  }, [ds?.messages]);

  useEffect(() => {
    if (!ds || ds.roundStatus !== 'reveal' || !isHost) return;
    const id = setTimeout(() => nextDrawRound(roomCode).catch(() => {}), 4500);
    return () => clearTimeout(id);
  }, [ds?.roundStatus, isHost, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hintCooldown <= 0) return;
    const id = setInterval(() => setHintCooldown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [hintCooldown]);

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
    currentStrokeRef.current = { tool: toolRef.current, color: colorRef.current, size: brushRef.current, points: [pos], isFilled: isFilledRef.current };
  }, [isDrawer, getCanvasPos]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const pts = currentStrokeRef.current.points;
    const t = toolRef.current;

    if (['line', 'rect', 'circle'].includes(t)) {
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
    if (stroke.points.length >= 2) await addStroke(roomCode, stroke).catch(() => {});
  }, [isDrawer, roomCode, ds?.bgFill]);

  const handleSendGuess = async () => {
    const text = guessInput.trim();
    if (!text || !ds || ds.roundStatus !== 'drawing' || isDrawer) return;
    const myAlreadyGuessed = (ds.guessersDone || []).includes(myUid);
    if (myAlreadyGuessed) return;
    setGuessInput('');
    await submitDrawGuess(roomCode, myUid, userProfile.username, text, room?.drawTime || 80);
  };

  const handleExit = async () => { await leaveRoom(roomCode, myUid, isHost); nav.toHome(); };

  if (!room || !ds) return <div style={{ width: '100%', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-game-bg)', color: 'var(--game-text)', fontSize: 32 }}>🎨</div>;

  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const drawerPlayer = room.players[ds.drawerUid];
  const myAlreadyGuessed = (ds.guessersDone || []).includes(myUid);
  const isLowTime = (timeLeft ?? 0) <= 10 && (timeLeft ?? 0) > 0;

  if (ds.roundStatus === 'choosing') {
    return (
      <div className="brutal-bg" style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
          <button onClick={() => setShowExitConfirm(true)} className="btn btn-white" style={{ width: 44, height: 44, fontSize: 18, borderRadius: '12px' }}>✕</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--bg-dark-purple)', fontSize: 20, fontWeight: 950 }}>جولة {ds.currentRound}</div>
          </div>
          <div className="card" style={{ 
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            background: 'var(--bg-dark-purple)', color: '#FFE300', fontWeight: 950, 
            borderRadius: '12px', boxShadow: 'none' 
          }}>{timeLeft}</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 5 }}>
          {isDrawer ? (
            <div className="wizard-card card" style={{ width: '100%', maxWidth: 360, padding: 24, borderRadius: '24px', textAlign: 'center' }}>
              <h2 style={{ color: 'var(--bg-dark-purple)', fontWeight: 950, marginBottom: 24, fontSize: 24 }}>اختر كلمتك! 🤔</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(ds.wordOptions || []).map((word) => (
                  <button 
                    key={word} 
                    onClick={() => chooseDrawWord(roomCode, word)} 
                    className="btn btn-yellow" 
                    style={{ padding: '20px', fontSize: 22, borderRadius: '16px' }}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '32px', borderRadius: '24px', textAlign: 'center', background: '#FFF' }}>
              <UserAvatar avatarId={drawerPlayer?.avatarId ?? 1} size={100} style={{ margin: '0 auto' }} />
              <h3 style={{ color: 'var(--bg-dark-purple)', marginTop: 20, fontWeight: 950, fontSize: 20 }}>
                {drawerPlayer?.username} بيختار كلمة... ✍️
              </h3>
            </div>
          )}
        </div>
        {showExitConfirm && <ExitConfirmModal onCancel={() => setShowExitConfirm(false)} onConfirm={handleExit} />}
        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </div>
    );
  }

  if (ds.roundStatus === 'reveal') {
    const roundScores = ds.roundScores || {};
    const sortedPlayers = [...players].sort((a, b) => (ds.scores?.[b.uid] || 0) - (ds.scores?.[a.uid] || 0));
    return (
      <div className="brutal-bg" style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
           <h2 style={{ color: 'var(--bg-dark-purple)', fontWeight: 950, fontSize: 24, margin: 0 }}>النتائج 📊</h2>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 5 }}>
          <div className="wizard-card card" style={{ width: '100%', maxWidth: 380, padding: 24, borderRadius: '24px', background: '#FFF' }}>
            <div style={{ color: 'var(--bg-pink)', fontSize: 16, fontWeight: 950, marginBottom: 4 }}>الكلمة كانت</div>
            <div style={{ color: 'var(--bg-dark-purple)', fontSize: 36, fontWeight: 950, marginBottom: 24 }}>{ds.chosenWord}</div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedPlayers.map((p) => (
                <div key={p.uid} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: p.uid === ds.drawerUid ? 'var(--bg-yellow)' : '#FFF', borderRadius: '12px', border: '3px solid var(--bg-dark-purple)', boxShadow: 'none' }}>
                  <UserAvatar avatarId={p.avatarId ?? 1} size={36} />
                  <div style={{ flex: 1, color: 'var(--bg-dark-purple)', fontWeight: 950, textAlign: 'right', fontSize: 15 }}>{p.username}</div>
                  {roundScores[p.uid] > 0 && <div style={{ color: 'var(--bg-green)', fontWeight: 950, fontSize: 16 }}>+{roundScores[p.uid]}</div>}
                  <div style={{ color: 'var(--bg-dark-purple)', fontWeight: 950, fontSize: 18, minWidth: 40, textAlign: 'left' }}>{ds.scores?.[p.uid] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="brutal-bg" style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* ── HEADER ── */}
      <div className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between', padding: '10px 16px', position: 'relative', zIndex: 10 }}>
        <button onClick={() => setShowExitConfirm(true)} className="btn btn-white" style={{ width: 40, height: 40, fontSize: 16, borderRadius: '10px' }}>✕</button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-yellow)', padding: '4px 12px', borderRadius: '12px', border: '3px solid var(--bg-dark-purple)', boxShadow: 'none' }}>
            <UserAvatar avatarId={drawerPlayer?.avatarId ?? 1} size={28} />
            <div style={{ color: 'var(--bg-dark-purple)', fontSize: 13, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>{drawerPlayer?.username}</div>
          </div>
        </div>
        <div className="card" style={{ 
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', 
          background: isLowTime ? 'var(--bg-pink)' : 'var(--bg-dark-purple)', 
          color: isLowTime ? '#FFF' : '#FFE300', fontWeight: 950, 
          borderRadius: '12px', border: '3px solid var(--bg-dark-purple)', 
          boxShadow: isLowTime ? '4px 4px 0 var(--bg-dark-purple)' : 'none',
          animation: isLowTime ? 'pulse 1s infinite' : 'none'
        }}>
          {timeLeft}
        </div>
      </div>

      {/* ── WORD HINT ── */}
      <div style={{ padding: '10px', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        {isDrawer ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF', padding: '12px 24px', borderRadius: '16px', border: '4px solid var(--bg-pink)', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>
            <span style={{ color: 'var(--bg-dark-purple)', fontSize: 14, fontWeight: 950 }}>الكلمة:</span>
            <span style={{ color: 'var(--bg-pink)', fontSize: 24, fontWeight: 950 }}>{ds.chosenWord}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {ds.showWordLength ? (ds.hint || '').split('').map((ch, i) => (
              ch === ' ' ? <div key={i} style={{ width: 10 }} /> :
              <div key={i} className="pop" style={{ 
                width: 28, height: 38, background: ch !== '_' ? 'var(--bg-yellow)' : '#FFF', 
                border: '3px solid var(--bg-dark-purple)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: 'var(--bg-dark-purple)', fontWeight: 950, fontSize: 18,
                boxShadow: ch !== '_' ? '3px 3px 0 var(--bg-dark-purple)' : 'none',
                borderRadius: '6px'
              }}>{ch !== '_' ? ch : ''}</div>
            )) : (
              <div className="card" style={{ color: 'var(--bg-dark-purple)', fontSize: 14, fontWeight: 950, background: '#FFF', padding: '8px 20px', borderRadius: '12px', border: '3px solid var(--bg-dark-purple)' }}>
                يختفي عدد الحروف... 🔒
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CANVAS AREA ── */}
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px 16px', position: 'relative', zIndex: 5, overflow: 'hidden' }}>
        <div className="card" style={{ position: 'relative', aspectRatio: '1/1', width: 'min(85vw, 360px)', overflow: 'hidden', padding: 0, borderRadius: '20px', background: '#FFF', border: '4px solid var(--bg-dark-purple)', boxShadow: '8px 8px 0 var(--bg-dark-purple)' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
          {myAlreadyGuessed && !isDrawer && (
            <div className="slide-up" style={{ position: 'absolute', inset: 0, background: 'rgba(0, 224, 109, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="card" style={{ background: '#FFF', width: 80, height: 80, borderRadius: '20px', border: '4px solid var(--bg-green)', color: 'var(--bg-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: '6px 6px 0 var(--bg-dark-purple)' }}>✓</div>
            </div>
          )}
        </div>
      </div>

      {/* ── PLAYERS STRIP ── */}
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none', position: 'relative', zIndex: 10 }}>
        {players.map(p => {
          const isMe = p.uid === myUid;
          const guessed = ds.guessersDone?.includes(p.uid);
          const isCurrentDrawer = p.uid === ds.drawerUid;
          return (
            <div key={p.uid} className="card" style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64, padding: '8px', 
              background: guessed ? 'var(--bg-green)' : (isCurrentDrawer ? 'var(--bg-yellow)' : '#FFF'), 
              borderRadius: '12px', border: isMe ? '3px solid var(--bg-pink)' : '3px solid var(--bg-dark-purple)',
              boxShadow: isMe ? '4px 4px 0 var(--bg-pink)' : 'none'
            }}>
              <UserAvatar avatarId={p.avatarId ?? 1} size={30} />
              <div style={{ color: 'var(--bg-dark-purple)', fontSize: 10, fontWeight: 950, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textWidth: 50 }}>{p.username.slice(0,8)}</div>
              <div style={{ color: 'var(--bg-dark-purple)', fontSize: 12, fontWeight: 950 }}>{ds.scores?.[p.uid] || 0}</div>
            </div>
          );
        })}
      </div>

      {/* ── BOTTOM AREA: TOOLS OR CHAT ── */}
      <div className="card" style={{ flex: '0 0 auto', background: '#FFF', borderTop: '4px solid var(--bg-dark-purple)', borderBottom: 'none', borderLeft: 'none', borderRight: 'none', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: '32px 32px 0 0', padding: '16px 16px 30px', position: 'relative', zIndex: 20, boxShadow: '0 -4px 10px rgba(0,0,0,0.1)' }}>
        {isDrawer ? (
          <div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
              {COLORS.map(c => (
                <button 
                  key={c} 
                  onClick={() => setColor(c)} 
                  style={{ 
                    minWidth: 32, height: 32, background: c, borderRadius: '50%',
                    border: color === c ? '3px solid var(--bg-dark-purple)' : '2px solid rgba(0,0,0,0.1)',
                    transform: color === c ? 'scale(1.2)' : 'none',
                    transition: 'all 0.1s ease',
                    cursor: 'pointer'
                  }} 
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 4, background: '#F0F0F0', borderRadius: '12px', padding: '4px' }}>
                {TOOLS.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setTool(t.id)} 
                    className={`nav-item ${tool === t.id ? 'active' : ''}`}
                    style={{ width: 44, height: 44, fontSize: 20, minWidth: 'unset', padding: 0 }}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => undoLastStroke(roomCode)} className="btn btn-white" style={{ width: 44, height: 44, borderRadius: '12px' }}>↩️</button>
              <button onClick={() => clearDrawCanvas(roomCode)} className="btn btn-pink" style={{ width: 44, height: 44, borderRadius: '12px' }}>🗑️</button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                disabled={timeLeft > (room.drawTime || 80) / 2 || ds.showWordLength} 
                onClick={() => revealWordLength(roomCode)} 
                className={`btn ${ds.showWordLength ? 'btn-green' : 'btn-yellow'}`} 
                style={{ flex: 1, padding: '12px', fontSize: 13, borderRadius: '12px' }}
              >
                {ds.showWordLength ? 'تم الكشف ✅' : 'إظهار العدد 🔢'}
              </button>
              <button 
                onClick={() => { if (ds.hintRevealCount < (ds.wordLength || 0) - 1 && hintCooldown <= 0) { revealHint(roomCode); setHintCooldown(12); } }} 
                disabled={ds.hintRevealCount >= (ds.wordLength || 0) - 1 || hintCooldown > 0} 
                className="btn btn-white" 
                style={{ flex: 1, padding: '12px', fontSize: 13, borderRadius: '12px' }}
              >
                {hintCooldown > 0 ? `${hintCooldown}ث` : '💡 تلميح'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
            <div ref={chatRef} style={{ height: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'none' }}>
              {(ds.messages || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse', alignItems: 'center' }}>
                  <div style={{ 
                    background: m.isCorrect ? 'var(--bg-green)' : '#F0F0F0', 
                    color: 'var(--bg-dark-purple)', padding: '6px 14px', 
                    borderRadius: '12px', fontSize: 14, fontWeight: 950,
                    border: m.isCorrect ? '2px solid var(--bg-dark-purple)' : 'none'
                  }}>
                    {m.isCorrect && m.uid !== myUid ? 'خمّن الكلمة! 🎉' : m.text}
                  </div>
                  <span style={{ color: 'var(--bg-dark-purple)', opacity: 0.6, fontWeight: 950, fontSize: 11 }}>{m.username}</span>
                </div>
              ))}
            </div>
            {!myAlreadyGuessed ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <input 
                  value={guessInput} 
                  onChange={e => setGuessInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSendGuess()} 
                  placeholder="اكتب تخمينك..." 
                  className="input-field"
                  style={{ flex: 1, borderRadius: '12px', padding: '12px 18px', boxShadow: 'none' }}
                />
                <button onClick={handleSendGuess} className="btn btn-yellow" style={{ padding: '0 20px', borderRadius: '12px' }}>خمّن</button>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', color: '#FFF', background: 'var(--bg-green)', fontWeight: 950, fontSize: 16, padding: '12px', borderRadius: '12px', border: '3px solid var(--bg-dark-purple)' }}>
                خمّنت صح! برافو عليك ✅
              </div>
            )}
          </div>
        )}
      </div>

      {showExitConfirm && <ExitConfirmModal onCancel={() => setShowExitConfirm(false)} onConfirm={handleExit} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
