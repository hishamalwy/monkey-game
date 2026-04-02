import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function RoundResultScreen({ nav, roomCode }) {
  const { room, players, isHost, confirmNextRound } = useRoom(roomCode);
  const [countdown, setCountdown] = useState(5);

  const navRef = useRef(nav);
  useEffect(() => { navRef.current = nav; });

  useEffect(() => {
    if (!room) return;
    if (room.status === 'playing') navRef.current.toGame();
    if (room.status === 'game_over') navRef.current.toGameOver();
    if (room.status === 'lobby') navRef.current.toLobby(roomCode);
  }, [room?.status]);

  // Countdown timer logic
  useEffect(() => {
    if (countdown <= 0) {
      if (isHost) confirmNextRound();
      return;
    }
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, isHost, confirmNextRound]);

  if (!room) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const result = room.lastResult;
  const isWin = result?.type === 'word_complete';
  
  const QM_COLORS = ['#D1D5DB', '#FCD34D', '#F97316', '#EF4444', '#1C1040'];

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
      background: 'var(--bg-light-purple)',
    }}>
      <div className="slide-up" style={{
        background: '#FFF',
        border: '6px solid var(--bg-dark-purple)',
        borderRadius: 0, // Neobrutalist often uses sharp corners
        padding: '32px 24px',
        width: '100%',
        maxWidth: 420,
        textAlign: 'center',
        boxShadow: '12px 12px 0px var(--bg-dark-purple)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Countdown Progress Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: 8,
          background: 'var(--bg-pink)',
          width: `${(countdown / 5) * 100}%`,
          transition: 'width 1s linear'
        }} />

        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {isWin ? '🏆' : result?.type?.includes('challenge') ? '🕵️' : '💥'}
        </div>

        <h2 style={{
          fontSize: 32, fontWeight: 900, marginBottom: 8,
          color: 'var(--bg-dark-purple)',
          textTransform: 'uppercase'
        }}>
          {isWin ? 'فشل التحدي!' : 'انتهت الجولة!'}
        </h2>

        <div style={{
           display: 'inline-block',
           padding: '8px 16px',
           background: 'var(--bg-yellow)',
           border: '3px solid var(--bg-dark-purple)',
           fontWeight: 800,
           marginBottom: 24,
           transform: 'rotate(-2deg)'
        }}>
          {result?.reason || 'تم تطبيق العقوبة'}
        </div>

        {/* Scorecard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {players.map(p => {
            const qm = p.quarterMonkeys || 0;
            const isLoser = p.uid === result?.loserUid;
            
            return (
              <div key={p.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: isLoser ? 'var(--bg-pink)' : '#f9fafb',
                border: '3px solid var(--bg-dark-purple)',
                boxShadow: isLoser ? '4px 4px 0px var(--bg-dark-purple)' : 'none',
                transform: isLoser ? 'scale(1.02)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <UserAvatar avatarId={p.avatarId ?? 0} size={44} />
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: isLoser ? '#FFF' : 'var(--bg-dark-purple)' }}>
                    {p.username}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                     {[0,1,2,3].map(i => (
                       <div key={i} style={{
                         width: 10, height: 10, borderRadius: '20%',
                         background: i < (qm % 4) || (qm > 0 && i < 4 && qm % 4 === 0) ? (isLoser ? '#FFF' : 'var(--bg-pink)') : '#E5E7EB',
                         border: '1.5px solid var(--bg-dark-purple)'
                       }} />
                     ))}
                     {Math.floor(qm/4) > 0 && Array(Math.floor(qm/4)).fill(0).map((_,i) => <span key={i}>🐒</span>)}
                  </div>
                </div>
                {isLoser && <span style={{ fontSize: 24 }}>🔻</span>}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
           <div style={{
              fontSize: 14, fontWeight: 900, color: 'var(--bg-dark-purple)',
              background: '#F3F4F6', padding: '10px', border: '2px solid var(--bg-dark-purple)'
           }}>
              الجولة التالية هتبدأ خلال: <span style={{ color: 'var(--bg-pink)', fontSize: 18 }}>{countdown}</span> ثانية
           </div>

           {isHost && (
             <button onClick={confirmNextRound} className="btn btn-primary"
               style={{ width: '100%', padding: '16px', fontSize: 18, border: '4px solid var(--bg-dark-purple)', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>
               ابدأ دلوقتي! ⚡
             </button>
           )}
        </div>
      </div>
    </div>
  );
}

