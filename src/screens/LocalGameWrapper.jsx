import { useState, useEffect, useCallback } from 'react';
import GameScreen from '../components/GameScreen';
import ScoreBoard from '../components/ScoreBoard';
import { appCategories } from '../data/categories';
import { playAiTurn, normalizeArabic } from '../utils/aiLogic';
import { playSound } from '../utils/audio';
import { AVATAR_EMOJIS } from '../components/ui/AvatarPicker';
import hero from '../assets/hero.png';

// Setup screen embedded
function SetupPanel({ onStart, onBack }) {
  const [selectedCategory, setSelectedCategory] = useState(appCategories[0].id);
  const [playerCount, setPlayerCount] = useState(2);
  const [isAi, setIsAi] = useState(false);
  const [timeLimit, setTimeLimit] = useState(15);
  const [playerNames, setPlayerNames] = useState(['لاعب ١', 'لاعب ٢', 'لاعب ٣', 'لاعب ٤', 'لاعب ٥', 'لاعب ٦', 'لاعب ٧', 'لاعب ٨']);
  const timeLimits = [0, 10, 15, 20, 30];

  const start = () => {
    playSound('click');
    const players = isAi
      ? [
          { id: 1, name: playerNames[0] || 'أنت', quarterMonkeys: 0 },
          { id: 2, name: 'كمبيوتر 🤖', quarterMonkeys: 0, isAi: true },
        ]
      : Array.from({ length: playerCount }, (_, i) => ({
          id: i + 1, name: playerNames[i] || `لاعب ${i + 1}`, quarterMonkeys: 0,
        }));
    onStart(players, isAi, timeLimit, selectedCategory);
  };

  const updateName = (i, val) => {
    const n = [...playerNames]; n[i] = val; setPlayerNames(n);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: '100dvh', padding: '20px',
      background: 'var(--color-bg)', overflowY: 'auto',
    }}>
      <div className="slide-up" style={{
        width: '100%', maxWidth: 420,
        background: '#FFFFFF', borderRadius: 28,
        padding: '32px 24px',
        boxShadow: '0 8px 40px rgba(28,16,64,0.12)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={hero} alt="monkey" style={{ width: 60, height: 60, objectFit: 'contain' }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: '8px 0 0', color: 'var(--color-header)' }}>
            ربع قرد
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>ضد الكمبيوتر أو مع الأصدقاء</p>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>الفئة</label>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {appCategories.map(cat => (
              <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); playSound('click'); }}
                className="btn" style={{
                  flex: '0 0 auto', padding: '9px 13px', fontSize: 13, whiteSpace: 'nowrap',
                  background: selectedCategory === cat.id ? 'var(--color-success)' : 'rgba(28,16,64,0.06)',
                  color: selectedCategory === cat.id ? 'white' : 'var(--color-muted)',
                  border: 'none',
                }}>
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['👥 مع الأصدقاء', false], ['🤖 ضد الكمبيوتر', true]].map(([label, val]) => (
            <button key={String(val)} onClick={() => { setIsAi(val); playSound('click'); }}
              className="btn" style={{
                flex: 1, padding: '10px 6px', fontSize: 13,
                background: isAi === val ? 'var(--color-primary)' : 'rgba(28,16,64,0.06)',
                color: isAi === val ? 'white' : 'var(--color-muted)',
                border: 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Player Count */}
        {!isAi && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>عدد اللاعبين</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[2,3,4,5,6,7,8].map(n => (
                <button key={n} onClick={() => { setPlayerCount(n); playSound('click'); }}
                  className="btn" style={{
                    width: 38, height: 38, fontSize: 14,
                    background: playerCount === n ? 'var(--color-primary)' : 'rgba(28,16,64,0.06)',
                    color: playerCount === n ? 'white' : 'var(--color-muted)',
                    border: 'none', borderRadius: 10,
                  }}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {/* Names */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>أسماء اللاعبين</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: isAi ? 1 : playerCount }).map((_, i) => (
              <input key={i} value={playerNames[i]} onChange={e => updateName(i, e.target.value)}
                className="input-field" placeholder={`اسم اللاعب ${i + 1}`} />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>⏱ وقت الجولة</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {timeLimits.map(t => (
              <button key={t} onClick={() => { setTimeLimit(t); playSound('click'); }}
                className="btn" style={{
                  flex: 1, padding: '8px 4px', fontSize: 13,
                  background: timeLimit === t ? 'var(--color-secondary)' : 'rgba(28,16,64,0.06)',
                  color: timeLimit === t ? 'white' : 'var(--color-muted)',
                  border: 'none',
                }}>
                {t === 0 ? '∞' : t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '14px 18px', fontSize: 15 }}>
            ← رجوع
          </button>
          <button onClick={start} className="btn btn-primary" style={{ flex: 1, padding: '14px', fontSize: 17 }}>
            🚀 ابدأ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main local game logic (extracted from original App.jsx) ───
export default function LocalGameWrapper({ nav }) {
  const [gameState, setGameState] = useState('setup');
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

  // Timer
  useEffect(() => {
    let timerId;
    if (gameState === 'playing' && timeLimit > 0) {
      if (timeRemaining > 0) {
        timerId = setTimeout(() => {
          setTimeRemaining(prev => prev - 1);
          if (timeRemaining <= 4) playSound('tick');
        }, 1000);
      } else {
        handlePenalty(currentPlayerIndex, 'انتهى الوقت! ⏰');
      }
    }
    return () => clearTimeout(timerId);
  }, [gameState, timeLimit, timeRemaining, currentPlayerIndex]);

  // AI turn
  useEffect(() => {
    let isMounted = true;
    if (gameState === 'playing' && isAgainstAi && players[currentPlayerIndex]?.isAi) {
      const runAi = async () => {
        const res = await playAiTurn(currentWord, 0.15, activeCategory.words);
        if (!isMounted || gameState !== 'playing') return;
        if (res.action === 'challenge') handleChallenge();
        else if (res.action === 'letter') handleLetterPress(res.letter);
      };
      runAi();
    }
    return () => { isMounted = false; };
  }, [currentPlayerIndex, gameState, currentWord]);

  const startGame = (playersList, aiMode, limit, categoryId = 'countries') => {
    const cat = appCategories.find(c => c.id === categoryId) || appCategories[0];
    setActiveCategory(cat);
    setNormalizedWords(cat.words.map(w => normalizeArabic(w)));
    setPlayers(playersList);
    setIsAgainstAi(aiMode);
    setTimeLimit(limit);
    setCurrentWord('');
    setCurrentPlayerIndex(0);
    setTimeRemaining(limit);
    setGameState('playing');
  };

  const handleLetterPress = useCallback((letter) => {
    const nextWord = currentWord + letter;
    setCurrentWord(nextWord);
    const normalizedNextWord = normalizeArabic(nextWord);
    const exactMatchIndex = normalizedWords.findIndex(w => w === normalizedNextWord);
    if (exactMatchIndex !== -1) {
      playSound('win');
      setResultTitle('اكتملت الكلمة! ✓ 🎉');
      setResultMessage(`الإجابة الصحيحة هي: ${activeCategory.words[exactMatchIndex]}`);
      setGameState('result');
      return;
    }
    const nextIndex = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextIndex);
    setTimeRemaining(timeLimit);
  }, [currentWord, currentPlayerIndex, players.length, timeLimit, normalizedWords, activeCategory]);

  const handleDelete = useCallback(() => {
    if (currentWord.length > 0) setCurrentWord(prev => prev.slice(0, -1));
  }, [currentWord]);

  // Physical keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      if (isAgainstAi && players[currentPlayerIndex]?.isAi) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); handleDelete(); return; }
      const arabicRegex = /^[\u0600-\u06FF\s]$/;
      if (arabicRegex.test(e.key)) { e.preventDefault(); playSound('click'); handleLetterPress(e.key); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isAgainstAi, players, currentPlayerIndex, handleLetterPress, handleDelete]);

  const handleChallenge = () => {
    playSound('alert');
    const challengerIdx = currentPlayerIndex;
    const prevIdx = currentPlayerIndex === 0 ? players.length - 1 : currentPlayerIndex - 1;
    const normalizedWord = normalizeArabic(currentWord);
    const isPrefixValid = normalizedWords.some(w => w.startsWith(normalizedWord));
    if (isPrefixValid) {
      const validWord = activeCategory.words[normalizedWords.findIndex(w => w.startsWith(normalizedWord))];
      handlePenalty(challengerIdx, `التحدي خاسر! الكلمة يمكن أن تكمل لتصبح: ${validWord}`);
    } else {
      handlePenalty(prevIdx, `التحدي ناجح! لا توجد كلمة تبدأ بـ: ${currentWord}`);
    }
  };

  const handlePenalty = (loserIndex, reason) => {
    playSound('lose');
    const newPlayers = [...players];
    newPlayers[loserIndex] = { ...newPlayers[loserIndex], quarterMonkeys: newPlayers[loserIndex].quarterMonkeys + 1 };
    setPlayers(newPlayers);
    setResultTitle('خسارة! 🙈');
    setResultMessage(`${newPlayers[loserIndex].name} أخذ ربع قرد! ${reason}`);
    setCurrentPlayerIndex(loserIndex);
    setGameState('result');
  };

  const nextRound = () => {
    setCurrentWord('');
    setTimeRemaining(timeLimit);
    setGameState('playing');
  };

  if (gameState === 'setup') {
    return <SetupPanel onStart={startGame} onBack={nav.toHome} />;
  }

  return (
    <div style={{
      width: '100vw', height: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg)', overflow: 'hidden',
    }}>
      <header style={{
        padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(28,16,64,0.08)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-header)' }}>
          {activeCategory?.emoji} {activeCategory?.name}
        </div>
        <button className="btn btn-ghost" onClick={() => setGameState('setup')}
          style={{ padding: '6px 12px', fontSize: 13, borderRadius: 10 }}>
          إنهاء
        </button>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {gameState === 'playing' && (
          <>
            <div style={{ padding: '10px 8px 0' }}>
              <ScoreBoard players={players} currentPlayerIndex={currentPlayerIndex} />
            </div>
            <GameScreen
              currentWord={currentWord}
              timeRemaining={timeRemaining}
              timeLimit={timeLimit}
              currentPlayer={players[currentPlayerIndex]}
              isAiTurn={isAgainstAi && players[currentPlayerIndex]?.isAi}
              onKeyPress={handleLetterPress}
              onDelete={handleDelete}
              onChallenge={handleChallenge}
            />
          </>
        )}

        {gameState === 'result' && (
          <div className="result-overlay slide-up" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 100, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
            <div style={{
              background: '#FFFFFF', borderRadius: 24,
              padding: '36px 24px', width: '100%', maxWidth: 400,
              textAlign: 'center', boxShadow: '0 12px 48px rgba(28,16,64,0.15)',
            }}>
              <h2 style={{
                fontSize: 28, fontWeight: 900, marginBottom: 12,
                color: resultTitle.includes('اكتملت') ? 'var(--color-success)' : 'var(--color-danger)',
              }}>
                {resultTitle}
              </h2>
              <p style={{ fontSize: 16, color: 'var(--color-header)', marginBottom: 28, lineHeight: 1.5 }}>
                {resultMessage}
              </p>
              <ScoreBoard players={players} currentPlayerIndex={-1} />
              <button className="btn btn-primary" onClick={nextRound}
                style={{ width: '100%', padding: '15px', fontSize: 17, borderRadius: 16, marginTop: 24 }}>
                🔄 الجولة التالية
              </button>
              <button className="btn btn-ghost" onClick={nav.toHome}
                style={{ width: '100%', padding: '12px', fontSize: 15, borderRadius: 14, marginTop: 10 }}>
                العودة للرئيسية
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
