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
      textAlign: 'center'
    }}>
      {/* Title */}
      <h1 className="title-glitch" style={{ fontSize: 36, marginBottom: 20 }}>انتهت المسابقة!</h1>

      {/* Winner Card */}
      <div className="card slide-up" style={{ padding: 32, marginBottom: 40, width: '100%', maxWidth: 360, background: isWinner ? 'var(--bg-yellow)' : '#FFF' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{isWinner ? '🏆' : '💀'}</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--bg-dark-purple)', marginBottom: 8 }}>
              {isWinner ? 'أنت الفائز!' : 'لقد خرجت!'}
          </h2>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--bg-dark-purple)', opacity: 0.8 }}>
              {winner ? `الفائز هو: ${winner.username}` : 'لم ينجو أحد!'}
          </p>
      </div>

      {/* Score / Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 40, width: '100%', maxWidth: 320 }}>
          <div style={{ flex: 1, background: '#FFF', border: 'var(--brutal-border)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--bg-dark-purple)', opacity: 0.6 }}>الأسئلة</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>{survivalState.currentQuestionIndex + 1}</div>
          </div>
          <div style={{ flex: 1, background: '#FFF', border: 'var(--brutal-border)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--bg-dark-purple)', opacity: 0.6 }}>الناجين</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)' }}>{alivePlayersUids.length}</div>
          </div>
      </div>

      {/* Back to Home Button */}
      <button 
        onClick={handleReturnAction} 
        className="btn btn-pink" 
        style={{ width: '100%', maxWidth: 320, padding: 20, fontSize: 18 }}
      >
          العودة للرئيسية 🏠
      </button>
    </div>
  );
}
