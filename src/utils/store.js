export const COIN_REWARDS = {
  WIN: 100,
  LOSS: 20,
  SURVIVAL_WIN: 150,
  DRAW_WIN: 120,
  CHARADES_WIN: 130,
  DAILY_BONUS: 50,
  FIRST_GAME: 200,
};

export const STORE_ITEMS = {
  avatars: [
    { id: 'avatar_1', type: 'avatar', avatarId: 1, label: 'عادل شكل', price: 450 },
    { id: 'avatar_2', type: 'avatar', avatarId: 2, label: 'مصطفى غريب', price: 600 },
    { id: 'avatar_3', type: 'avatar', avatarId: 3, label: 'قرد مندهش', price: 100 },
    { id: 'avatar_4', type: 'avatar', avatarId: 4, label: 'ميشيل ميلاد', price: 500 },
    { id: 'avatar_5', type: 'avatar', avatarId: 5, label: 'فخر العرب', price: 800 },
    { id: 'avatar_6', type: 'avatar', avatarId: 6, label: 'الشيخ', price: 300 },
    { id: 'avatar_7', type: 'avatar', avatarId: 7, label: 'أبونا', price: 300 },
    { id: 'avatar_8', type: 'avatar', avatarId: 8, label: 'البرنس', price: 500 },
    // { id: 'avatar_5', type: 'avatar', avatarId: 5, label: 'قرد فضائي', price: 200 },
    // { id: 'avatar_6', type: 'avatar', avatarId: 6, label: 'قرد نينجا', price: 300 },
    // { id: 'avatar_7', type: 'avatar', avatarId: 7, label: 'قرد ملك', price: 500 },
    // { id: 'avatar_8', type: 'avatar', avatarId: 8, label: 'قرد قرصان', price: 400 },
    // { id: 'avatar_9', type: 'avatar', avatarId: 9, label: 'قرد طاهي', price: 250 },
    // { id: 'avatar_10', type: 'avatar', avatarId: 10, label: 'قرد رياضي', price: 350 },
  ],
  horns: [
    { id: 'horn_car', type: 'horn', hornId: 'car', label: 'كلاكس عربية 🚗', price: 0 },
    { id: 'horn_ambulance', type: 'horn', hornId: 'ambulance', label: 'إسعاف 🚑', price: 100 },
    { id: 'horn_duck', type: 'horn', hornId: 'duck', label: 'بطة 🦆', price: 120 },
    { id: 'horn_laser', type: 'horn', hornId: 'laser', label: 'ليزر فضائي ⚡', price: 150 },
    { id: 'horn_boing', type: 'horn', hornId: 'boing', label: 'زمبلك كوميدي 🌀', price: 150 },
    { id: 'horn_ghost', type: 'horn', hornId: 'ghost', label: 'رعب شبحي 👻', price: 200 },
    { id: 'horn_ufo', type: 'horn', hornId: 'ufo', label: 'غزو فضائي 🛸', price: 250 },
    { id: 'horn_sonar', type: 'horn', hornId: 'sonar', label: 'رادار غواصة 🛰️', price: 200 },
    { id: 'horn_bike', type: 'horn', hornId: 'bike', label: 'جرس عجلة 🔔', price: 100 },
    { id: 'horn_slide', type: 'horn', hornId: 'slide', label: 'صفارة كوميدية 🎶', price: 150 },
    { id: 'horn_train', type: 'horn', hornId: 'train', label: 'قطار بخاري 🚂', price: 250 },
    { id: 'horn_cuckoo', type: 'horn', hornId: 'cuckoo', label: 'ساعة كوكو 🐦', price: 200 },
    { id: 'horn_drop', type: 'horn', hornId: 'drop', label: 'نقطة مياه 💧', price: 100 },
  ],
};

// We keep one default for fallback, or user can buy them cheap
export const FREE_AVATARS = [1, 3];
export const FREE_HORNS = ['car'];

export function isItemOwned(purchases, itemId) {
  return (purchases || []).includes(itemId);
}

export function canAfford(coins, price) {
  return coins >= price;
}

export function getOwnedAvatars(purchases) {
  const owned = [...FREE_AVATARS];
  (purchases || []).forEach(pid => {
    const item = Object.values(STORE_ITEMS).flat().find(i => i.id === pid && i.type === 'avatar');
    if (item && !owned.includes(item.avatarId)) owned.push(item.avatarId);
  });
  return owned;
}

export function getOwnedHorns(purchases) {
  const owned = [...FREE_HORNS];
  (purchases || []).forEach(pid => {
    const item = Object.values(STORE_ITEMS).flat().find(i => i.id === pid && i.type === 'horn');
    if (item && !owned.includes(item.hornId)) owned.push(item.hornId);
  });
  return owned;
}
