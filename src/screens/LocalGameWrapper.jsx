import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import GameScreen from '../components/GameScreen';
import { appCategories } from '../data/categories';
import { playAiTurn, normalizeArabic } from '../utils/aiLogic';
import { playSound, startHorn, stopHorn } from '../utils/audio';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import hero from '../assets/hero.png';

const MONKEY_LIMIT = 4;

// ── helpers ──────────────────────────────────────────────────────
function nextActive(fromIdx, players) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIdx + i) % n;
    if ((players[idx].quarterMonkeys || 0) < MONKEY_LIMIT) return idx;
  }
  return -1; // everyone eliminated
}

function activePlayers(players) {
  return players.filter(p => (p.quarterMonkeys || 0) < MONKEY_LIMIT);
}

const MonkeySVG = ({ qm }) => {
  const pct = Math.min((qm / 4) * 100, 100);
  return (
    <svg viewBox="0 0 100 100" width="32" height="32" style={{ overflow: 'visible', margin: '2px 0', opacity: qm === 0 ? 0.35 : 1 }}>
      <rect x="0" y="0" width="100" height="100" fill="#e0e0e0" mask="url(#global-monkey-mask)" />
      {qm > 0 && <rect x="0" y={100 - pct} width="100" height="100" fill="var(--bg-dark-purple)" mask="url(#global-monkey-mask)" style={{ transition: 'y 0.5s ease-out' }} />}
      
      <g fill="none" stroke="var(--bg-dark-purple)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M 68 80 Q 95 95 90 60 Q 90 40 75 60" />
        <circle cx="26" cy="36" r="10" />
        <circle cx="74" cy="36" r="10" />
        <path d="M 32 47 h 36 v 32 q 0 10 -18 10 q -18 0 -18 -10 Z" />
        <circle cx="50" cy="32" r="20" />
      </g>
    </svg>
  );
};

// ── Setup screen ─────────────────────────────────────────────────
function SetupPanel({ onStart, onBack }) {
  const { userProfile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(appCategories[0].id);
  const [timeLimit, setTimeLimit] = useState(15);

  const start = () => {
    playSound('click');
    const players = [
      { id:1, name: userProfile?.username || 'أنت', quarterMonkeys:0, avatarEmoji: AVATAR_EMOJIS[userProfile?.avatarId || 0] },
      { id:2, name:'كمبيوتر 🤖', quarterMonkeys:0, isAi:true }
    ];
    onStart(players, true, timeLimit, selectedCategory);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', padding:'var(--space-md)', overflow:'hidden' }}>
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--space-xl) var(--space-lg)', gap: 'var(--space-lg)', overflowY: 'auto' }}>
        <h1 className="title-glitch" style={{ textAlign:'center', margin:'0 0 var(--space-md) 0', fontSize: 'clamp(1.6rem, 5vw, 2rem)' }}>إعداد اللعبة</h1>
        
        {/* Settings Group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Category */}
          <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); playSound('click'); }} className="input-field" style={{ padding: '12px var(--space-md)', fontSize: 16 }}>
            {appCategories.map(cat => ( <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option> ))}
          </select>

          {/* Timer */}
          <div style={{ display:'flex', gap: 'var(--space-xs)' }}>
            {[0, 10, 15, 20].map(t => (
              <button key={t} onClick={() => { setTimeLimit(t); playSound('click'); }} className={`btn ${timeLimit===t ? 'btn-yellow' : 'btn-white'}`} style={{ flex:1, padding:'10px', fontSize:14 }}>
                {t===0 ? '∞' : t+' ثانية'}
              </button>
            ))}
          </div>
        </div>

        {/* Action Group */}
        <div style={{ marginTop: 'auto', display:'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-xl)' }}>
          <button onClick={onBack} className="btn btn-white" style={{ padding:'12px', fontSize:16, flex: 0.35 }}>رجوع</button>
          <button onClick={start} className="btn btn-pink" style={{ flex:1, padding:'12px', fontSize:18 }}>🚀 ابدأ</button>
        </div>
      </div>
    </div>
  );
}
// ── PlayerRow was defined here and is unused since the header renders inline. Removing unused PlayerRow to polish code. ──


// ── Main local game ───────────────────────────────────────────────
export default function LocalGameWrapper({ nav }) {
  const [gameState, setGameState] = useState('setup'); // setup | playing | result | gameover
  const [players, setPlayers] = useState([]);
  const [isAgainstAi, setIsAgainstAi] = useState(false);
  const [timeLimit, setTimeLimit] = useState(15);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [activeCategory, setActiveCategory] = useState(appCategories[0]);
  const [normalizedWords, setNormalizedWords] = useState(appCategories[0].words.map(w => normalizeArabic(w)));
  const [resultMessage, setResultMessage] = useState('');
  const [resultTitle, setResultTitle] = useState('');
  const [isHonking, setIsHonking] = useState(false);
  const [winner, setWinner] = useState(null);

  // Timer
  useEffect(() => {
    let tid;
    if (gameState === 'playing' && timeLimit > 0) {
      if (timeRemaining > 0) {
        tid = setTimeout(() => {
          setTimeRemaining(p => p - 1);
          if (timeRemaining <= 4) playSound('tick');
        }, 1000);
      } else {
        handlePenalty(currentPlayerIndex, 'انتهى الوقت! ⏰');
      }
    }
    return () => clearTimeout(tid);
  }, [gameState, timeLimit, timeRemaining, currentPlayerIndex]);

  // AI turn
  useEffect(() => {
    let mounted = true;
    if (gameState==='playing' && isAgainstAi && players[currentPlayerIndex]?.isAi) {
      const run = async () => {
        const res = await playAiTurn(currentWord, 0.15, activeCategory.words);
        if (!mounted || gameState!=='playing') return;
        if (res.action==='challenge') handleChallenge();
        else if (res.action==='letter') handleLetterPress(res.letter);
      };
      run();
    }
    return () => { mounted = false; };
  }, [currentPlayerIndex, gameState, currentWord]);

  const startGame = (playersList, aiMode, limit, categoryId='countries') => {
    const cat = appCategories.find(c => c.id===categoryId) || appCategories[0];
    setActiveCategory(cat);
    setNormalizedWords(cat.words.map(w => normalizeArabic(w)));
    setPlayers(playersList);
    setIsAgainstAi(aiMode);
    setTimeLimit(limit);
    setCurrentWord('');
    setCurrentPlayerIndex(0);
    setTimeRemaining(limit);
    setWinner(null);
    setGameState('playing');
  };

  const handleLetterPress = useCallback((letter) => {
    const nextWord = currentWord + letter;
    setCurrentWord(nextWord);
    const norm = normalizeArabic(nextWord);
    const exactIdx = normalizedWords.findIndex(w => w === norm);
    if (exactIdx !== -1) {
      playSound('win');
      setResultTitle('اكتملت الكلمة! ✓ 🎉');
      setResultMessage(`الإجابة الصحيحة هي: ${activeCategory.words[exactIdx]}`);
      setGameState('result');
      return;
    }
    // advance to next active player
    setCurrentPlayerIndex(prev => {
      // find next non-eliminated
      const n = players.length;
      for (let i = 1; i <= n; i++) {
        const idx = (prev + i) % n;
        if ((players[idx].quarterMonkeys || 0) < MONKEY_LIMIT) return idx;
      }
      return prev;
    });
    setTimeRemaining(timeLimit);
  }, [currentWord, players, timeLimit, normalizedWords, activeCategory]);

  const handleDelete = useCallback(() => {
    if (currentWord.length > 0) setCurrentWord(p => p.slice(0, -1));
  }, [currentWord]);

  // Physical keyboard (only for active, non-eliminated, non-AI player)
  useEffect(() => {
    const onKey = (e) => {
      if (gameState !== 'playing') return;
      if ((players[currentPlayerIndex]?.quarterMonkeys||0) >= MONKEY_LIMIT) return;
      if (isAgainstAi && players[currentPlayerIndex]?.isAi) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key==='Backspace'||e.key==='Delete') { e.preventDefault(); handleDelete(); return; }
      if (/^[\u0600-\u06FF\s]$/.test(e.key)) { e.preventDefault(); playSound('click'); handleLetterPress(e.key); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, isAgainstAi, players, currentPlayerIndex, handleLetterPress, handleDelete]);

  const handleChallenge = () => {
    playSound('alert');
    const challengerIdx = currentPlayerIndex;
    const prevIdx = currentPlayerIndex===0 ? players.length-1 : currentPlayerIndex-1;
    const normalizedWord = normalizeArabic(currentWord);
    const isPrefixValid = normalizedWords.some(w => w.startsWith(normalizedWord));
    if (isPrefixValid) {
      const validWord = activeCategory.words[normalizedWords.findIndex(w => w.startsWith(normalizedWord))];
      handlePenalty(challengerIdx, `التحدي خاسر! يمكن أن تكمل لتصبح: ${validWord}`);
    } else {
      handlePenalty(prevIdx, `التحدي ناجح! لا توجد كلمة تبدأ بـ: ${currentWord}`);
    }
  };

  const handlePenalty = (loserIndex, reason) => {
    playSound('lose');
    const newPlayers = [...players];
    const newQm = (newPlayers[loserIndex].quarterMonkeys || 0) + 1;
    newPlayers[loserIndex] = { ...newPlayers[loserIndex], quarterMonkeys: newQm };
    setPlayers(newPlayers);

    // Check game over
    const remaining = newPlayers.filter(p => (p.quarterMonkeys||0) < MONKEY_LIMIT);
    if (remaining.length <= 1) {
      setWinner(remaining[0] || newPlayers[0]);
      setResultTitle('انتهت اللعبة! 🏆');
      setResultMessage(`${remaining[0]?.name || ''} فاز باللعبة!`);
      setGameState('gameover');
      return;
    }

    setResultTitle('خسارة! 🙈');
    setResultMessage(`${newPlayers[loserIndex].name} أخذ ربع قرد! ${reason}`);
    setCurrentPlayerIndex(loserIndex);
    setGameState('result');
  };

  const nextRound = () => {
    // start from loser, find next active
    const next = nextActive(currentPlayerIndex, players);
    setCurrentWord('');
    setCurrentPlayerIndex(next >= 0 ? next : 0);
    setTimeRemaining(timeLimit);
    setGameState('playing');
  };

  const isEliminated = gameState==='playing'
    && (players[currentPlayerIndex]?.quarterMonkeys||0) >= MONKEY_LIMIT;

  // Horn
  const hornStart = () => { setIsHonking(true); startHorn(); };
  const hornEnd = () => { setIsHonking(false); stopHorn(); };
  useEffect(() => () => stopHorn(), []);

  // ── Setup ──
  if (gameState==='setup') return <SetupPanel onStart={startGame} onBack={nav.toHome} />;

  return (
    <div style={{
      width:'100%', height:'100%',
      display:'flex', flexDirection:'column',
      overflow:'hidden',
    }}>
      {/* ── Top Bar ── */}
      <header style={{
        padding: '16px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <h2 className="title-glitch" style={{ margin: 0, fontSize: 24, transform: 'none' }}>{activeCategory?.emoji || ''} كلكس!</h2>
        <button
          onClick={() => { stopHorn(); setGameState('setup'); }}
          className="btn btn-white"
          style={{ padding: '8px 16px', fontSize: 14 }}
        >
          ✕ خروج
        </button>
      </header>

      {/* ── Floating Players Dock ── */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', gap: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        flexShrink: 0,
        position: 'relative',
      }}>
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <mask id="global-monkey-mask">
              <circle cx="50" cy="32" r="20" fill="white" />
              <circle cx="26" cy="36" r="10" fill="white" />
              <circle cx="74" cy="36" r="10" fill="white" />
              <path d="M 32 47 h 36 v 32 q 0 10 -18 10 q -18 0 -18 -10 Z" fill="white" />
              <path d="M 68 80 Q 95 95 90 60 Q 90 40 75 60" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" />
            </mask>
          </defs>
        </svg>
        
        {players.map((p, idx) => {
          const qm = p.quarterMonkeys || 0;
          const eliminated = qm >= MONKEY_LIMIT;
          const isActive = idx === currentPlayerIndex && !eliminated;

          return (
            <div key={p.id} className="card slide-up" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 12px', minWidth: 70, flexShrink: 0,
              background: isActive ? 'var(--bg-pink)' : '#FFF',
              border: isActive ? '3px solid var(--bg-dark-purple)' : '3px solid var(--bg-dark-purple)',
              boxShadow: isActive ? '4px 4px 0px var(--bg-dark-purple)' : '2px 2px 0px rgba(45,27,78,0.2)',
              transform: isActive ? 'translateY(-4px)' : 'none',
              opacity: eliminated ? 0.45 : 1,
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <span style={{ fontSize: 20, filter: eliminated ? 'grayscale(1)' : 'none', marginBottom: 4 }}>
                {p.avatarEmoji || AVATAR_EMOJIS[idx % AVATAR_EMOJIS.length]}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 900,
                color: isActive ? '#FFF' : 'var(--bg-dark-purple)',
                marginBottom: 6
              }}>
                {eliminated ? '💀' : p.name.slice(0, 8)}
              </span>
              <MonkeySVG qm={qm} />
            </div>
          );
        })}
      </div>

      {/* ── Game area (Modern Integrated View) ── */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        position: 'relative',
        background: 'var(--color-card)',
        borderTop: 'var(--brutal-border)',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
        marginTop: 8
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '15rem', opacity: 0.05, pointerEvents: 'none' }}>
          {activeCategory?.emoji}
        </div>
        {gameState === 'playing' && (
          <GameScreen
            currentWord={currentWord}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
            currentPlayer={players[currentPlayerIndex]}
            isAiTurn={(isAgainstAi && players[currentPlayerIndex]?.isAi) || isEliminated}
            onKeyPress={handleLetterPress}
            onDelete={handleDelete}
            onChallenge={handleChallenge}
          />
        )}

        {/* Round result overlay */}
        {gameState === 'result' && (
          <div className="slide-up" style={{
            position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(28,16,63,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20,
            borderRadius: '32px 32px 0 0'
          }}>
            <div className="card" style={{ padding: '32px 22px', width: '100%', maxWidth: 400, textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🙈</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-pink)', margin: '0 0 10px' }}>{resultTitle}</h2>
              <p style={{ fontSize: 14, color: 'var(--bg-dark-purple)', marginBottom: 20, fontWeight: 700 }}>{resultMessage}</p>
              <button className="btn btn-pink" onClick={nextRound} style={{ width: '100%', padding: '14px', fontSize: 16 }}>
                🔄 الجولة التالية
              </button>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {gameState === 'gameover' && (
          <div className="slide-up" style={{
            position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(28,16,63,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden',
            borderRadius: '32px 32px 0 0'
          }}>
            <div className="card" style={{ padding: '36px 24px', width: '100%', maxWidth: 380, textAlign: 'center', zIndex: 1 }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>
                {winner?.avatarEmoji || AVATAR_EMOJIS[players.indexOf(winner) % AVATAR_EMOJIS.length] || '🏆'}
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 6px' }}>{winner?.name}</h2>
              <p style={{ fontSize: 16, color: 'var(--bg-pink)', fontWeight: 900, marginBottom: 24 }}>🏆 فاز باللعبة!</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-white" onClick={() => setGameState('setup')} style={{ flex: 1, padding: '14px', fontSize: 14 }}>إعادة</button>
                <button className="btn btn-pink" onClick={nav.toHome} style={{ flex: 1, padding: '14px', fontSize: 14 }}>الرئيسية</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Floating Horn Button (FAB) ── */}
      {gameState === 'playing' && (
        <button
          onMouseDown={hornStart} onMouseUp={hornEnd} onMouseLeave={hornEnd}
          onTouchStart={e => { e.preventDefault(); hornStart(); }}
          onTouchEnd={e => { e.preventDefault(); hornEnd(); }}
          className={`btn ${isHonking ? 'btn-pink' : 'btn-yellow'}`}
          style={{
            position: 'absolute',
            bottom: 24, left: 24,
            width: 72, height: 72, borderRadius: '50%',
            padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, zIndex: 100,
          }}
        >
          📯
        </button>
      )}
    </div>
  );
}
