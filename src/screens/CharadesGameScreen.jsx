import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToRoom } from '../firebase/rooms';
import {
  startCharadesGame, charadesJoinTeam, charadesConfirmTeams,
  charadesVoteTitle, charadesResolveTitle,
  charadesVoteActor, charadesResolveActor,
  charadesSubmitGuess, charadesHostConfirmCorrect,
  charadesEndRound, charadesNextRound,
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

  useEffect(() => {
    const unsub = listenToRoom(roomCode, (data) => {
      if (!data) { nav.toHome(); return; }
      setRoom(data);
      if (data.charadesState?.phase === 'gameOver' || data.status === 'charades_over') {
        nav.toCharadesGameOver();
      }
    });
    return unsub;
  }, [roomCode]);

  const cs = room?.charadesState;
  const myUid = userProfile?.uid;
  const isHost = room?.hostUid === myUid;
  const allPlayers = room?.playerOrder || [];
  const teamA = cs?.teams?.A || [];
  const teamB = cs?.teams?.B || [];
  const myTeam = teamA.includes(myUid) ? 'A' : 'B';
  const currentTeamPlayers = cs?.currentTeam === 'A' ? teamA : teamB;
  const isOnCurrentTeam = currentTeamPlayers?.includes(myUid);
  const phase = cs?.phase;
  const scoreTarget = cs?.scoreTarget || 20;

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
  }, [cs?.timeEndsAt, isHost, roomCode]);

  useEffect(() => {
    if (!isHost || !cs) return;
    if (phase === 'titleVote') {
      const members = cs.teams[cs.currentTeam] || [];
      const votes = cs.titleVotes || {};
      if (members.length > 0 && members.every(uid => votes[uid] !== undefined)) {
        const timer = setTimeout(() => {
          charadesResolveTitle(roomCode).catch(() => {});
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
    if (phase === 'selectActor') {
      const members = cs.teams[cs.currentTeam] || [];
      const votes = cs.actorVotes || {};
      if (members.length > 0 && members.every(uid => votes[uid] !== undefined)) {
        const timer = setTimeout(() => {
          charadesResolveActor(roomCode).catch(() => {});
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [cs?.titleVotes, cs?.actorVotes, phase, isHost, roomCode]);

  if (!room || !cs) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const handleJoinTeam = (team) => {
    charadesJoinTeam(roomCode, myUid, team).catch(e => setToast(e.message));
  };

  const handleConfirmTeams = () => {
    charadesConfirmTeams(roomCode).catch(e => setToast(e.message));
  };

  const handleVoteTitle = (optionIndex) => {
    if (cs.titleVotes?.[myUid] !== undefined) return;
    charadesVoteTitle(roomCode, myUid, optionIndex).catch(e => setToast(e.message));
  };

  const handleVoteActor = (actorUid) => {
    if (cs.actorVotes?.[myUid] !== undefined) return;
    charadesVoteActor(roomCode, myUid, actorUid).catch(e => setToast(e.message));
  };

  const handleGuess = async () => {
    if (!guessInput.trim() || !isOnCurrentTeam) return;
    try {
      await charadesSubmitGuess(roomCode, myUid, guessInput.trim());
      setGuessInput('');
    } catch (e) { setToast(e.message); }
  };

  const handleCorrectGuess = async () => {
    if (!isHost) return;
    try {
      await charadesHostConfirmCorrect(roomCode);
    } catch (e) { setToast(e.message); }
  };

  const handleNext = async () => {
    if (!isHost) return;
    try {
      await charadesNextRound(roomCode);
    } catch (e) { setToast(e.message); }
  };

  const allJoined = allPlayers.length > 0 && allPlayers.every(uid => teamA.includes(uid) || teamB.includes(uid));
  const teamAMin2 = teamA.length >= 2;
  const teamBMin2 = teamB.length >= 2;
  const canStart = allJoined && teamAMin2 && teamBMin2;

  const isActor = cs?.currentActorUid === myUid;
  const actorPlayer = cs?.currentActorUid ? room?.players?.[cs.currentActorUid] : null;
  const timePct = (timeLeft / CHARADES_TIME) * 100;
  const halfTime = CHARADES_TIME / 2;

  const titleVoteCounts = (cs?.titleOptions || []).map((_, i) => {
    return Object.values(cs.titleVotes || {}).filter(v => v === i).length;
  });

  const actorVoteCounts = (currentTeamPlayers || []).map(uid => {
    return Object.values(cs.actorVotes || {}).filter(v => v === uid).length;
  });

  const actedSet = new Set(cs?.actedPlayers?.[cs?.currentTeam] || []);

  const scoreA = cs.scores?.A || 0;
  const scoreB = cs.scores?.B || 0;

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
          {phase === 'chooseTeam' ? '🎭 اختر فريقك' : `🎭 جولة ${cs.roundNumber}  •  فريق ${cs.currentTeam === 'A' ? 'الأحمر' : 'الأزرق'}`}
        </div>
        <div style={{ width: 38, flexShrink: 0 }} />
      </div>

      {phase !== 'chooseTeam' && (
        <div style={{
          background: '#FFF', borderBottom: '3px solid var(--bg-dark-purple)',
          padding: '8px 16px', display: 'flex', justifyContent: 'space-around', flexShrink: 0, alignItems: 'center',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 950, fontSize: 11, color: 'var(--bg-pink)' }}>فريق الأحمر</div>
            <div style={{ fontWeight: 950, fontSize: 20, color: 'var(--bg-dark-purple)' }}>{scoreA}</div>
            <div style={{ height: 4, background: '#EEE', borderRadius: 4, marginTop: 4, border: '1px solid var(--bg-dark-purple)' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (scoreA / scoreTarget) * 100)}%`, background: 'var(--bg-pink)', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>
          <div style={{
            background: 'var(--bg-dark-purple)', color: 'var(--bg-yellow)',
            padding: '4px 10px', borderRadius: '100px', fontWeight: 950, fontSize: 11,
            border: '2px solid var(--bg-dark-purple)', margin: '0 8px', whiteSpace: 'nowrap',
          }}>
            🏆 {scoreTarget}
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 950, fontSize: 11, color: '#2979FF' }}>فريق الأزرق</div>
            <div style={{ fontWeight: 950, fontSize: 20, color: 'var(--bg-dark-purple)' }}>{scoreB}</div>
            <div style={{ height: 4, background: '#EEE', borderRadius: 4, marginTop: 4, border: '1px solid var(--bg-dark-purple)' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (scoreB / scoreTarget) * 100)}%`, background: '#2979FF', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16, overflow: 'auto' }}>

        {/* ===== CHOOSE TEAM ===== */}
        {phase === 'chooseTeam' && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 950, fontSize: 18, color: 'var(--bg-dark-purple)', marginBottom: 4 }}>
              اختار فريقك! 🎭
            </h2>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 20 }}>
              لازم على الأقل 2 في كل فريق ({teamA.length + teamB.length}/{allPlayers.length} اختاروا)
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => handleJoinTeam('A')} style={{
                flex: 1, padding: 20, borderRadius: '18px',
                background: myTeam === 'A' ? 'var(--bg-pink)' : '#FFF',
                border: '4px solid var(--bg-pink)',
                boxShadow: myTeam === 'A' ? 'none' : '4px 4px 0 var(--bg-pink)',
                transform: myTeam === 'A' ? 'translate(4px,4px)' : 'none',
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🅰️</div>
                <div style={{ fontWeight: 950, fontSize: 16, color: myTeam === 'A' ? '#FFF' : 'var(--bg-pink)' }}>فريق الأحمر</div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                  {teamA.map(uid => {
                    const p = room?.players?.[uid];
                    return (
                      <div key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <UserAvatar avatarId={p?.avatarId ?? 1} size={30} />
                        <span style={{ fontSize: 9, fontWeight: 950, color: myTeam === 'A' ? '#FFF' : 'var(--bg-pink)' }}>{p?.username?.slice(0, 6)}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
              <button onClick={() => handleJoinTeam('B')} style={{
                flex: 1, padding: 20, borderRadius: '18px',
                background: myTeam === 'B' ? '#2979FF' : '#FFF',
                border: '4px solid #2979FF',
                boxShadow: myTeam === 'B' ? 'none' : '4px 4px 0 #2979FF',
                transform: myTeam === 'B' ? 'translate(4px,4px)' : 'none',
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎭</div>
                <div style={{ fontWeight: 950, fontSize: 16, color: myTeam === 'B' ? '#FFF' : '#2979FF' }}>فريق الأزرق</div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                  {teamB.map(uid => {
                    const p = room?.players?.[uid];
                    return (
                      <div key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <UserAvatar avatarId={p?.avatarId ?? 1} size={30} />
                        <span style={{ fontSize: 9, fontWeight: 950, color: myTeam === 'B' ? '#FFF' : '#2979FF' }}>{p?.username?.slice(0, 6)}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            </div>
            {!teamAMin2 && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--bg-pink)', fontWeight: 950 }}>⚠️ فريق الأحمر محتاج 2 على الأقل</p>}
            {!teamBMin2 && <p style={{ textAlign: 'center', fontSize: 12, color: '#2979FF', fontWeight: 950 }}>⚠️ فريق الأزرق محتاج 2 على الأقل</p>}
            {isHost && canStart && (
              <button onClick={handleConfirmTeams} className="btn btn-yellow pop"
                style={{ width: '100%', padding: 16, borderRadius: '14px', fontSize: 18, fontWeight: 950, marginTop: 8 }}>
                يلا نبدأ! 🚀
              </button>
            )}
          </div>
        )}

        {/* ===== TITLE VOTE ===== */}
        {phase === 'titleVote' && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            {isOnCurrentTeam ? (
              <div>
                <h2 style={{ textAlign: 'center', fontWeight: 950, fontSize: 17, color: 'var(--bg-dark-purple)', marginBottom: 16 }}>
                  صوّتوا: أيهما الأصعب في التمثيل؟ 🤔
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(cs.titleOptions || []).map((opt, i) => {
                    const voted = cs.titleVotes?.[myUid] === i;
                    const count = titleVoteCounts[i] || 0;
                    return (
                      <button key={i} onClick={() => handleVoteTitle(i)} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                        borderRadius: '14px', textAlign: 'right',
                        background: voted ? 'var(--bg-yellow)' : '#FFF',
                        border: '4px solid var(--bg-dark-purple)',
                        boxShadow: voted ? 'none' : '4px 4px 0 var(--bg-dark-purple)',
                        transform: voted ? 'translate(4px,4px)' : 'none',
                        cursor: cs.titleVotes?.[myUid] !== undefined ? 'default' : 'pointer',
                        opacity: cs.titleVotes?.[myUid] !== undefined && !voted ? 0.5 : 1,
                        width: '100%',
                      }}>
                        <div style={{ fontSize: 28 }}>{opt.emoji}</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontWeight: 950, fontSize: 16, color: 'var(--bg-dark-purple)' }}>{opt.title}</div>
                          <div style={{ fontSize: 11, fontWeight: 950, color: opt.type === 'movie' ? 'var(--bg-pink)' : '#2979FF' }}>
                            {opt.type === 'movie' ? '🎬 فيلم' : '🎭 مسرحية'}
                          </div>
                        </div>
                        {count > 0 && (
                          <div style={{
                            background: 'var(--bg-dark-purple)', color: '#FFF',
                            padding: '2px 10px', borderRadius: '100px',
                            fontWeight: 950, fontSize: 13, flexShrink: 0,
                          }}>{count}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {cs.titleVotes?.[myUid] !== undefined && (
                  <div style={{ textAlign: 'center', marginTop: 16, fontWeight: 950, color: 'var(--bg-green)', fontSize: 14 }}>
                    ✅ تم التصويت! بانتظار البقية...
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#FFF', borderRadius: '18px', border: '4px solid var(--bg-dark-purple)',
                padding: 24, textAlign: 'center', boxShadow: '6px 6px 0 var(--bg-pink)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
                <h3 style={{ fontWeight: 950, color: 'var(--bg-dark-purple)', fontSize: 16 }}>
                  فريق {cs.currentTeam === 'A' ? 'الأحمر' : 'الأزرق'} يختاروا...
                </h3>
              </div>
            )}
          </div>
        )}

        {/* ===== SELECT ACTOR ===== */}
        {phase === 'selectActor' && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            {isOnCurrentTeam ? (
              <div>
                <div style={{
                  background: 'var(--bg-dark-purple)', borderRadius: '14px', padding: '14px 16px',
                  border: '3px solid var(--bg-pink)', textAlign: 'center', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 950, color: 'var(--bg-yellow)', marginBottom: 4 }}>العنوان المختار</div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: '#FFF' }}>{cs.currentTitle}</div>
                  <div style={{ fontSize: 11, fontWeight: 950, color: 'var(--bg-yellow)' }}>
                    {cs.currentTitleType === 'movie' ? '🎬 فيلم' : '🎭 مسرحية'}
                  </div>
                </div>
                <h2 style={{ textAlign: 'center', fontWeight: 950, fontSize: 16, color: 'var(--bg-dark-purple)', marginBottom: 14 }}>
                  اختاروا مين يمثّل! 🎭
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {currentTeamPlayers.map(uid => {
                    const p = room?.players?.[uid];
                    const voted = cs.actorVotes?.[myUid] === uid;
                    const count = actorVoteCounts[currentTeamPlayers.indexOf(uid)] || 0;
                    const alreadyActed = actedSet.has(uid);
                    return (
                      <button key={uid} onClick={() => handleVoteActor(uid)} disabled={alreadyActed} style={{
                        padding: 14, borderRadius: '14px',
                        background: voted ? 'var(--bg-yellow)' : alreadyActed ? '#EEE' : '#FFF',
                        border: alreadyActed ? '3px solid #CCC' : '3px solid var(--bg-dark-purple)',
                        boxShadow: voted ? 'none' : '4px 4px 0 var(--bg-dark-purple)',
                        transform: voted ? 'translate(4px,4px)' : 'none',
                        cursor: !alreadyActed && cs.actorVotes?.[myUid] === undefined ? 'pointer' : 'default',
                        opacity: alreadyActed ? 0.4 : 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      }}>
                        <UserAvatar avatarId={p?.avatarId ?? 1} size={44} />
                        <span style={{ fontWeight: 950, fontSize: 12, color: 'var(--bg-dark-purple)' }}>{p?.username}</span>
                        {alreadyActed && <span style={{ fontSize: 9, color: 'var(--bg-pink)', fontWeight: 950 }}>مثّل بالفعل ✓</span>}
                        {count > 0 && (
                          <div style={{
                            background: 'var(--bg-dark-purple)', color: '#FFF',
                            padding: '1px 8px', borderRadius: '100px', fontWeight: 950, fontSize: 11,
                          }}>{count} صوت</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {cs.actorVotes?.[myUid] !== undefined && (
                  <div style={{ textAlign: 'center', marginTop: 14, fontWeight: 950, color: 'var(--bg-green)', fontSize: 14 }}>
                    ✅ تم التصويت!
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#FFF', borderRadius: '18px', border: '4px solid var(--bg-dark-purple)',
                padding: 24, textAlign: 'center', boxShadow: '6px 6px 0 var(--bg-pink)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
                <h3 style={{ fontWeight: 950, color: 'var(--bg-dark-purple)', fontSize: 16 }}>
                  فريق {cs.currentTeam === 'A' ? 'الأحمر' : 'الأزرق'} يختاروا الممثل...
                </h3>
              </div>
            )}
          </div>
        )}

        {/* ===== ACTING ===== */}
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
                <div style={{ fontSize: 28, fontWeight: 950, color: '#FFF', marginBottom: 12, lineHeight: 1.3 }}>
                  {cs.currentTitle}
                </div>
                <div style={{ fontSize: 13, fontWeight: 950, color: 'var(--bg-yellow)', marginBottom: 4 }}>
                  ({cs.currentTitleType === 'movie' ? '🎬 فيلم' : '🎭 مسرحية'})
                </div>
                {cs.currentChallenge && (
                  <div style={{
                    marginTop: 14, background: 'var(--bg-pink)', color: '#FFF',
                    padding: '12px 16px', borderRadius: '12px',
                    border: '3px solid #FFF', fontWeight: 950, fontSize: 14,
                  }}>🎲 تحدي: {cs.currentChallenge}</div>
                )}
                <div style={{ marginTop: 14, fontSize: 32, fontWeight: 950, color: timeLeft <= 15 ? 'var(--bg-pink)' : 'var(--bg-yellow)' }}>
                  {timeLeft}ث
                </div>
              </div>
            ) : isOnCurrentTeam ? (
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
                    }}>🎲 تحدي: {cs.currentChallenge}</div>
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
                  <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 950, color: timeLeft <= halfTime ? 'var(--bg-pink)' : 'var(--bg-green)', marginBottom: 12 }}>
                    {timeLeft}ث متبقية {timeLeft <= halfTime ? '⚠️' : ''}
                  </div>
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
                      <button onClick={handleGuess} className="btn btn-yellow"
                        style={{ padding: '0 20px', borderRadius: '12px' }}>خمّن</button>
                    </div>
                    {isHost && (
                      <button onClick={handleCorrectGuess} className="btn btn-green"
                        style={{ width: '100%', padding: 12, borderRadius: '12px', fontSize: 14 }}>
                        ✅ الإجابة صحيحة!
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  background: '#FFF', borderRadius: '18px', padding: 24,
                  border: '4px solid var(--bg-dark-purple)', boxShadow: '6px 6px 0 var(--bg-pink)',
                  textAlign: 'center', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>👀</div>
                  <h3 style={{ fontWeight: 950, color: 'var(--bg-dark-purple)', fontSize: 16, marginBottom: 8 }}>
                    {actorPlayer?.username} يمثّل لفريق {cs.currentTeam === 'A' ? 'الأحمر' : 'الأزرق'}!
                  </h3>
                  <p style={{ fontSize: 13, color: '#888', fontWeight: 950 }}>
                    تابعوا التمثيل! 🍿
                  </p>
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
                  <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 950, color: timeLeft <= halfTime ? 'var(--bg-pink)' : 'var(--bg-green)', marginBottom: 12 }}>
                    {timeLeft}ث متبقية {timeLeft <= halfTime ? '⚠️' : ''}
                  </div>
                  {isHost && (
                    <button onClick={handleCorrectGuess} className="btn btn-green"
                      style={{ width: '100%', padding: 12, borderRadius: '12px', fontSize: 14 }}>
                      ✅ تأكيد الإجابة الصحيحة
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ROUND RESULT ===== */}
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
                <div style={{ fontSize: 13, opacity: 0.8 }}>التحدي كان: {cs.currentChallenge}</div>
              )}
              {cs.phaseData?.correct && cs.phaseData?.beforeHalf && (
                <div style={{
                  background: 'var(--bg-yellow)', color: 'var(--bg-dark-purple)',
                  padding: '6px 14px', borderRadius: '8px', fontWeight: 950, fontSize: 13,
                  border: '2px solid var(--bg-dark-purple)',
                  boxShadow: '2px 2px 0 var(--bg-dark-purple)',
                  display: 'inline-block', marginBottom: 8, marginTop: 8,
                }}>
                  ⚡ جاوبوا قبل نص الوقت! +3 نقاط
                </div>
              )}
              {cs.phaseData?.correct && (
                <div style={{
                  marginTop: 8, background: 'var(--bg-yellow)', color: 'var(--bg-dark-purple)',
                  padding: '10px 20px', borderRadius: '12px', display: 'inline-block',
                  fontWeight: 950, fontSize: 18, border: '3px solid var(--bg-dark-purple)',
                }}>
                  +{cs.phaseData.points} نقطة {cs.phaseData?.beforeHalf ? '⚡' : ''}
                </div>
              )}
            </div>
            {isHost && (
              <button onClick={handleNext} className="btn btn-yellow"
                style={{ width: '100%', padding: 16, borderRadius: '14px', marginTop: 16, fontSize: 16, fontWeight: 950 }}>
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
