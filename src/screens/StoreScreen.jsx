import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import Toast from '../components/ui/Toast';
import { useNavigation } from '../hooks/useNavigation';
import { STORE_ITEMS, isItemOwned, canAfford } from '../utils/store';
import { purchaseItem } from '../firebase/store';
import { previewHorn } from '../utils/audio';
import { getAvatarUrl } from '../components/ui/AvatarPicker';
import singleCoinIcon from '../assets/icons/single_coin.png';
import treasureChestIcon from '../assets/icons/treasure_chest.png';

const TABS = [
  { key: 'avatars', label: 'أفاتارات 🐒' },
  { key: 'horns', label: 'أصوات 📢' },
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
      setToast('ما عندك كفاية عملات! 💸');
      return;
    }
    setBuying(item.id);
    try {
      await purchaseItem(userProfile.uid, item.id, item.price);
      setToast('تم الشراء بنجاح! 🎉');
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    } finally {
      setBuying(null);
    }
  };

  const items = STORE_ITEMS[activeTab] || [];

  return (
    <div className="brutal-bg" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-yellow)', overflow: 'hidden' }}>
      
      {/* Background Decor */}
      <div className="bg-stickers">
        <div style={{ position: 'absolute', top: '10%', left: '5%', opacity: 0.6 }}>
          <img src={singleCoinIcon} style={{ width: 40, height: 40, transform: 'rotate(-20deg)' }} />
        </div>
        <div style={{ position: 'absolute', top: '50%', right: '8%', fontSize: 24, transform: 'rotate(15deg)' }}>🐵</div>
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', fontSize: 40, transform: 'rotate(-10deg)' }}>🍌</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={treasureChestIcon} style={{ width: 44, height: 44, objectFit: 'contain' }} alt="Store" />
          <h1 style={{ fontSize: 24, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0 }}>المتجر</h1>
        </div>
        <div className="card" style={{
          background: 'var(--bg-dark-purple)', color: '#FFE300', padding: '6px 14px',
          fontWeight: 950, fontSize: 16, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: 'none'
        }}>
          {coins} <img src={singleCoinIcon} style={{ width: 22, height: 22 }} />
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', background: '#FFF', borderBottom: 'var(--brutal-border)', padding: '4px 12px', position: 'relative', zIndex: 10 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn ${activeTab === tab.key ? 'btn-pink' : 'btn-white'}`}
            style={{
              flex: 1, margin: '12px 4px', padding: '12px', fontSize: 15, fontWeight: 950,
              borderRadius: '12px',
              border: '4px solid var(--bg-dark-purple)',
              boxShadow: activeTab === tab.key ? 'none' : '4px 4px 0 var(--bg-dark-purple)',
              transform: activeTab === tab.key ? 'translate(4px, 4px)' : 'none',
              transition: 'all 0.1s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Item Grid */}
      <div className="content-with-nav" style={{ 
        flex: 1, overflowY: 'auto', padding: '24px 16px env(safe-area-inset-bottom)', 
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, 
        alignItems: 'start', alignContent: 'start', position: 'relative', zIndex: 5
      }}>
        {items.map(item => {
          const owned = isItemOwned(purchases, item.id);
          const affordable = canAfford(coins, item.price);
          const isBuying = buying === item.id;

          return (
            <div key={item.id} className="card" style={{
              padding: '20px 12px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', gap: 14,
              background: '#FFF',
              borderRadius: '16px',
              opacity: !affordable && !owned ? 0.8 : 1,
              border: '4px solid var(--bg-dark-purple)',
              boxShadow: '6px 6px 0 var(--bg-dark-purple)'
            }}>
              {item.type === 'avatar' && (
                <div style={{ 
                   width: 84, height: 84, borderRadius: '14px', overflow: 'hidden', 
                   border: '4px solid var(--bg-dark-purple)', background: '#F8F9FA'
                }}>
                  <img src={getAvatarUrl(item.avatarId)} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              {item.type === 'horn' && (
                <button 
                   onClick={() => previewHorn(item.hornId)}
                   className="btn btn-white"
                   style={{ 
                     width: 84, height: 84, borderRadius: '14px', 
                     border: '4px solid var(--bg-dark-purple)', display: 'flex', alignItems: 'center', 
                     justifyContent: 'center', fontSize: 36, boxShadow: '4px 4px 0 var(--bg-dark-purple)'
                   }}
                >
                  📢
                </button>
              )}

              <div style={{ fontSize: 13, fontWeight: 950, color: 'var(--bg-dark-purple)', lineHeight: 1.2 }}>
                {item.label}
              </div>

              <div style={{ width: '100%', marginTop: 'auto' }}>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={isBuying || owned}
                  className={`btn ${owned ? 'btn-white' : affordable ? 'btn-pink' : 'btn-dark'}`}
                  style={{
                    width: '100%', padding: '12px 4px', fontSize: 13,
                    borderRadius: '12px',
                    borderColor: owned ? 'var(--bg-green)' : 'var(--bg-dark-purple)',
                    opacity: isBuying ? 0.5 : 1,
                    boxShadow: owned ? 'none' : '4px 4px 0 var(--bg-dark-purple)',
                  }}
                >
                  {isBuying ? '...' : owned ? 'تمتلكه ✅' : (
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
