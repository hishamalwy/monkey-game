# Phase 6 — Coins & Store System ✅ COMPLETED

## Summary
Built a complete virtual currency and store system with purchasable avatars, horn sounds, and name colors. Coins are earned from game outcomes and spent in the store.

## Files Created
- `src/utils/store.js` — Item catalog (6 avatars, 10 horns, 6 colors), coin rewards config, ownership helpers
- `src/firebase/store.js` — `purchaseItem()`, `awardCoins()`, `setSelectedColor()` Firestore operations

## Files Modified
- `src/screens/StoreScreen.jsx` — Full rewrite from placeholder to tabbed store UI with avatars/horns/colors tabs, purchase flow, coin balance header
- `src/screens/HomeScreen.jsx` — Added coin balance display (🪙 badge) next to level badge
- `src/screens/GameOverScreen.jsx` — Awards 100 coins on win, 20 on loss
- `src/screens/DrawGameOverScreen.jsx` — Awards 120 coins on draw win, 20 on loss
- `src/screens/SurvivalGameOverScreen.jsx` — Awards 150 coins on survival win, 20 on loss
- `src/context/AuthContext.jsx` — Added `purchases` array migration for existing users

## Store Items

### Avatars (6 items, 200-500 coins)
- قرد فضائي (200), قرد نينجا (300), قرد ملك (500), قرد قرصان (400), قرد طاهي (250), قرد رياضي (350)

### Horns (10 items, 100-250 coins)
- All premium horn types now cost coins (laser, boing, ghost, ufo, sonar, bike, slide, train, cuckoo, drop)
- Free horns: classic, ambulance, duck

### Name Colors (6 items, 250-800 coins)
- Gold, Neon Green, Fire, Ice, Purple, Rainbow (800)

## Coin Rewards
| Event | Coins |
|-------|-------|
| Win (monkey) | +100 |
| Win (draw) | +120 |
| Win (survival) | +150 |
| Loss (any mode) | +20 |
| Daily bonus (constant) | +50 |
| First game (constant) | +200 |

## User Profile Fields Added
- `purchases: []` — Array of purchased item IDs stored in Firestore
- `nameColor: string` — Selected name color (set via store)

## Build Validation
- ✅ `npx vite build` passes cleanly
- Initial JS chunk: ~208KB (gzip 66KB)
- No new npm dependencies added

## Notes
- Free items (avatars 0-4, horns classic/ambulance/duck) are always available
- Purchases are stored server-side in Firestore for persistence across devices
- Coin deduction is atomic (uses Firestore `increment(-price)`)
- Duplicate purchase prevention via array membership check before write
