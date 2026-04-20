import { useState } from 'react';
import { submitReport } from '../../firebase/reports';
import { useAuth } from '../../context/AuthContext';

const REASONS = [
  { id: 'abuse', label: 'سلوك مسيء', emoji: '🤬' },
  { id: 'cheating', label: 'غش', emoji: '🚫' },
  { id: 'spam', label: 'رسائل مزعجة', emoji: '📢' },
  { id: 'inappropriate', label: 'اسم أو صورة غير لائقة', emoji: '🚷' },
  { id: 'other', label: 'سبب آخر', emoji: '⚠️' },
];

export default function ReportModal({ targetUid, targetUsername, roomCode, onClose }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await submitReport(user.uid, targetUid, targetUsername, reason, roomCode);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch {
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div className="card slide-up" style={{
        padding: 28, width: '100%', maxWidth: 380, borderRadius: 0,
        border: '5px solid #000', background: '#FFF',
        boxShadow: '10px 10px 0 #000',
      }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 900, fontSize: 18, color: '#000' }}>تم الإبلاغ بنجاح</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: '#000' }}>إبلاغ عن لاعب</h3>
              <button onClick={onClose} style={{ background: '#FFF', border: '3px solid #000', borderRadius: 0, width: 36, height: 36, fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}>✕</button>
            </div>
            <div style={{ background: '#FFF', border: '3px solid #000', borderRadius: 0, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#666' }}>اللاعب:</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#000' }}>{targetUsername}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {REASONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    background: reason === r.id ? 'var(--neo-yellow)' : '#FFF',
                    border: reason === r.id ? '3.5px solid #000' : '2.5px solid #000',
                    borderRadius: 0, cursor: 'pointer', fontWeight: 900, fontSize: 14,
                    boxShadow: reason === r.id ? 'none' : '3px 3px 0 #000',
                    transform: reason === r.id ? 'translate(2px, 2px)' : 'none',
                    color: '#000', transition: 'none', textAlign: 'left',
                  }}
                >
                  <span>{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: 14, borderRadius: 0, border: '3px solid #000',
                background: '#FFF', fontWeight: 900, fontSize: 14, cursor: 'pointer',
                boxShadow: '3px 3px 0 #000',
              }}>إلغاء</button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                style={{
                  flex: 1, padding: 14, borderRadius: 0, fontWeight: 900, fontSize: 14,
                  background: reason ? '#FF4444' : '#DDD', color: reason ? '#FFF' : '#999',
                  border: '3px solid #000', cursor: reason ? 'pointer' : 'not-allowed',
                  boxShadow: reason ? '4px 4px 0 #000' : 'none',
                }}
              >
                {submitting ? '...' : 'إبلاغ'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
