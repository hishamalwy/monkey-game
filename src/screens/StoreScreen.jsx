import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import Toast from '../components/ui/Toast';
import { useNavigation } from '../hooks/useNavigation';
import { STORE_ITEMS, isItemOwned, canAfford } from '../utils/store';
import { purchaseItem } from '../firebase/store';
import { previewHorn, HORN_TYPES } from '../utils/audio';
import { getAvatarUrl } from '../components/ui/AvatarPicker';
import singleCoinIcon from '../assets/icons/single_coin.png';
import treasureChestIcon from '../assets/icons/treasure_chest.png';

const TABS = [
  { key: 'avatars', label: 'الصور 🐒' },
  { key: 'horns', label: 'الأبواق 📢' },
];

export default function StoreScreen() {
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('avatars');
  const [toast, setToast] = useState('');
  const [buying, setBuying] = useState(null);
  const purchases = userProfile?.purchases || [];
  const coins = userProfile?.coins || 0;

  const handleBuy = async (item) => {
    if (isItemOwned(purchases, item.id)) return;
    if (!canAfford(coins, item.price)) {
      setToast('رصيدك غير كافٍ! 💸');
      return;
    }
    setBuying(item.id);
    try {
      await purchaseItem(userProfile.uid, item.id, item.price);
      setToast('تمت الصفقة بنجاح! 🎉');
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    } finally {
      setBuying(null);
    }
  };

  const items = STORE_ITEMS[activeTab] || [];

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <div className="bg-stickers">
        <div style={{ position: 'absolute', top: '10%', left: '5%', opacity: 0.5 }}>
          <img src={singleCoinIcon} style={{ width: 40, height: 40, transform: 'rotate(-20deg)' }} />
        </div>
        <div style={{ position: 'absolute', top: '50%', right: '8%', fontSize: 24, opacity: 0.08, transform: 'rotate(15deg)' }}>🐵</div>
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', fontSize: 40, opacity: 0.08, transform: 'rotate(-10deg)' }}>🍌</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between', position: 'relative', zIndex: 10, borderBottom: '5px solid #000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={treasureChestIcon} style={{ width: 44, height: 44, objectFit: 'contain' }} alt="Store" />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#000', margin: 0 }}>المتجر 🛒</h1>
        </div>
        <div className="card" style={{ background: '#000', color: 'var(--neo-yellow)', padding: '6px 14px', fontWeight: 900, fontSize: 16, borderRadius: 0, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '4px 4px 0 var(--neo-pink)', border: '2px solid #000' }}>
          {coins} <img src={singleCoinIcon} style={{ width: 22, height: 22 }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#FFF', borderBottom: '5px solid #000', padding: '4px 12px', position: 'relative', zIndex: 10 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn ${activeTab === tab.key ? 'btn-yellow' : 'btn-white'}`}
            style={{ flex: 1, margin: '12px 4px', padding: '12px', fontSize: 14, fontWeight: 900, borderRadius: 0, border: '3px solid #000', boxShadow: activeTab === tab.key ? 'none' : '4px 4px 0 #000', transform: activeTab === tab.key ? 'translate(3px, 3px)' : 'none', transition: 'none' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="content-with-nav" style={{ flex: 1, overflowY: 'auto', padding: '24px 16px env(safe-area-inset-bottom)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, alignItems: 'start', alignContent: 'start', position: 'relative', zIndex: 5 }}>
        {items.map(item => {
          const owned = isItemOwned(purchases, item.id);
          const affordable = canAfford(coins, item.price);
          const isBuying = buying === item.id;

          return (
            <div key={item.id} className="card" style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, background: '#FFF', borderRadius: 0, opacity: !affordable && !owned ? 0.8 : 1, border: '4px solid #000', boxShadow: '6px 6px 0 #000' }}>
              {item.type === 'avatar' && (
                <div style={{ width: 84, height: 84, borderRadius: 0, overflow: 'hidden', border: '4px solid #000', background: '#DDD' }}>
                  <img src={getAvatarUrl(item.avatarId)} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              {item.type === 'horn' && (() => {
                const hornInfo = HORN_TYPES.find(h => h.id === item.hornId);
                return (
                  <button 
                    onClick={() => previewHorn(item.hornId)} 
                    className="btn btn-white" 
                    style={{ 
                      width: 84, height: 84, borderRadius: 0, border: '4px solid #000', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: 36, boxShadow: '4px 4px 0 #000', overflow: 'hidden', padding: 8
                    }}
                  >
                    {hornInfo?.src ? (
                      <img 
                        src={`${import.meta.env.BASE_URL}icons/${hornInfo.src}`} 
                        alt={item.label} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                    ) : (
                      <span>{hornInfo?.emoji || '📢'}</span>
                    )}
                  </button>
                );
              })()}
              <div style={{ fontSize: 12, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>{item.label}</div>
              <div style={{ width: '100%', marginTop: 'auto' }}>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={isBuying || owned}
                  className={`btn ${owned ? 'btn-white' : affordable ? 'btn-pink' : 'btn-white'}`}
                  style={{ width: '100%', padding: '12px 4px', fontSize: 12, fontWeight: 900, borderRadius: 0, border: '3px solid #000', opacity: isBuying ? 0.5 : (owned ? 1 : (affordable ? 1 : 0.6)), boxShadow: owned ? 'none' : '4px 4px 0 #000' }}
                >
                  {isBuying ? '...' : owned ? 'مشترى ✅' : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {item.price} <img src={singleCoinIcon} style={{ width: 18, height: 18 }} />
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <BottomNav active="store" onNavigate={(key) => {
        if (key === 'home') nav.toHome();
        else if (key === 'leaderboard') nav.toLeaderboard();
        else if (key === 'settings') nav.toSettings();
      }} />
    </div>
  );
}
