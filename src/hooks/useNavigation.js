import { useNavigate, useParams } from 'react-router-dom';

export function useNavigation() {
  const navigate = useNavigate();
  const { roomCode } = useParams();

  return {
    toHome: () => navigate('/home', { replace: true }),
    toAuth: () => navigate('/auth', { replace: true }),
    toLobby: (code) => navigate(`/lobby/${code}`),
    toGame: (code) => navigate(`/game/${code || roomCode}`),
    toRoundResult: (code) => navigate(`/round-result/${code || roomCode}`),
    toGameOver: (code) => navigate(`/game-over/${code || roomCode}`),
    toOnlineSetup: () => navigate('/online-setup'),
    toBrowseRooms: () => navigate('/browse-rooms'),
    toLeaderboard: () => navigate('/leaderboard'),
    toSettings: () => navigate('/settings'),
    toDrawGame: (code) => navigate(`/draw/${code || roomCode}`),
    toDrawGameOver: (code) => navigate(`/draw-over/${code || roomCode}`),
    toSurvivalGame: (code) => navigate(`/survival/${code || roomCode}`),
    toSurvivalGameOver: (code) => navigate(`/survival-over/${code || roomCode}`),
    toStore: () => navigate('/store'),
    toProfile: () => navigate('/profile'),
  };
}

export function useRoomCode() {
  const { roomCode } = useParams();
  return roomCode;
}
