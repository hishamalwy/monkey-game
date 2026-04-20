import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { joinRoom } from '../../firebase/rooms';

export default function InviteHandler() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const hash = window.location.hash;
    const joinMatch = hash.match(/[?&]join=([A-Z0-9]{4})/i);
    if (!joinMatch) return;

    const code = joinMatch[1].toUpperCase();
    handledRef.current = true;

    if (!user || !userProfile) {
      sessionStorage.setItem('pendingJoin', code);
      return;
    }

    joinRoom(code, userProfile)
      .then(() => {
        navigate(`/lobby/${code}`, { replace: true });
        window.location.hash = `#/lobby/${code}`;
      })
      .catch(() => {
        sessionStorage.removeItem('pendingJoin');
        navigate('/home', { replace: true });
      });
  }, [user, userProfile, navigate]);

  useEffect(() => {
    if (!user || !userProfile || handledRef.current) return;

    const pending = sessionStorage.getItem('pendingJoin');
    if (!pending) return;

    handledRef.current = true;
    sessionStorage.removeItem('pendingJoin');

    joinRoom(pending, userProfile)
      .then(() => {
        navigate(`/lobby/${pending}`, { replace: true });
      })
      .catch(() => {
        navigate('/home', { replace: true });
      });
  }, [user, userProfile, navigate]);

  return null;
}
