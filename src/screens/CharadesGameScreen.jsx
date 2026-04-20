import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { listenToRoom } from '../firebase/rooms';
import {
  startCharadesGame, charadesJoinTeam, charadesConfirmTeams,
  charadesVoteTitle, charadesResolveTitle,
  charadesVoteActor, charadesResolveActor,
  charadesHostConfirmCorrect, charadesActorReady,
  charadesLeaderAdjustScore, charadesSetTeamLeader,
  charadesEndRound, charadesNextRound,
} from '../firebase/charadesRooms';
import UserAvatar from '../components/ui/UserAvatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { useNavigation, useRoomCode } from '../hooks/useNavigation';

function getOpposingTeam(team) {
  return team === 'A' ? 'B' : 'A';
}

const TEAM_LABELS = { A: 'الأحمر', B: 'الأزرق' };
const TEAM_COLORS = { A: 'var(--neo-pink)', B: 'var(--neo-cyan)' };
const TYPE_LABELS = { movie: '🎬 فيلم', series: '📺 مسلسل', play: '🎭 مسرحية' };

export default function CharadesGameScreen() {
  const roomCode = useRoomCode();
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const { playClick, playCorrect, playIncorrect, playTension, stopTension, playJoin } = useAudio();
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [voteTimeLeft, setVoteTimeLeft] = useState(0);
  const [prepTimeLeft, setPrepTimeLeft] = useState(0);

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
  const myTeam = teamA.includes(myUid) ? 'A' : teamB.includes(myUid) ? 'B' : null;
  const choosingTeam = cs?.choosingTeam || 'A';
  const guessingTeam = choosingTeam === 'A' ? 'B' : 'A';
  const choosingTeamPlayers = choosingTeam === 'A' ? teamA : teamB;
  const guessingTeamPlayers = guessingTeam === 'A' ? teamA : teamB;
  const isOnChoosingTeam = choosingTeamPlayers?.includes(myUid);
  const isOnGuessingTeam = guessingTeamPlayers?.includes(myUid);
  const phase = cs?.phase;
  const scoreTarget = cs?.scoreTarget || 20;
  const charadesTime = cs?.charadesTime || 60;

  const teamLeaders = cs?.teamLeaders || {};
  const isTeamLeader = teamLeaders[myTeam] === myUid;
  const choosingTeamLeader = teamLeaders[choosingTeam];
  const isChoosingTeamLeader = choosingTeamLeader === myUid;

  useEffect(() => {
    if (!cs?.timeEndsAt) return;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.round((cs.timeEndsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0 && isHost) {
        clearInterval(iv);
        charadesEndRound(roomCode, myUid).catch(() => {});
      }
    }, 1000);
    setTimeLeft(Math.max(0, Math.round((cs.timeEndsAt - Date.now()) / 1000)));
    return () => clearInterval(iv);
  }, [cs?.timeEndsAt, isHost, roomCode]);

  // Combined Resolution Timer for Vote and Prep
  useEffect(() => {
    const iv = setInterval(() => {
      if (cs?.voteTimerEndsAt) {
        const left = Math.max(0, Math.round((cs.voteTimerEndsAt - Date.now()) / 1000));
        setVoteTimeLeft(left);
        if (left <= 0 && isHost) {
          if (phase === 'titleVote') charadesResolveTitle(roomCode, myUid).catch(() => {});
          if (phase === 'selectActor') charadesResolveActor(roomCode, myUid).catch(() => {});
        }
      }
      if (cs?.prepTimerEndsAt) {
        const left = Math.max(0, Math.round((cs.prepTimerEndsAt - Date.now()) / 1000));
        setPrepTimeLeft(left);
        if (left <= 0 && isHost) {
          charadesActorReady(roomCode, myUid).catch(() => {});
        }
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [cs?.voteTimerEndsAt, cs?.prepTimerEndsAt, isHost, phase, roomCode]);

  useEffect(() => {
    if (phase === 'acting' && cs?.actorReady) {
      if (timeLeft <= 15 && timeLeft > 0) playTension();
      else stopTension();
    } else if (phase === 'roundResult') {
      stopTension();
    } else {
      stopTension();
    }
  }, [phase, cs?.actorReady, timeLeft, playTension, stopTension]);

  useEffect(() => {
    return () => stopTension();
  }, [stopTension]);

  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current === 'acting' && phase === 'roundResult') {
      if (cs?.phaseData?.correct) playCorrect();
      else playIncorrect();
    }
    prevPhaseRef.current = phase;
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isHost || !cs) return;
    if (phase === 'titleVote') {
      const members = choosingTeamPlayers || [];
      const votes = cs.titleVotes || {};
      if (members.length > 0 && members.every(uid => votes[uid] !== undefined)) {
        const timer = setTimeout(() => {
          charadesResolveTitle(roomCode, myUid).catch(() => {});
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
    if (phase === 'selectActor') {
      const members = choosingTeamPlayers || [];
      const votes = cs.actorVotes || {};
      if (members.length > 0 && members.every(uid => votes[uid] !== undefined)) {
        const timer = setTimeout(() => {
          charadesResolveActor(roomCode, myUid).catch(() => {});
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [cs?.titleVotes, cs?.actorVotes, phase, isHost, roomCode, choosingTeamPlayers]);

  if (!room || !cs) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>;
  }

  const handleJoinTeam = (team) => {
    playClick();
    charadesJoinTeam(roomCode, myUid, team).catch(e => setToast(e.message));
  };

  const handleConfirmTeams = () => {
    playClick();
    charadesConfirmTeams(roomCode, myUid).catch(e => setToast(e.message));
  };

  const handleVoteTitle = (optionIndex) => {
    if (cs.titleVotes?.[myUid] !== undefined) return;
    playClick();
    charadesVoteTitle(roomCode, myUid, optionIndex).catch(e => setToast(e.message));
  };

  const handleVoteActor = (actorUid) => {
    if (cs.actorVotes?.[myUid] !== undefined) return;
    playClick();
    charadesVoteActor(roomCode, myUid, actorUid).catch(e => setToast(e.message));
  };

  const handleCorrectGuess = async () => {
    if (!isTeamLeader && !isHost) return;
    try {
      await charadesHostConfirmCorrect(roomCode, myUid);
    } catch (e) { setToast(e.message); }
  };

  const handleWithdraw = async () => {
    if (!isActor) return;
    try {
      await charadesEndRound(roomCode, myUid);
    } catch (e) { setToast(e.message); }
  };

  const handleAdjustScore = async (team, delta) => {
    if (!isHost) return;
    try {
      await charadesLeaderAdjustScore(roomCode, myUid, team, delta);
    } catch (e) { setToast(e.message); }
  };

  const handleActorReady = async () => {
    if (!isActor) return;
    try {
      await charadesActorReady(roomCode, myUid);
    } catch (e) { setToast(e.message); }
  };

  const handleNext = async () => {
    if (!isHost) return;
    try {
      await charadesNextRound(roomCode, myUid);
    } catch (e) { setToast(e.message); }
  };

  const allJoined = allPlayers.length > 0 && allPlayers.every(uid => teamA.includes(uid) || teamB.includes(uid));
  const teamAMin2 = teamA.length >= 2;
  const teamBMin2 = teamB.length >= 2;
  const canStart = allJoined && teamAMin2 && teamBMin2;

  const isActor = cs?.currentActorUid === myUid;
  const actorPlayer = cs?.currentActorUid ? room?.players?.[cs.currentActorUid] : null;
  const timePct = charadesTime > 0 ? (timeLeft / charadesTime) * 100 : 0;
  const halfTime = charadesTime / 2;

  const titleVoteCounts = (cs?.titleOptions || []).map((_, i) => {
    return Object.values(cs.titleVotes || {}).filter(v => v === i).length;
  });

  const actorVoteCounts = (guessingTeamPlayers || []).map(uid => {
    return Object.values(cs.actorVotes || {}).filter(v => v === uid).length;
  });

  const actedSet = new Set(cs?.actedPlayers?.[guessingTeam] || []);

  const scoreA = cs.scores?.A || 0;
  const scoreB = cs.scores?.B || 0;

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <div style={{
        background: '#FFF', borderBottom: '5px solid #000',
        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, zIndex: 10,
      }}>
        <button onClick={() => nav.toHome()} className="btn btn-white" style={{ width: 44, height: 44, fontSize: 16, borderRadius: 0, border: '3.5px solid #000', padding: 0, flexShrink: 0 }}>✕</button>
        <div style={{
          background: '#000', color: 'var(--neo-yellow)',
          padding: '6px 14px', borderRadius: 0, fontWeight: 900, fontSize: 13,
          border: 'none', boxShadow: '4px 4px 0 var(--neo-pink)',
        }}>
          {phase === 'chooseTeam' ? 'اختيار الفرق 🎭' : `الجولة ${cs.roundNumber} 🎭`}
        </div>
        <div style={{ width: 44, flexShrink: 0 }} />
      </div>

      {phase !== 'chooseTeam' && (
        <div style={{
          background: '#FFF', borderBottom: '4px solid #000',
          padding: '10px 16px', display: 'flex', justifyContent: 'space-around', flexShrink: 0, alignItems: 'center',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 11, color: 'var(--neo-pink)' }}>الأحمر</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isHost && (
                <button onClick={() => handleAdjustScore('A', -1)} style={{ background: '#FFF', border: '2px solid #000', borderRadius: 0, padding: '0 8px', fontWeight: 900 }}>-</button>
              )}
              <div style={{ fontWeight: 900, fontSize: 24, color: '#000' }}>{scoreA}</div>
              {isHost && (
                <button onClick={() => handleAdjustScore('A', 1)} style={{ background: '#FFF', border: '2px solid #000', borderRadius: 0, padding: '0 8px', fontWeight: 900 }}>+</button>
              )}
            </div>
            <div style={{ height: 10, background: '#DDD', borderRadius: 0, marginTop: 4, border: '2.5px solid #000' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (scoreA / scoreTarget) * 100)}%`, background: 'var(--neo-pink)', transition: 'width 0.5s', borderRight: scoreA > 0 ? '2.5px solid #000' : 'none' }} />
            </div>
          </div>
          <div style={{
            background: '#000', color: 'var(--neo-yellow)',
            padding: '4px 12px', borderRadius: 0, fontWeight: 900, fontSize: 11,
            border: 'none', margin: '0 12px', whiteSpace: 'nowrap',
            boxShadow: '3px 3px 0 var(--neo-pink)'
          }}>
            هدف {scoreTarget}
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 11, color: 'var(--neo-cyan)' }}>الأزرق</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isHost && (
                <button onClick={() => handleAdjustScore('B', -1)} style={{ background: '#FFF', border: '2px solid #000', borderRadius: 0, padding: '0 8px', fontWeight: 900 }}>-</button>
              )}
              <div style={{ fontWeight: 900, fontSize: 24, color: '#000' }}>{scoreB}</div>
              {isHost && (
                <button onClick={() => handleAdjustScore('B', 1)} style={{ background: '#FFF', border: '2px solid #000', borderRadius: 0, padding: '0 8px', fontWeight: 900 }}>+</button>
              )}
            </div>
            <div style={{ height: 10, background: '#DDD', borderRadius: 0, marginTop: 4, border: '2.5px solid #000' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (scoreB / scoreTarget) * 100)}%`, background: 'var(--neo-cyan)', transition: 'width 0.5s', borderRight: scoreB > 0 ? '2.5px solid #000' : 'none' }} />
            </div>
          </div>
        </div>
      )}

      {phase !== 'chooseTeam' && phase !== 'roundResult' && phase !== 'gameOver' && (
        <div style={{
          background: TEAM_COLORS[choosingTeam], padding: '6px 16px',
          textAlign: 'center', flexShrink: 0, borderBottom: '3.5px solid #000'
        }}>
          <span style={{ fontWeight: 900, fontSize: 11, color: '#000' }}>
            الفريق {TEAM_LABELS[choosingTeam]} يختار // الفريق {TEAM_LABELS[guessingTeam]} يخمن
          </span>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16, overflow: 'auto' }}>

        {/* ===== CHOOSE TEAM ===== */}
        {phase === 'chooseTeam' && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, color: '#000', marginBottom: 4 }}>
              اختر فريقك 🎭
            </h2>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#666', marginBottom: 24, fontWeight: 900, direction: 'rtl' }}>
              يتطلب كل فريق لاعبين أو أكثر ({teamA.length + teamB.length}/{allPlayers.length} انضموا)
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              <button onClick={() => handleJoinTeam('A')} style={{
                flex: 1, padding: '24px 12px', borderRadius: 0,
                background: myTeam === 'A' ? 'var(--neo-pink)' : '#FFF',
                border: '4.5px solid #000',
                boxShadow: myTeam === 'A' ? 'none' : '6px 6px 0 var(--neo-pink)',
                transform: myTeam === 'A' ? 'translate(4px,4px)' : 'none',
                cursor: 'pointer', textAlign: 'center', position: 'relative',
                transition: 'none'
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔴</div>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#000' }}>الأحمر 🔴</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                  {teamA.map(uid => {
                    const p = room?.players?.[uid];
                    const isL = teamLeaders.A === uid;
                    return (
                      <div key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ position: 'relative' }}>
                          <UserAvatar avatarId={p?.avatarId ?? 1} size={32} border="1.5px solid #000" />
                          {isL && <div style={{ position: 'absolute', top: -6, right: -6, background: 'var(--neo-yellow)', borderRadius: 0, width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #000', fontWeight: 900 }}>L</div>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#000' }}>{p?.username?.slice(0, 6)}</span>
                      </div>
                    );
                  })}
                </div>
                {myTeam === 'A' && teamLeaders.A !== myUid && !teamA.includes(room.hostUid) && (
                  <button onClick={(e) => { e.stopPropagation(); charadesSetTeamLeader(roomCode, 'A', myUid); }} style={{ marginTop: 12, fontSize: 9, background: '#000', color: '#FFF', borderRadius: 0, padding: '3px 8px', fontWeight: 900, border: 'none' }}>كن قائداً</button>
                )}
              </button>
              <button onClick={() => handleJoinTeam('B')} style={{
                flex: 1, padding: '24px 12px', borderRadius: 0,
                background: myTeam === 'B' ? 'var(--neo-cyan)' : '#FFF',
                border: '4.5px solid #000',
                boxShadow: myTeam === 'B' ? 'none' : '6px 6px 0 var(--neo-cyan)',
                transform: myTeam === 'B' ? 'translate(4px,4px)' : 'none',
                cursor: 'pointer', textAlign: 'center', position: 'relative',
                transition: 'none'
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔵</div>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#000' }}>الأزرق 🔵</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                  {teamB.map(uid => {
                    const p = room?.players?.[uid];
                    const isL = teamLeaders.B === uid;
                    return (
                      <div key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ position: 'relative' }}>
                          <UserAvatar avatarId={p?.avatarId ?? 1} size={32} border="1.5px solid #000" />
                          {isL && <div style={{ position: 'absolute', top: -6, right: -6, background: 'var(--neo-yellow)', borderRadius: 0, width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #000', fontWeight: 900 }}>L</div>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#000' }}>{p?.username?.slice(0, 6)}</span>
                      </div>
                    );
                  })}
                </div>
                {myTeam === 'B' && teamLeaders.B !== myUid && !teamB.includes(room.hostUid) && (
                  <button onClick={(e) => { e.stopPropagation(); charadesSetTeamLeader(roomCode, 'B', myUid); }} style={{ marginTop: 12, fontSize: 9, background: '#000', color: '#FFF', borderRadius: 0, padding: '3px 8px', fontWeight: 900, border: 'none' }}>كن قائداً</button>
                )}
              </button>

            </div>
            <p style={{ textAlign: 'center', fontSize: 10, color: '#666', marginTop: 16, fontWeight: 900, direction: 'rtl' }}>أول لاعب ينضم يصبح قائد الفريق</p>
            {!teamAMin2 && <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--neo-pink)', fontWeight: 900 }}>⚠️ الفريق الأحمر يحتاج لاعبين أكثر</p>}
            {!teamBMin2 && <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--neo-cyan)', fontWeight: 900 }}>⚠️ الفريق الأزرق يحتاج لاعبين أكثر</p>}
            {isHost && canStart && (
              <button onClick={handleConfirmTeams} className="btn btn-yellow"
                style={{ width: '100%', padding: 18, borderRadius: 0, fontSize: 18, fontWeight: 900, marginTop: 16, border: '5px solid #000', boxShadow: '8px 8px 0 #000' }}>
                ابدأ اللعبة 🚀
              </button>
            )}
          </div>
        )}

        {/* ===== TITLE VOTE ===== */}
        {phase === 'titleVote' && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            {isOnChoosingTeam ? (
              <div>
                <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 18, color: '#000', marginBottom: 6 }}>
                  اختر العنوان 🤔
                </h2>
                {cs.voteTimerEndsAt && (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <span style={{ background: 'var(--neo-pink)', color: '#000', padding: '4px 16px', borderRadius: 0, fontSize: 12, fontWeight: 900, border: '2.5px solid #000' }}>
                      الوقت: {voteTimeLeft} ث
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(cs.titleOptions || []).map((opt, i) => {
                    const voted = cs.titleVotes?.[myUid] === i;
                    const count = titleVoteCounts[i] || 0;
                    return (
                      <button key={i} onClick={() => handleVoteTitle(i)} style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: 18,
                        borderRadius: 0, textAlign: 'left',
                        background: voted ? 'var(--neo-yellow)' : '#FFF',
                        border: '4px solid #000',
                        boxShadow: voted ? 'none' : '5px 5px 0 #000',
                        transform: voted ? 'translate(4px,4px)' : 'none',
                        cursor: cs.titleVotes?.[myUid] !== undefined ? 'default' : 'pointer',
                        opacity: cs.titleVotes?.[myUid] !== undefined && !voted ? 0.5 : 1,
                        width: '100%',
                        transition: 'none'
                      }}>
                        <div style={{ fontSize: 32 }}>{opt.emoji}</div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontWeight: 900, fontSize: 17, color: '#000' }}>{opt.title}</div>
                          <div style={{ fontSize: 10, fontWeight: 900, color: opt.type === 'movie' ? 'var(--neo-pink)' : opt.type === 'series' ? 'var(--neo-cyan)' : 'var(--neo-green)' }}>
                            {TYPE_LABELS[opt.type] || opt.type}
                          </div>
                        </div>
                        {count > 0 && (
                          <div style={{
                            background: '#000', color: '#FFF',
                            padding: '2px 12px', borderRadius: 0,
                            fontWeight: 900, fontSize: 14, flexShrink: 0,
                          }}>{count}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {cs.titleVotes?.[myUid] !== undefined && (
                  <div style={{ textAlign: 'center', marginTop: 20, fontWeight: 900, color: 'var(--neo-green)', fontSize: 14, background: '#000', padding: '6px', border: '3px solid #000' }}>
                    تم التصويت ✅
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#FFF', borderRadius: 0, border: '5px solid #000',
                padding: 32, textAlign: 'center', boxShadow: '10px 10px 0 var(--neo-pink)',
              }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
                <h3 style={{ fontWeight: 900, color: '#000', fontSize: 16, direction: 'rtl' }}>
                  الفريق {TEAM_LABELS[choosingTeam]} يختار العنوان...
                </h3>
                <p style={{ fontSize: 11, color: '#666', fontWeight: 900, marginTop: 12 }}>
                  استعد للتخمين 💪
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===== SELECT ACTOR ===== */}
        {phase === 'selectActor' && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            {isOnChoosingTeam ? (
              <div>
                <div style={{
                  background: '#000', borderRadius: 0, padding: '20px',
                  border: '4px solid var(--neo-pink)', textAlign: 'center', marginBottom: 20,
                  boxShadow: '6px 6px 0 var(--neo-pink)'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--neo-yellow)', marginBottom: 6 }}>العنوان</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#FFF' }}>{cs.currentTitle}</div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--neo-yellow)' }}>
                    {TYPE_LABELS[cs.currentTitleType] || cs.currentTitleType}
                  </div>
                </div>
                <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 16, color: '#000', marginBottom: 6, direction: 'rtl' }}>
                  اختر الممثل من الفريق {TEAM_LABELS[guessingTeam]} 🎭
                </h2>
                {cs.voteTimerEndsAt && (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <span style={{ background: 'var(--neo-pink)', color: '#000', padding: '4px 16px', borderRadius: 0, fontSize: 13, fontWeight: 900, border: '2.5px solid #000' }}>
                      الوقت: {voteTimeLeft} ث
                    </span>
                  </div>
                )}
                <p style={{ textAlign: 'center', fontSize: 10, color: '#666', marginBottom: 16, fontWeight: 900, direction: 'rtl' }}>
                  الفريق الآخر سيمثل لفريقك
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {guessingTeamPlayers.map(uid => {
                    const p = room?.players?.[uid];
                    const voted = cs.actorVotes?.[myUid] === uid;
                    const count = actorVoteCounts[guessingTeamPlayers.indexOf(uid)] || 0;
                    const alreadyActed = actedSet.has(uid);
                    return (
                      <button key={uid} onClick={() => handleVoteActor(uid)} disabled={alreadyActed} style={{
                        padding: 16, borderRadius: 0,
                        background: voted ? 'var(--neo-yellow)' : alreadyActed ? '#DDD' : '#FFF',
                        border: alreadyActed ? '3px solid #999' : '4px solid #000',
                        boxShadow: voted ? 'none' : '5px 5px 0 #000',
                        transform: voted ? 'translate(4px,4px)' : 'none',
                        cursor: !alreadyActed && cs.actorVotes?.[myUid] === undefined ? 'pointer' : 'default',
                        opacity: alreadyActed ? 0.5 : 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        transition: 'none'
                      }}>
                        <UserAvatar avatarId={p?.avatarId ?? 1} size={48} border="2px solid #000" />
                        <span style={{ fontWeight: 900, fontSize: 12, color: '#000' }}>{p?.username}</span>
                        {alreadyActed && <span style={{ fontSize: 9, color: 'var(--neo-pink)', fontWeight: 900 }}>مثّل سابقاً ✓</span>}
                        {count > 0 && (
                          <div style={{
                            background: '#000', color: '#FFF',
                            padding: '2px 10px', borderRadius: 0, fontWeight: 900, fontSize: 11,
                          }}>{count} صوت</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {cs.actorVotes?.[myUid] !== undefined && (
                  <div style={{ textAlign: 'center', marginTop: 16, fontWeight: 900, color: 'var(--neo-green)', fontSize: 14, background: '#000', padding: '6px' }}>
                    تم التصويت ✅
                  </div>
                )}
              </div>
            ) : isOnGuessingTeam ? (
              <div style={{
                background: '#FFF', borderRadius: 0, border: '5px solid #000',
                padding: 32, textAlign: 'center', boxShadow: '10px 10px 0 var(--neo-cyan)',
              }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🎭</div>
                <h3 style={{ fontWeight: 900, color: '#000', fontSize: 16, direction: 'rtl' }}>
                  الفريق {TEAM_LABELS[choosingTeam]} يختار الممثل...
                </h3>
                <p style={{ fontSize: 11, color: '#666', fontWeight: 900, marginTop: 12 }}>
                  استعد للتمثيل 🤫
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* ===== ACTING ===== */}
        {phase === 'acting' && (
          <div style={{ width: '100%', maxWidth: 400 }}>
            {isActor && !cs.actorReady ? (
              <div style={{
                background: '#000', borderRadius: 0, padding: 32,
                border: '4px solid #FFF', boxShadow: '10px 10px 0 var(--neo-pink)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--neo-yellow)', marginBottom: 12 }}>
                  تحضّر 🧘 (20 ث)
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#FFF', marginBottom: 14 }}>
                  {cs.currentTitle}
                </div>
                <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neo-yellow)', marginBottom: 24 }}>
                  [{TYPE_LABELS[cs.currentTitleType] || cs.currentTitleType}]
                </div>
                <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--neo-pink)', marginBottom: 24 }}>
                  {prepTimeLeft}
                </div>
                <button onClick={handleActorReady} className="btn btn-yellow" style={{ width: '100%', padding: 18, fontSize: 18, fontWeight: 900, borderRadius: 0, border: '4px solid #000', boxShadow: '6px 6px 0 #000' }}>
                  ابدأ الآن! 🚀
                </button>
              </div>
            ) : isActor ? (
              <div style={{
                background: '#000', borderRadius: 0, padding: 32,
                border: '5px solid var(--neo-pink)', boxShadow: '10px 10px 0 var(--neo-pink)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--neo-yellow)', marginBottom: 10 }}>
                  الآن تمثّل! لا تتكلم! 🎭
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#FFF', marginBottom: 14, lineHeight: 1.3 }}>
                  {cs.currentTitle}
                </div>
                <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neo-yellow)', marginBottom: 6 }}>
                  [{TYPE_LABELS[cs.currentTitleType] || cs.currentTitleType}]
                </div>
                {cs.currentChallenge && (
                  <div style={{
                    marginTop: 16, background: 'var(--neo-pink)', color: '#000',
                    padding: '12px 16px', borderRadius: 0,
                    border: '3px solid #000', fontWeight: 900, fontSize: 14
                  }}>🎲 تحدي: {cs.currentChallenge}</div>
                )}
                <div style={{ marginTop: 20, fontSize: 44, fontWeight: 900, color: timeLeft <= 15 ? 'var(--neo-pink)' : 'var(--neo-yellow)' }}>
                  {timeLeft} ث
                </div>
                <button
                  onClick={handleWithdraw}
                  style={{
                    marginTop: 24, background: 'rgba(255,255,255,0.1)', border: '2.5px solid rgba(255,255,255,0.4)',
                    color: '#FFF', padding: '10px 24px', borderRadius: 0, fontSize: 12, fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  🏳️ تخطي
                </button>
              </div>
            ) : !cs.actorReady ? (
               <div style={{
                background: '#FFF', borderRadius: 0, padding: 32,
                border: '5px solid #000', boxShadow: '10px 10px 0 var(--neo-pink)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                <h3 style={{ fontWeight: 900, color: '#000', fontSize: 16, direction: 'rtl' }}>
                  {actorPlayer?.username} يتحضر...
                </h3>
                <p style={{ fontSize: 11, color: '#666', fontWeight: 900, marginTop: 12 }}>
                  خمن بصوت عالٍ! القائد سيحكم! 🤫
                </p>
              </div>
            ) : isOnGuessingTeam ? (
              <div>
                <div style={{
                  background: '#FFF', borderRadius: 0, padding: 24,
                  border: '5px solid #000', boxShadow: '10px 10px 0 #000',
                  textAlign: 'center', marginBottom: 20,
                }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: '#000', direction: 'rtl' }}>
                    {actorPlayer?.username} يمثل! 🎭 خمن بصوت عالٍ!
                  </div>
                  {cs.currentChallenge && (
                    <div style={{
                      marginTop: 12, background: 'var(--neo-yellow)', color: '#000',
                      padding: '8px 16px', borderRadius: 0,
                      border: '3px solid #000', fontWeight: 900, fontSize: 12
                    }}>🎲 تحدي: {cs.currentChallenge}</div>
                  )}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    width: '100%', height: 16, background: '#DDD', borderRadius: 0,
                    overflow: 'hidden', border: '3.5px solid #000', marginBottom: 16,
                  }}>
                    <div style={{
                      width: `${timePct}%`, height: '100%',
                      background: timeLeft <= halfTime ? 'var(--neo-pink)' : 'var(--neo-green)',
                      transition: 'none',
                    }} />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 900, color: '#000', marginBottom: 16 }}>
                    {timeLeft} ث متبقية {timeLeft <= halfTime ? '⚠️' : ''}
                  </div>
                  { (isHost || isTeamLeader) && (
                    <div style={{ background: '#000', padding: 20, borderRadius: 0, border: '4px solid #000', textAlign: 'center', boxShadow: '6px 6px 0 var(--neo-yellow)' }}>
                       <p style={{ fontSize: 10, fontWeight: 900, marginBottom: 12, color: 'var(--neo-yellow)', direction: 'rtl' }}>
                         [{isHost ? 'المضيف' : 'قائد الفريق'}]: اضغط لو خمنوا صح!
                       </p>
                       <button onClick={handleCorrectGuess} className="btn btn-green"
                          style={{ width: '100%', padding: 16, borderRadius: 0, fontSize: 16, fontWeight: 900, border: '3.5px solid #000', boxShadow: 'none' }}>
                          أصابوا! (+{timeLeft > halfTime ? 2 : 1} نقطة)
                       </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  background: '#FFF', borderRadius: 0, padding: 32,
                  border: '5px solid #000', boxShadow: '10px 10px 0 var(--neo-pink)',
                  textAlign: 'center', marginBottom: 20,
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>👀</div>
                  <h3 style={{ fontWeight: 900, color: '#000', fontSize: 16, marginBottom: 12, direction: 'rtl' }}>
                    {actorPlayer?.username} يمثل للفريق {TEAM_LABELS[guessingTeam]}!
                  </h3>
                  <p style={{ fontSize: 12, color: '#666', fontWeight: 900, direction: 'rtl' }}>
                    في انتظار التخمين... القائد {room.players[choosingTeamLeader]?.username} يحكم!
                  </p>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    width: '100%', height: 16, background: '#DDD', borderRadius: 0,
                    overflow: 'hidden', border: '3.5px solid #000', marginBottom: 16,
                  }}>
                    <div style={{
                      width: `${timePct}%`, height: '100%',
                      background: timeLeft <= halfTime ? 'var(--neo-pink)' : 'var(--neo-green)',
                      transition: 'none',
                    }} />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 900, color: '#000', marginBottom: 16 }}>
                    {timeLeft} ث متبقية {timeLeft <= halfTime ? '⚠️' : ''}
                  </div>
                  { (isHost || isTeamLeader) && (
                    <button onClick={handleCorrectGuess} className="btn btn-green"
                      style={{ width: '100%', padding: 18, borderRadius: 0, fontSize: 15, border: '4px solid #000', boxShadow: '6px 6px 0 #000' }}>
                      أصابوا! (+{timeLeft > halfTime ? 2 : 1} نقطة)
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
              background: cs.phaseData?.correct ? 'var(--neo-green)' : '#000',
              borderRadius: 0, padding: 32, textAlign: 'center',
              border: '5px solid #000',
              boxShadow: '12px 12px 0 var(--neo-pink)',
              color: '#000',
            }}>
              <div style={{ fontSize: 48 }}>{cs.phaseData?.correct ? '🎉' : '⏰'}</div>
              <h2 style={{ fontWeight: 900, fontSize: 24, margin: '12px 0', color: cs.phaseData?.correct ? '#000' : 'var(--neo-pink)' }}>
                {cs.phaseData?.correct ? 'إجابة صحيحة! 🎉' : 'انتهى الوقت! ⏰'}
              </h2>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12, color: cs.phaseData?.correct ? '#000' : '#FFF', direction: 'rtl' }}>
                العنوان: {cs.currentTitle}
              </div>
              {cs.currentChallenge && (
                <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 900, color: cs.phaseData?.correct ? '#000' : '#FFF', direction: 'rtl' }}>التحدي: {cs.currentChallenge}</div>
              )}
              {cs.phaseData?.correct && cs.phaseData?.beforeHalf && (
                <div style={{
                  background: 'var(--neo-yellow)', color: '#000',
                  padding: '8px 16px', borderRadius: 0, fontWeight: 900, fontSize: 13,
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0 #000',
                  display: 'inline-block', marginBottom: 12, marginTop: 16,
                }}>
                  ⚡ مكافأة السرعة! +2 نقطة
                </div>
              )}
              {cs.phaseData?.correct && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    background: '#000', color: '#FFF',
                    padding: '8px 16px', borderRadius: 0, fontWeight: 900, fontSize: 12,
                    display: 'inline-block', marginBottom: 12, border: '2px solid #000',
                  }}>
                    الفريق {TEAM_LABELS[guessingTeam]}
                  </div>
                  <div>
                    <div style={{
                      background: 'var(--neo-yellow)', color: '#000',
                      padding: '12px 24px', borderRadius: 0, display: 'inline-block',
                      fontWeight: 900, fontSize: 22, border: '4.5px solid #000', boxShadow: '6px 6px 0 #000'
                    }}>
                      +{cs.phaseData.points} نقطة {cs.phaseData?.beforeHalf ? '⚡' : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {isHost && (
              <button onClick={handleNext} className="btn btn-yellow"
                style={{ width: '100%', padding: 20, borderRadius: 0, marginTop: 24, fontSize: 18, fontWeight: 900, border: '5px solid #000', boxShadow: '8px 8px 0 #000' }}>
                الجولة التالية ➡️
              </button>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
