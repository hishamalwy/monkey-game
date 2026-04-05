export default function ExitConfirmModal({ onCancel, onConfirm, title = 'تخرج من الغرفة؟', icon = '🚪', confirmLabel = 'خروج', cancelLabel = 'رجوع للعب' }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'rgba(28,16,63,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card slide-up" style={{ padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--bg-dark-purple)', margin: '0 0 12px' }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--bg-dark-purple)', opacity: 0.7, marginBottom: 20 }}>سيتم فصلك من هذه الجولة.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} className="btn btn-white" style={{ flex: 1, padding: 14 }}>{cancelLabel}</button>
          <button onClick={onConfirm} className="btn btn-pink" style={{ flex: 1, padding: 14 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
