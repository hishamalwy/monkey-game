export default function LoadingSpinner({ size = 40 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: size, height: size,
        border: `4px solid #000`,
        borderTopColor: 'var(--neo-pink)',
        borderRightColor: 'var(--neo-cyan)',
        borderBottomColor: 'var(--neo-green)',
        borderRadius: 0,
        animation: 'spin 0.6s steps(4) infinite',
        boxShadow: '4px 4px 0 #000'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

    </div>
  );
}
