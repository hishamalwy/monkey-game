import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom } from '../firebase/rooms';
import {
  startCharadesGame, charadesVoteCategory, charadesSelectActor,
  charadesSubmitGuess, charadesEndRound, charadesNextRound,
} from '../firebase/charadesRooms';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

const CHARADES_TIME = 75;

export default function CharadesGameScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [room, setRoom] = useState(null);
  const [guessInput, setGuessInput] = useState('');
  const [toast, setToast] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [myVote, setMyVote] = useState(null);

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { nav.toHome(); return; }
      setRoom(data);
      if (data.charadesState?.phase === 'gameOver' || data.status === 'charades_over') {
        nav.toCharadesGameOver();
      }
    });
    return unsub;
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const cs = room?.charadesState;
  const myUid = userProfile?.uid;
  const isHost = room?.hostUid === myUid;
  const teamA = cs?.teams?.A || [];
  const teamB = cs?.teams?.B || [];
  const myTeam = teamA.includes(myUid) ? 'A' : 'B';
  const currentTeamPlayers = cs?.currentTeam === 'A' ? teamA : teamB;
  const isOnCurrentTeam = currentTeamPlayers?.includes(myUid);

  useEffect(() => {
    if (!cs?.timeEndsAt) return;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.round((cs.timeEndsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0 && isHost) {
        clearInterval(iv);
        charadesEndRound(roomCode).catch(() => {});
      }
    }, 1000);
    setTimeLeft(Math.max(0, Math.round((cs.timeEndsAt - Date.now()) / 1000)));
    return () => clearInterval(iv);
  }, [cs?.timeEndsAt, isHost, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!room || !cs) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const handleVote = async (category) => {
    if (myVote !== null) return;
    setMyVote(category);
    try {
      await charadesVoteCategory(roomCode, myTeam, category);
    } catch (e) {
      setToast(e.message);
      setMyVote(null);
    }
  };

  const handleSelectActor = async (uid) => {
    if (!isOnCurrentTeam || !isHost) return;
    try {
      await charadesSelectActor(roomCode, cs.currentTeam, uid);
    } catch (e) {
      setToast(e.message);
    }
  };

  const handleGuess = async () => {
    if (!guessInput.trim() || !isOnCurrentTeam) return;
    try {
      await charadesSubmitGuess(roomCode, myUid, guessInput.trim());
      setGuessInput('');
    } catch (e) {
      setToast(e.message);
    }
  };

  const handleCorrectGuess = async () => {
    if (!isHost) return;
    try {
      await charadesSubmitGuess(roomCode, myUid, cs.currentTitle);
    } catch (e) {
      setToast(e.message);
    }
  };

  const handleNext = async () => {
    if (!isHost) return;
    try {
      await charadesNextRound(roomCode);
    } catch (e) {
      setToast(e.message);
    }
  };

  const phase = cs?.phase;
  const actorPlayer = cs?.currentActorUid ? room?.players?.[cs.currentActorUid] : null;
  const isActor = cs?.currentActorUid === myUid;
  const timePct = (timeLeft / CHARADES_TIME) * 100;
  const halfTime = CHARADES_TIME / 2;

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        background: '#FFF', borderBottom: '4px solid var(--bg-dark-purple)',
        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, zIndex: 10,
      }}>
        <button onClick={() => nav.toHome()} className="btn btn-white" style={{ width: 38, height: 38, fontSize: 15, borderRadius: '10px', padding: 0, flexShrink: 0 }}>✕</button>
        <div style={{
          background: 'var(--bg-dark-purple)', color: 'var(--bg-yellow)',
          padding: '5px 14px', borderRadius: '100px', fontWeight: 950, fontSize: 13,
          border: '3px solid var(--bg-dark-purple)', boxShadow: '3px 3px 0 var(--bg-pink)',
        }}>
          🎭 جولة {cs.roundNumber}  •  فريق {cs.currentTeam === 'A' ? 'الأحمر' : 'الأزرق'}
        </div>
        <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 950, fontSize: 14, color: timeLeft <= 15 ? 'var(--bg-pink)' : 'var(--bg-dark-purple)',
          }}>
            {timeLeft}
          </div>
        </div>
      </div>

      <div style={{
        background: '#FFF', borderBottom: '3px solid var(--bg-dark-purple)',
        padding: '8px 16px', display: 'flex', justifyContent: 'space-around', flexShrink: 0,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 950, fontSize: 11, color: 'var(--bg-pink)' }}>فريق الأحمر</div>
          <div style={{ fontWeight: 950, fontSize: 20, color: 'var(--bg-dark-purple)' }}>{cs.scores?.A || 0}</div>
        </div>
        <div style={{ width: 3, background: 'var(--bg-dark-purple)', borderRadius: 2 }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 950, fontSize: 11, color: '#2979FF' }}>فريق الأزرق</div>
          <div style={{ fontWeight: 950, fontSize: 20, color: 'var(--bg-dark-purple)' }}>{cs.scores?.B || 0}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16, overflow: 'auto' }}>

        {phase === 'categoryVote' && (
          <div style={{ width: '100%', maxWidth: 400 }}>
            {isOnCurrentTeam ? (
              <div>
                <h2 style={{ textAlign: 'center', fontWeight: 950, fontSize: 18, color: 'var(--bg-dark-purple)', marginBottom: 16 }}>
                  صوّتوا: أيهما أصعب في التمثيل؟ 🤔
                </h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => handleVote('movie')}
                    disabled={myVote !== null}
                    className="pop"
                    style={{
                      flex: 1, padding: 24, borderRadius: '18px',
                      background: myVote === 'movie' ? 'var(--bg-yellow)' : '#FFF',
                      border: '4px solid var(--bg-dark-purple)',
                      boxShadow: myVote === 'movie' ? 'none' : '4px 4px 0 var(--bg-dark-purple)',
                      transform: myVote === 'movie' ? 'translate(4px,4px)' : 'none',
                      cursor: myVote === null ? 'pointer' : 'default',
                      fontWeight: 950, fontSize: 18,
                    }}
                  >
                    🎬 فيلم
                  </button>
                  <button
                    onClick={() => handleVote('play')}
                    disabled={myVote !== null}
                    className="pop"
                    style={{
                      flex: 1, padding: 24, borderRadius: '18px',
                      background: myVote === 'play' ? 'var(--bg-pink)' : '#FFF',
                      color: myVote === 'play' ? '#FFF' : 'var(--bg-dark-purple)',
                      border: '4px solid var(--bg-dark-purple)',
                      boxShadow: myVote === 'play' ? 'none' : '4px 4px 0 var(--bg-dark-purple)',
                      transform: myVote === 'play' ? 'translate(4px,4px)' : 'none',
                      cursor: myVote === null ? 'pointer' : 'default',
                      fontWeight: 950, fontSize: 18,
                    }}
                  >
                    🎭 مسرحية
                  </button>
                </div>
                {myVote && (
                  <div style={{ textAlign: 'center', marginTop: 16, fontWeight: 950, color: 'var(--bg-green)', fontSize: 14 }}>
                    ✅ تم التصويت! بانتظار البقية...
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#FFF', borderRadius: '18px', border: '4px solid var(--bg-dark-purple)',
                padding: 24, textAlign: 'center',
                boxShadow: '6px 6px 0 var(--bg-pink)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
                <h3 style={{ fontWeight: 950, color: 'var(--bg-dark-purple)', fontSize: 16 }}>
                  فريق {cs.currentTeam === 'A' ? 'الأحمر' : 'الأزرق'} يصوّتون...
                </h3>
              </div>
            )}
          </div>
        )}

        {phase === 'selectActor' && (
          <div style={{ width: '100%', maxWidth: 400 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 950, fontSize: 18, color: 'var(--bg-dark-purple)', marginBottom: 16 }}>
              اختر من يمثّل! 🎭
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {currentTeamPlayers?.map(uid => {
                const p = room?.players?.[uid];
                const actedIdx = cs.actedIndices?.[cs.currentTeam] || 0;
                const order = cs.actOrders?.[cs.currentTeam] || [];
                const alreadyActed = order.indexOf(uid) < actedIdx;
                return (
                  <button
                    key={uid}
                    onClick={() => handleSelectActor(uid)}
                    disabled={!isOnCurrentTeam || alreadyActed}
                    className="pop"
                    style={{
                      padding: 16, borderRadius: '14px',
                      background: '#FFF', border: '3px solid var(--bg-dark-purple)',
                      boxShadow: '4px 4px 0 var(--bg-dark-purple)',
                      cursor: isOnCurrentTeam && !alreadyActed ? 'pointer' : 'default',
                      opacity: alreadyActed ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    }}
                  >
                    <UserAvatar avatarId={p?.avatarId ?? 1} size={44} />
                    <span style={{ fontWeight: 950, fontSize: 13, color: 'var(--bg-dark-purple)' }}>{p?.username}</span>
                    {alreadyActed && <span style={{ fontSize: 10, color: 'var(--bg-pink)' }}>لعبه بالفعل ✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'acting' && (
          <div style={{ width: '100%', maxWidth: 400 }}>
            {isActor ? (
              <div style={{
                background: 'var(--bg-dark-purple)', borderRadius: '18px', padding: 24,
                border: '4px solid var(--bg-pink)', boxShadow: '6px 6px 0 var(--bg-pink)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 14, fontWeight: 950, color: 'var(--bg-yellow)', marginBottom: 8 }}>
                  دورك أنك تمثّل! 🎭
                </div>
                <div style={{ fontSize: 28, fontWeight: 950, color: '#FFF', marginBottom: 16, lineHeight: 1.3 }}>
                  {cs.currentTitle}
                </div>
                <div style={{ fontSize: 13, fontWeight: 950, color: 'var(--bg-yellow)', marginBottom: 4 }}>
                  ({cs.currentCategory === 'movie' ? '🎬 فيلم' : '🎭 مسرحية'})
                </div>
                {cs.currentChallenge && (
                  <div style={{
                    marginTop: 16, background: 'var(--bg-pink)', color: '#FFF',
                    padding: '12px 16px', borderRadius: '12px',
                    border: '3px solid #FFF', fontWeight: 950, fontSize: 14,
                  }}>
                    🎲 تحدي: {cs.currentChallenge}
                  </div>
                )}
                <div style={{ marginTop: 16, fontSize: 32, fontWeight: 950, color: timeLeft <= 15 ? 'var(--bg-pink)' : 'var(--bg-yellow)' }}>
                  {timeLeft}ث
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  background: '#FFF', borderRadius: '18px', padding: 20,
                  border: '4px solid var(--bg-dark-purple)', boxShadow: '6px 6px 0 var(--bg-dark-purple)',
                  textAlign: 'center', marginBottom: 16,
                }}>
                  <div style={{ fontWeight: 950, fontSize: 14, color: 'var(--bg-dark-purple)' }}>
                    {actorPlayer?.username} يمثّل الآن! 🎭
                  </div>
                  {cs.currentChallenge && (
                    <div style={{
                      marginTop: 8, background: 'var(--bg-yellow)', color: 'var(--bg-dark-purple)',
                      padding: '8px 12px', borderRadius: '8px',
                      border: '2px solid var(--bg-dark-purple)', fontWeight: 950, fontSize: 12,
                    }}>
                      🎲 تحدي: {cs.currentChallenge}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{
                    width: '100%', height: 10, background: '#EEE', borderRadius: 20,
                    overflow: 'hidden', border: '2px solid var(--bg-dark-purple)', marginBottom: 12,
                  }}>
                    <div style={{
                      width: `${timePct}%`, height: '100%',
                      background: timeLeft <= halfTime ? 'var(--bg-pink)' : 'var(--bg-green)',
                      transition: 'width 1s linear',
                    }} />
                  </div>

                  {isOnCurrentTeam && !isActor ? (
                    <div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          value={guessInput}
                          onChange={e => setGuessInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleGuess()}
                          placeholder="اكتب تخمينك..."
                          className="input-field"
                          style={{ flex: 1, borderRadius: '12px', padding: '12px 16px' }}
                        />
                        <button
                          onClick={handleGuess}
                          className="btn btn-yellow"
                          style={{ padding: '0 20px', borderRadius: '12px' }}
                        >
                          خمّن
                        </button>
                      </div>
                      {isHost && (
                        <button
                          onClick={handleCorrectGuess}
                          className="btn btn-green"
                          style={{ width: '100%', padding: 12, borderRadius: '12px', fontSize: 14 }}
                        >
                          ✅ الإجابة صحيحة!
                        </button>
                      )}
                    </div>
                  ) : !isOnCurrentTeam ? (
                    <div style={{ textAlign: 'center', fontWeight: 950, color: 'var(--bg-dark-purple)', opacity: 0.6 }}>
                      أنت في الفريق المنافس - تابع! 👀
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'roundResult' && (
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{
              background: cs.phaseData?.correct ? 'var(--bg-green)' : 'var(--bg-dark-purple)',
              borderRadius: '18px', padding: 24, textAlign: 'center',
              border: '4px solid var(--bg-dark-purple)',
              boxShadow: '6px 6px 0 var(--bg-pink)',
              color: cs.phaseData?.correct ? 'var(--bg-dark-purple)' : '#FFF',
            }}>
              <div style={{ fontSize: 40 }}>{cs.phaseData?.correct ? '🎉' : '⏰'}</div>
              <h2 style={{ fontWeight: 950, fontSize: 22, margin: '8px 0' }}>
                {cs.phaseData?.correct ? 'الإجابة صحيحة!' : 'انتهى الوقت!'}
              </h2>
              <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 8 }}>
                الكلمة كانت: {cs.currentTitle}
              </div>
              {cs.currentChallenge && (
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  التحدي كان: {cs.currentChallenge}
                </div>
              )}
              {cs.phaseData?.correct && (
                <div style={{
                  marginTop: 12, background: 'var(--bg-yellow)', color: 'var(--bg-dark-purple)',
                  padding: '8px 16px', borderRadius: '12px', display: 'inline-block',
                  fontWeight: 950, fontSize: 16,
                }}>
                  +{cs.phaseData.points} نقطة
                </div>
              )}
            </div>
            {isHost && (
              <button
                onClick={handleNext}
                className="btn btn-yellow"
                style={{ width: '100%', padding: 16, borderRadius: '14px', marginTop: 16, fontSize: 16, fontWeight: 950 }}
              >
                ➡️ الجولة التالية
              </button>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
