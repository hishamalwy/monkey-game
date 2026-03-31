import React, { useState } from 'react';
import { playSound } from '../utils/audio';
import { appCategories } from '../data/categories';

export default function SetupScreen({ onStart }) {
  const [selectedCategory, setSelectedCategory] = useState(appCategories[0].id);
  const [playerCount, setPlayerCount] = useState(2);
  const [isAi, setIsAi] = useState(false);
  const [timeLimit, setTimeLimit] = useState(15);
  const [playerNames, setPlayerNames] = useState(['لاعب ١', 'لاعب ٢', 'لاعب ٣', 'لاعب ٤', 'لاعب ٥', 'لاعب ٦', 'لاعب ٧', 'لاعب ٨']);

  const timeLimits = [0, 10, 15, 20, 30];

  const start = () => {
    playSound('click');
    const players = [];
    if (isAi) {
      players.push({ id: 1, name: playerNames[0] || 'أنت', quarterMonkeys: 0 });
      players.push({ id: 2, name: 'كمبيوتر 🤖', quarterMonkeys: 0, isAi: true });
    } else {
      for (let i = 0; i < playerCount; i++) {
        players.push({ id: i + 1, name: playerNames[i] || `لاعب ${i + 1}`, quarterMonkeys: 0 });
      }
    }
    onStart(players, isAi, timeLimit, selectedCategory);
  };

  const updateName = (i, val) => {
    const n = [...playerNames];
    n[i] = val;
    setPlayerNames(n);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh', padding: '20px',
      background: 'linear-gradient(180deg, #0a0a12 0%, #12101f 100%)',
      overflowY: 'auto',
    }}>
      <div className="slide-up" style={{
        width: '100%', maxWidth: 420,
        background: '#12121e',
        border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 28,
        padding: '32px 24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 8 }}>🐒</div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, margin: 0,
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>ربع قرد</h1>
        </div>

        {/* Category Option */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
            الفئة / التصنيف
          </label>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {appCategories.map(cat => (
              <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); playSound('click'); }}
                className="btn" style={{
                  flex: '0 0 auto', padding: '10px 14px', fontSize: 13, whiteSpace: 'nowrap',
                  background: selectedCategory === cat.id
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'rgba(255,255,255,0.04)',
                  color: selectedCategory === cat.id ? 'white' : '#94a3b8',
                  border: selectedCategory === cat.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: selectedCategory === cat.id ? '0 4px 15px rgba(16,185,129,0.3)' : 'none',
                }}>
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { label: '👥 مع أصدقاء', val: false },
            { label: '🤖 ضد الكمبيوتر', val: true },
          ].map(({ label, val }) => (
            <button key={String(val)} onClick={() => { setIsAi(val); playSound('click'); }}
              className="btn" style={{
                flex: 1, padding: '10px 6px', fontSize: 13,
                background: isAi === val
                  ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                  : 'rgba(255,255,255,0.04)',
                color: isAi === val ? 'white' : '#94a3b8',
                border: isAi === val ? 'none' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isAi === val ? '0 4px 20px rgba(124,58,237,0.3)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Player Count (not shown in AI mode) */}
        {!isAi && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
              عدد اللاعبين
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[2,3,4,5,6,7,8].map(n => (
                <button key={n} onClick={() => { setPlayerCount(n); playSound('click'); }}
                  className="btn" style={{
                    width: 40, height: 40, fontSize: 15,
                    background: playerCount === n
                      ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                      : 'rgba(255,255,255,0.05)',
                    color: playerCount === n ? 'white' : '#94a3b8',
                    border: playerCount === n ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Player Names */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
            أسماء اللاعبين
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: isAi ? 1 : playerCount }).map((_, i) => (
              <input key={i} value={playerNames[i]} onChange={e => updateName(i, e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '10px 14px', color: 'white',
                  fontFamily: 'Cairo, sans-serif', fontSize: 14,
                  direction: 'rtl', outline: 'none', width: '100%',
                }}
                placeholder={`اسم اللاعب ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
            ⏱ وقت الجولة (ثانية)
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {timeLimits.map(t => (
              <button key={t} onClick={() => { setTimeLimit(t); playSound('click'); }}
                className="btn" style={{
                  flex: 1, padding: '8px 4px', fontSize: 13,
                  background: timeLimit === t
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'rgba(255,255,255,0.05)',
                  color: timeLimit === t ? 'white' : '#94a3b8',
                  border: timeLimit === t ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: timeLimit === t ? '0 4px 16px rgba(245,158,11,0.25)' : 'none',
                }}>
                {t === 0 ? '∞' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button onClick={start} className="btn btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: 18, borderRadius: 16 }}>
          🚀 ابدأ اللعب
        </button>
      </div>
    </div>
  );
}
