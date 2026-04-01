import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/ui/UserAvatar';
import { listenToRoom } from '../firebase/rooms';
import {
  chooseDrawWord, submitDrawGuess, addStroke, clearDrawCanvas,
  fillBackground, endDrawRound, nextDrawRound, revealHint,
} from '../firebase/drawRooms';
import Toast from '../components/ui/Toast';

const COLORS = [
  '#1C1040', '#FFFFFF', '#6B7280', '#D1D5DB', // Dark, White, Gray, Light Gray
  '#FF006E', '#4361EE', '#39FF14', '#FFE300', // Pink, Blue, Green, Yellow
  '#FF6B00', '#8B4513', '#7209B7', '#480CA8', // Orange, Brown, Purple, Deep Purple
  '#F72585', '#4CC9F0', '#B5179E', '#560BAD', // Hot Pink, Sky Blue, Magenta, Indigo
  '#E63946', '#A8DADC', '#457B9D', '#1D3557', // Red, Aqua, Steel, Navy
];
const BRUSH_SIZES = { thin: 3, medium: 8, thick: 18, fat: 40 };

function drawStrokeOnCtx(ctx, stroke, W, H) {
  if (!stroke.points || stroke.points.length < 2) return;
  const pts = stroke.points;
  ctx.beginPath();
  ctx.strokeStyle = stroke.tool === 'eraser' ? (stroke.bgFill || '#FFFFFF') : stroke.color;
  ctx.lineWidth = BRUSH_SIZES[stroke.size] || 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

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
    ctx.stroke();
  }
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
  const [tool, setTool] = useState('pen'); // pen, eraser, line, rect, circle, triangle
  const [color, setColor] = useState('#1C1040');
  const [brushSize, setBrushSize] = useState('medium');
  const chatRef = useRef(null);

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

  // --- Auto scroll chat ---
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [ds?.messages]);

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
    
    if (['line', 'rect', 'circle', 'triangle'].includes(tool)) {
      currentStrokeRef.current.points = [pts[0], pos];
    } else {
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
    if ((ds.guessersDone || []).includes(myUid)) return;
    setGuessInput('');
    await submitDrawGuess(roomCode, myUid, userProfile.username, text, room?.drawTime || 80);
  };

  if (!room || !ds) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎨</div>;

  const players = (room.playerOrder || []).map(uid => room.players[uid]).filter(Boolean);
  const drawerPlayer = room.players[ds.drawerUid];
  const myAlreadyGuessed = (ds.guessersDone || []).includes(myUid);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', borderBottom: '3px solid var(--bg-dark-purple)', flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{ds.currentRound}/{ds.totalRounds}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserAvatar avatarId={drawerPlayer?.avatarId ?? 0} size={24} />
          <span style={{ fontSize: 13, fontWeight: 900 }}>{isDrawer ? '🎨 ارسم!' : `${drawerPlayer?.username} يرسم`}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{timeLeft ?? ''}</div>
      </div>

      {/* Shapes & Colors (Drawer Only) */}
      {isDrawer && ds.roundStatus === 'drawing' && (
        <div style={{ padding: '6px 10px', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginBottom: 8 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }}
                style={{ height: 18, background: c, border: `2px solid ${color === c ? 'var(--bg-pink)' : 'var(--bg-dark-purple)'}` }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['pen', 'line', 'rect', 'circle', 'triangle', 'eraser'].map(t => (
              <button key={t} onClick={() => setTool(t)} className={`btn ${tool === t ? 'btn-pink' : 'btn-white'}`} style={{ padding: '4px 8px' }}>
                {t === 'pen' ? '✏️' : t === 'line' ? '📏' : t === 'rect' ? '⬜' : t === 'circle' ? '⭕' : t === 'triangle' ? '△' : '🧹'}
              </button>
            ))}
            {['thin', 'medium', 'thick', 'fat'].map(s => (
              <button key={s} onClick={() => setBrushSize(s)} className={`btn ${brushSize === s ? 'btn-pink' : 'btn-white'}`} style={{ padding: '4px 8px' }}>
                {s === 'thin' ? '•' : s === 'medium' ? '●' : s === 'thick' ? '⬤' : '⬛'}
              </button>
            ))}
            <button onClick={() => fillBackground(roomCode, color)} className="btn btn-white" style={{ padding: '4px 8px' }}>🪣</button>
            <button onClick={() => clearDrawCanvas(roomCode)} className="btn btn-white" style={{ padding: '4px 8px' }}>🗑️</button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div style={{ flex: 1, position: 'relative', background: '#eee', padding: 10 }}>
        <div style={{ width: '100%', height: '100%', background: '#fff', border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)', overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', touchAction: 'none' }}
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
          {myAlreadyGuessed && !isDrawer && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(57,255,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>✅</div>
          )}
        </div>
      </div>

      {/* Guessing Area */}
      {!isDrawer && ds.roundStatus === 'drawing' && (
        <div style={{ padding: 10, borderTop: 'var(--brutal-border)' }}>
          <div ref={chatRef} style={{ maxHeight: 100, overflowY: 'auto', marginBottom: 8 }}>
            {(ds.messages || []).map((m, i) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 2, textAlign: 'right' }}>
                <span style={{ fontWeight: 900 }}>{m.username}:</span> {m.isCorrect && m.uid !== myUid ? 'خمّن الكلمة! ✅' : m.text}
              </div>
            ))}
          </div>
          {!myAlreadyGuessed && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={guessInput} onChange={e => setGuessInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendGuess()}
                placeholder="اكتب تخمينك..." className="input-field" style={{ flex: 1 }} />
              <button onClick={handleSendGuess} className="btn btn-pink">إرسال</button>
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

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
