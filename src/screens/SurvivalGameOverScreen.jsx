import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom, leaveRoom } from '../firebase/rooms';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function SurvivalGameOverScreen({ nav, roomCode }) {
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      setRoom(data);
    });
    return unsub;
  }, [roomCode]);

  if (!room || !room.survivalState) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const { survivalState } = room;
  const alivePlayersUids = Object.keys(survivalState.alivePlayers).filter(uid => survivalState.alivePlayers[uid]);
  const isWinner = alivePlayersUids.includes(userProfile.uid);
  const winnerUid = alivePlayersUids[0]; // If more than 1, they are co-winners
  const winner = room.players[winnerUid];

  const handleReturnAction = async () => {
    await leaveRoom(roomCode, userProfile.uid, room.hostUid === userProfile.uid, room.playerOrder);
    nav.toHome();
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '40px 24px 24px',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      background: isWinner ? 'var(--bg-yellow)' : '#FFF'
    }}>
      {/* Title */}
      <h1 className="title-glitch" style={{ fontSize: 42, marginBottom: 32, transform: 'rotate(-2deg)' }}>
        {isWinner ? 'ناجي وحيد! 👑' : 'انتهى التحدي!'}
      </h1>

      {/* Winner Card */}
      <div className="card slide-up" style={{ padding: 40, marginBottom: 32, width: '100%', maxWidth: 400, background: '#FFF' }}>
          <div className="pop" style={{ fontSize: 80, marginBottom: 20 }}>{isWinner ? '🏆' : '💀'}</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: 'var(--bg-dark-purple)', marginBottom: 12 }}>
              {isWinner ? 'أنت البطل الوحيد!' : 'لم تكن الأسرع!'}
          </h2>
          <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--bg-pink)', letterSpacing: 0.5 }}>
              {winner ? `المتربع على العرش: ${winner.username}` : 'لا يوجد ناجين اليوم'}
          </p>
      </div>

      {/* Stats and Home link */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, width: '100%', maxWidth: 400 }}>
          <div style={{ flex: 1, background: '#FFF', border: '4px solid var(--bg-dark-purple)', padding: 20, textAlign: 'center', boxShadow: '4px 4px 0 var(--bg-dark-purple)' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--bg-dark-purple)', opacity: 0.6, marginBottom: 4 }}>الأسئلة الملغاة</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>{survivalState.currentQuestionIndex + 1}</div>
          </div>
      </div>

      <button 
        onClick={handleReturnAction} 
        className="btn btn-pink" 
        style={{ width: '100%', maxWidth: 400, padding: 22, fontSize: 22, boxShadow: '8px 8px 0 var(--bg-dark-purple)' }}
      >
          العودة للرئيسية 🏠
      </button>
    </div>
  );
}
