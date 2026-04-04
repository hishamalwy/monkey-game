import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function RoundResultScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { room, players, isHost, confirmNextRound } = useRoom(roomCode);
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);

  const mountedRef = useRef(false);
  useEffect(() => {
    // If explicitly null from Firestore, the room is gone
    if (room === null) { nav.toHome(); return; }
    if (room === undefined) return;
    
    if (room.status === 'playing') nav.toGame();
    if (room.status === 'game_over') nav.toGameOver();
    
    if (room.status === 'lobby' && mountedRef.current) {
        nav.toLobby(roomCode);
    }
    
    if (room.status === 'round_result') {
        mountedRef.current = true;
    }
  }, [room?.status, room === null]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const myUid = user?.uid;
  const isWordComplete = result?.type === 'word_complete';
  const isChallenge = result?.type?.includes('challenge');
  const isTimeout = result?.type === 'timeout';
  const amITheLoser = result?.loserUid === myUid;
  const wasITheChallenger = result?.challengerUid === myUid;
  const wasITheSuspect = result?.suspectedUid === myUid;

  // Personalized headline
  const getHeadline = () => {
    if (isWordComplete) return amITheLoser ? 'خسرت الجولة! 😤' : 'تمت الكلمة! 🎉';
    
    if (isChallenge) {
      if (result.type === 'challenge_failed') {
        // Challenger failed (Challenger is the loser)
        if (amITheLoser) return 'خسرت التحدي! 😤';
        if (wasITheSuspect) return 'نجوت من التحدي! 🎉';
        return 'التحدي فشل! 🕵️';
      } else {
        // Challenge success (Suspect is the loser)
        if (amITheLoser) return 'اتصيدت! 🕸️';
        if (wasITheChallenger) return 'قفشته! 😂';
        return 'تحدي ناجح! 🕵️';
      }
    }
    
    if (isTimeout) return amITheLoser ? 'انتهى وقتك! ⏰' : 'انتهى وقته! ⏰';
    return isWordComplete ? 'تمت الكلمة!' : 'انتهت الجولة!';
  };

  // Personalized sub-message
  const getSubMessage = () => {
    if (isWordComplete) {
      const loserName = players.find(p => p.uid === result?.loserUid)?.username || '؟';
      return amITheLoser ? 'أكملت الكلمة وده حسبلك جولة خسارة!' : `${loserName} أكمل الكلمة!`;
    }
    if (isTimeout) {
      return amITheLoser ? 'انتهى وقتك وأخدت ربع قرد! 🐒' : 'انتهى وقته وأخد ربع قرد! 🐒';
    }
    
    if (isChallenge) {
      if (result.type === 'challenge_failed') {
        return amITheLoser ? 'كنت شاكك غلط، الكلمة كانت صح!' : 'المشتبه به كان صادقاً!';
      } else {
        return amITheLoser ? 'قفشك وأنت بتألف كلمة!' : 'صاده وهو بيألف كلمة!';
      }
    }
    return result?.reason || 'تم تطبيق العقوبة';
  };

  const getEmoji = () => {
    if (isWordComplete) return amITheLoser ? '😤' : '🏆';
    if (isChallenge) return amITheLoser ? '💀' : '🕵️';
    return amITheLoser ? '⏰' : '💥';
  };

  // Background: loser sees light pink, winner sees light yellow
  const bgColor = amITheLoser ? '#FFF0F5' : '#FFFFF0';

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
      background: bgColor,
    }}>
      <div className="slide-up" style={{
        background: '#FFF',
        border: `6px solid ${amITheLoser ? 'var(--bg-pink)' : 'var(--bg-dark-purple)'}`,
        borderRadius: 0,
        padding: '32px 24px',
        width: '100%',
        maxWidth: 420,
        textAlign: 'center',
        boxShadow: `12px 12px 0px ${amITheLoser ? 'var(--bg-pink)' : 'var(--bg-dark-purple)'}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Countdown Progress Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: 8,
          background: amITheLoser ? 'var(--bg-pink)' : 'var(--bg-dark-purple)',
          width: `${(countdown / 5) * 100}%`,
          transition: 'width 1s linear'
        }} />

        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {getEmoji()}
        </div>

        <h2 style={{
          fontSize: 28, fontWeight: 900, marginBottom: 8,
          color: amITheLoser ? 'var(--bg-pink)' : 'var(--bg-dark-purple)',
          textTransform: 'uppercase'
        }}>
          {getHeadline()}
        </h2>

        <div style={{
           display: 'inline-block',
           padding: '8px 16px',
           background: amITheLoser ? 'var(--bg-pink)' : 'var(--bg-yellow)',
           color: amITheLoser ? '#FFF' : 'var(--bg-dark-purple)',
           border: '3px solid var(--bg-dark-purple)',
           fontWeight: 800, fontSize: 14,
           marginBottom: 24,
           transform: 'rotate(-2deg)'
        }}>
          {getSubMessage()}
        </div>

        {/* Scorecard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {players.map(p => {
            const qm = p.quarterMonkeys || 0;
            const isLoser = p.uid === result?.loserUid;
            const isMe = p.uid === myUid;
            
            return (
              <div key={p.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: isLoser ? 'var(--bg-pink)' : isMe ? '#FFF9E6' : '#f9fafb',
                border: `3px solid ${isLoser ? 'var(--bg-dark-purple)' : isMe ? 'var(--bg-yellow)' : '#E5E7EB'}`,
                boxShadow: isLoser ? '4px 4px 0px var(--bg-dark-purple)' : 'none',
                transform: isLoser ? 'scale(1.02)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <UserAvatar avatarId={p.avatarId ?? 0} size={44} />
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: isLoser ? '#FFF' : 'var(--bg-dark-purple)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-start' }}>
                    {p.username}
                    {isMe && <span style={{ fontSize: 10, background: isLoser ? '#FFF' : 'var(--bg-pink)', color: isLoser ? 'var(--bg-pink)' : '#FFF', padding: '1px 6px', borderRadius: 8 }}>أنت</span>}
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
