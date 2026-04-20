import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { useRoom } from '../hooks/useRoom';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function RoundResultScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { room, players, isHost, confirmNextRound } = useRoom(roomCode);
  const { user } = useAuth();
  const { playClick, playPenalty, playWin, playLose, playTimeup, playTick } = useAudio();
  const [countdown, setCountdown] = useState(5);

  const mountedRef = useRef(false);
  const playedSoundRef = useRef(false);

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
        if (!playedSoundRef.current && room.lastResult) {
          const amITheLoser = room.lastResult.loserUid === user?.uid;
          if (amITheLoser) {
            playPenalty();
          } else {
            playClick(); // Just a blip for others
          }
          playedSoundRef.current = true;
        }
    }
  }, [room?.status, room === null, room?.lastResult, user?.uid, playPenalty, playClick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer logic
  useEffect(() => {
    if (countdown <= 0) {
      playTimeup();
      if (isHost) confirmNextRound();
      return;
    }
    const timer = setInterval(() => {
      setCountdown(c => c - 1);
      if (countdown <= 2) playTick();
      else playClick();
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, isHost, confirmNextRound, playClick, playTimeup, playTick]);

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
    <div className="brutal-bg" style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="slide-up" style={{
        background: '#FFF',
        border: '6px solid #000',
        borderRadius: 0,
        padding: '32px 24px',
        width: '100%',
        maxWidth: 420,
        textAlign: 'center',
        boxShadow: `12px 12px 0px ${amITheLoser ? 'var(--neo-pink)' : 'var(--neo-yellow)'}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Countdown Progress Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: 10,
          background: '#000',
          width: '100%',
          overflow: 'hidden'
        }}>
           <div style={{
             height: '100%', background: amITheLoser ? 'var(--neo-pink)' : 'var(--neo-green)',
             width: `${(countdown / 5) * 100}%`,
             transition: 'width 1s linear'
           }} />
        </div>
        <div style={{ height: 10 }} />

        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {getEmoji()}
        </div>

        <h2 style={{
          fontSize: 32, fontWeight: 900, marginBottom: 12,
          color: '#000',
          direction: 'rtl'
        }}>
          {getHeadline()}
        </h2>

        <div className="card" style={{
           display: 'inline-block',
           padding: '10px 18px',
           background: amITheLoser ? 'var(--neo-pink)' : 'var(--neo-yellow)',
           color: '#000',
           border: '3px solid #000',
           fontWeight: 900, fontSize: 13,
           marginBottom: 28,
           boxShadow: '4px 4px 0 #000',
           borderRadius: 0,
           direction: 'rtl'
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
              <div key={p.uid} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: isLoser ? 'var(--neo-pink)' : isMe ? 'var(--neo-yellow)' : '#FFF',
                border: '3px solid #000',
                borderRadius: 0,
                boxShadow: (isLoser || isMe) ? '4px 4px 0 #000' : 'none',
                transform: isLoser ? 'scale(1.02) rotate(-1deg)' : 'none',
                transition: 'none',
              }}>
                <UserAvatar avatarId={p.avatarId ?? 1} size={48} border="2px solid #000" />
                <div style={{ flex: 1, textAlign: 'right', direction: 'rtl' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#000', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    {p.username}
                    {isMe && <span style={{ fontSize: 9, background: '#000', color: '#FFF', padding: '1px 6px', borderRadius: 0 }}>أنت</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, justifyContent: 'flex-start' }}>
                     {[0,1,2,3].map(i => (
                       <div key={i} style={{
                         width: 12, height: 12, borderRadius: 0,
                         background: i < (qm % 4) || (qm > 0 && i < 4 && qm % 4 === 0) ? '#000' : '#FFF',
                         border: '2px solid #000'
                       }} />
                     ))}
                     {Math.floor(qm/4) > 0 && Array(Math.floor(qm/4)).fill(0).map((_,i) => <span key={i} style={{ fontSize: 18 }}>🐒</span>)}
                  </div>
                </div>
                {isLoser && <span style={{ fontSize: 24 }}>🔻</span>}
              </div>
            );
          })}
        </div>
 
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
           <div style={{
              fontSize: 13, fontWeight: 900, color: '#000',
              background: 'var(--neo-cyan)', padding: '12px', border: '3px solid #000', borderRadius: 0,
              boxShadow: '4px 4px 0 #000', direction: 'rtl'
           }}>
              الجولة التالية في: <span style={{ color: '#000', fontSize: 18, borderBottom: '2px solid #000' }}>{countdown}</span> ث
           </div>

           {isHost && (
             <button onClick={confirmNextRound} className="btn btn-yellow"
               style={{ width: '100%', padding: '18px', fontSize: 18, border: '4.5px solid #000', boxShadow: '6px 6px 0 #000', fontWeight: 900 }}>
               ابدأ الآن ⚡
             </button>
           )}
        </div>
      </div>
    </div>
  );
}
