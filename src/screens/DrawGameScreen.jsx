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
      <div style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', background: 'var(--color-game-bg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
          <button onClick={() => setShowExitConfirm(true)} className="btn btn-white" style={{ padding: '6px 14px', fontSize: 14 }}>✕</button>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--game-text)', fontSize: 18, fontWeight: 900 }}>جولة {ds.currentRound}</div></div>
          <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF', color: 'var(--bg-dark-purple)', fontWeight: 900, border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)' }}>{timeLeft}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {isDrawer ? (
            <div style={{ width: '100%', maxWidth: 340 }}>
              <h2 style={{ color: 'var(--game-text)', textAlign: 'center', fontWeight: 900, marginBottom: 20 }}>اختر كلمتك!</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(ds.wordOptions || []).map((word) => (
                  <button key={word} onClick={() => chooseDrawWord(roomCode, word)} className="btn btn-yellow" style={{ padding: '18px', fontSize: 20 }}>{word}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <UserAvatar avatarId={drawerPlayer?.avatarId ?? 0} size={80} />
              <h3 style={{ color: 'var(--game-text)', marginTop: 12 }}>{drawerPlayer?.username} بيختار...</h3>
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
      <div style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', background: 'var(--color-game-bg)', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ color: 'var(--game-text-muted)', marginBottom: 4 }}>الكلمة كانت</div>
          <div style={{ color: 'var(--game-text)', fontSize: 32, fontWeight: 900, marginBottom: 24 }}>{ds.chosenWord}</div>
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedPlayers.map((p) => (
              <div key={p.uid} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: '#FFF' }}>
                <UserAvatar avatarId={p.avatarId ?? 0} size={36} />
                <div style={{ flex: 1, color: 'var(--bg-dark-purple)', fontWeight: 900 }}>{p.username}</div>
                {roundScores[p.uid] > 0 && <div style={{ color: 'var(--bg-green)', fontWeight: 900 }}>+{roundScores[p.uid]}</div>}
                <div style={{ color: 'var(--bg-dark-purple)', fontWeight: 900 }}>{ds.scores?.[p.uid] || 0}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: vh, display: 'flex', flexDirection: 'column', background: 'var(--color-game-bg)', overflow: 'hidden' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', flexShrink: 0 }}>
        <button onClick={() => setShowExitConfirm(true)} className="btn btn-white" style={{ padding: '5px 12px', fontSize: 14 }}>✕</button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--game-surface)', padding: '4px 10px', border: '2px solid var(--game-text)', boxShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}>
          <UserAvatar avatarId={drawerPlayer?.avatarId ?? 0} size={28} />
          <div style={{ color: 'var(--game-text)', fontSize: 12, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>{drawerPlayer?.username}</div>
        </div>
        <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isLowTime ? 'var(--game-danger)' : 'var(--game-surface-strong)', color: 'var(--game-text)', fontWeight: 900, border: `3px solid ${isLowTime ? '#FFF' : 'var(--game-text)'}`, boxShadow: isLowTime ? '3px 3px 0 #FFF' : '2px 2px 0 rgba(0,0,0,0.2)' }}>{timeLeft}</div>
      </div>

      {/* ── WORD HINT ── */}
      <div style={{ padding: '8px', flexShrink: 0, display: 'flex', justifyContent: 'center', minHeight: 48 }}>
        {isDrawer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--game-surface)', padding: '8px 16px', border: '3px solid var(--game-accent)', boxShadow: '3px 3px 0 rgba(0,0,0,0.2)' }}>
            <span style={{ color: 'var(--game-text-muted)', fontSize: 13 }}>الكلمة:</span>
            <span style={{ color: 'var(--game-accent)', fontSize: 22, fontWeight: 900 }}>{ds.chosenWord}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {ds.showWordLength ? (ds.hint || '').split('').map((ch, i) => (
              ch === ' ' ? <div key={i} style={{ width: 10 }} /> :
              <div key={i} style={{ width: 22, height: 32, background: ch !== '_' ? '#FFF' : 'var(--game-surface)', border: `3px solid ${ch !== '_' ? 'var(--bg-dark-purple)' : 'var(--game-text)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-dark-purple)', fontWeight: 900, boxShadow: ch !== '_' ? '2px 2px 0 var(--bg-dark-purple)' : 'none' }}>{ch !== '_' ? ch : ''}</div>
            )) : <div style={{ color: 'var(--game-text-muted)', fontSize: 13, background: 'var(--game-surface)', padding: '5px 15px', border: '2px solid var(--game-text)' }}>يختفي عدد الحروف... 🔒</div>}
          </div>
        )}
      </div>

      {/* ── SCORES STRIP ── */}
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {players.map(p => (
          <div key={p.uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 50, padding: '6px', background: p.uid === ds.drawerUid ? 'var(--game-surface-strong)' : (ds.guessersDone?.includes(p.uid) ? 'rgba(118,255,3,0.15)' : 'var(--game-surface)'), border: `2px solid ${p.uid === ds.drawerUid ? 'var(--game-accent)' : (ds.guessersDone?.includes(p.uid) ? 'var(--game-success)' : 'var(--game-text)')}` }}>
            <UserAvatar avatarId={p.avatarId ?? 0} size={24} />
            <div style={{ color: 'var(--game-text)', fontSize: 9, fontWeight: 900, marginTop: 2 }}>{p.username.slice(0,6)}</div>
            <div style={{ color: 'var(--game-accent)', fontSize: 10, fontWeight: 900 }}>{ds.scores?.[p.uid] || 0}</div>
          </div>
        ))}
      </div>

      {/* ── CANVAS AREA ── */}
      <div style={{ flex: '0 0 auto', padding: '0 10px 10px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', aspectRatio: '1/1', width: 'min(90vw, 360px)', overflow: 'hidden', border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)', background: '#FFF' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
          {myAlreadyGuessed && !isDrawer && <div style={{ position: 'absolute', inset: 0, background: 'rgba(118,255,3,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: '#FFF', width: 60, height: 60, border: '4px solid var(--bg-green)', color: 'var(--bg-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '3px 3px 0 var(--bg-dark-purple)' }}>✅</div></div>}
        </div>
      </div>

      {/* ── BOTTOM AREA: TOOLS OR CHAT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isDrawer ? (
          <div style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 8 }}>
              {COLORS.map(c => <button key={c} onClick={() => setColor(c)} style={{ minWidth: 30, height: 30, background: c, border: color === c ? '3px solid var(--game-accent)' : '2px solid var(--game-text-muted)', cursor: 'pointer' }} />)}
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--game-surface)', border: '2px solid var(--game-text)', padding: '8px' }}>
              {TOOLS.map(t => <button key={t.id} onClick={() => setTool(t.id)} style={{ width: 40, height: 40, background: tool === t.id ? 'var(--game-surface-strong)' : 'none', border: tool === t.id ? '2px solid var(--game-accent)' : '2px solid transparent' }}>{t.icon}</button>)}
              <div style={{ flex: 1 }} />
              <button onClick={() => undoLastStroke(roomCode)} style={{ width: 40, height: 40, background: 'none', border: '2px solid var(--game-text)' }}>↩️</button>
              <button onClick={() => clearDrawCanvas(roomCode)} style={{ width: 40, height: 40, background: 'none', border: '2px solid var(--game-text)' }}>🗑️</button>
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--game-surface)', borderTop: 'none', border: '2px solid var(--game-text)', padding: '8px' }}>
              <button disabled={timeLeft > (room.drawTime || 80) / 2 || ds.showWordLength} onClick={() => revealWordLength(roomCode)} className="btn" style={{ flex: 1, padding: '10px', background: ds.showWordLength ? 'var(--game-surface)' : 'var(--game-surface-strong)', color: 'var(--game-text)', border: '2px solid var(--game-text)', fontSize: 13, fontWeight: 900 }}>{ds.showWordLength ? 'تم الكشف ✅' : 'إظهار العدد 🔢'}</button>
              <button onClick={() => { if (ds.hintRevealCount < (ds.wordLength || 0) - 1 && hintCooldown <= 0) { revealHint(roomCode); setHintCooldown(12); } }} disabled={ds.hintRevealCount >= (ds.wordLength || 0) - 1 || hintCooldown > 0} className="btn" style={{ flex: 1, padding: '10px', background: 'var(--game-surface)', color: 'var(--game-text)', border: '2px solid var(--game-text)', fontSize: 13, fontWeight: 900 }}>{hintCooldown > 0 ? `${hintCooldown}ث` : '💡 تلميح'}</button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 12px 10px' }}>
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, scrollbarWidth: 'none', paddingBottom: 10 }}>
              {(ds.messages || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, flexDirection: 'row-reverse', alignItems: 'center' }}>
                  <span style={{ color: 'var(--game-text-muted)', fontWeight: 900, fontSize: 11 }}>{m.username}:</span>
                  <span style={{ background: m.isCorrect ? 'rgba(118,255,3,0.2)' : 'var(--game-surface)', color: 'var(--game-text)', padding: '4px 12px', border: m.isCorrect ? '2px solid var(--game-success)' : '2px solid var(--game-text)', fontSize: 13 }}>{m.isCorrect && m.uid !== myUid ? 'خمّن!' : m.text}</span>
                </div>
              ))}
            </div>
            {!myAlreadyGuessed ? (
              <div style={{ display: 'flex', gap: 8, background: 'var(--game-surface)', padding: '8px 12px', border: '3px solid var(--game-text)', boxShadow: '3px 3px 0 rgba(0,0,0,0.2)', flexShrink: 0 }}>
                <input value={guessInput} onChange={e => setGuessInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendGuess()} placeholder="اكتب تخمينك..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--game-text)', fontWeight: 700, direction: 'rtl', fontFamily: 'Cairo, sans-serif' }} />
                <button onClick={handleSendGuess} className="btn btn-yellow" style={{ padding: '6px 16px', fontSize: 14 }}>خمّن</button>
              </div>
            ) : <div style={{ textAlign: 'center', color: 'var(--game-success)', fontWeight: 900, fontSize: 15, padding: '10px', background: 'rgba(118,255,3,0.1)', border: '3px solid var(--game-success)' }}>✅ خمّنت صلح!</div>}
          </div>
        )}
      </div>

      {showExitConfirm && <ExitConfirmModal onCancel={() => setShowExitConfirm(false)} onConfirm={handleExit} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
