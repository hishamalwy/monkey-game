# Phase 9 — Reconnection & Match Flow ✅ COMPLETED

## Summary
Built a reconnection system that detects active game rooms on app load and offers to rejoin, plus a connection status indicator for offline scenarios.

 Also added ConnectionStatus component rendered at app level.

 Created ProfileStatsScreen accessible from Settings with profile button.

 Store now has items. Enhanced leaderboard with XP-based ranking. All game over screens now track match history and daily stats.

 Leaderboard properly sorts by mode-specific wins fields for draw mode. Fixed recordLoss to accept mode parameter.

 ## Files Created
 - `src/firebase/reconnect.js` — `findActiveRoom()` queries + `getGameRoute()` helper
 - `src/firebase/stats.js` — Match history recording (subcollection)
 - `src/screens/ProfileStatsScreen.jsx` — Detailed per-mode stats, match history, win rates
 streak
 - `src/components/shared/ConnectionStatus.jsx` — Offline detection banner
 - `src/components/shared/ReconnectModal.jsx` — Active game rejoin/leave dialog
 - `src/App.jsx` — Added ConnectionStatus wrapper, lazy ProfileStatsScreen route

 ## Files Modified
 - `src/firebase/leaderboard.js` — Per-mode play count tracking, mode-aware recordLoss, mode-aware leaderboard sorting
 - `src/hooks/useNavigation.js` — Added `toProfile()` navigation
 - `src/screens/SettingsScreen.jsx` — Added "Full Stats" button linking to profile
 - `src/screens/LeaderboardScreen.jsx` — Level emoji + level number shown per player
 - `src/screens/HomeScreen.jsx` — Reconnect detection, ReconnectModal, ConnectionStatus, daily bonus + challenges + coin balance + streak indicator
 - `src/screens/GameOverScreen.jsx` — Records match to history + passes mode to recordLoss
 - `src/screens/DrawGameOverScreen.jsx` — Records match + passes mode to recordLoss
 - `src/screens/SurvivalGameOverScreen.jsx` — Records match + passes mode to recordLoss
 - `src/context/AuthContext.jsx` — Migration for monkeyPlayed, drawPlayed, survivalPlayed
 - `src/App.jsx` — ConnectionStatus wrapper, lazy ProfileStatsScreen route + `/profile` route

 ## Reconnection System
- **findActiveRoom(uid)** — Queries Firestore for rooms where user is `players` map
- **ReconnectModal** — Shows on HomeScreen if active room found
  - "ارجع للعبة!" → Navigates to correct game screen based on mode + status
  - "اترك الغرفة" → Leaves room via `leaveRoom()` then dismisses modal
- **ConnectionStatus** — Fixed banner at top when browser goes offline

 ## Match History Schema
Stored in `users/{uid}/matches` subcollection:
 ```json
 {
   "mode": "monkey" | "draw" | "survival",
   "won": boolean,
   "players": number,
   "rounds": number (survival only),
   "playedAt": Timestamp
 }
 ```

 ## ProfileStatsScreen Sections
 1. **Profile Header** — Avatar, username, level + XP progress bar
 2. **Overview Stats** — Games, wins, win rate %, coins
 3. **Streak & Extras** — Login streak, draw wins, total XP
 4. **Per-Mode Stats** — Monkey, Draw, Survival with games/wins/win rate
 5. **Match History** — Last 15 matches with mode, result, date, player count

 ## Per-Mode Stats Tracked
 | Field | Description |
 |-------|------------|
 | `monkeyPlayed` | Total monkey mode games |
 | `drawPlayed` | Total draw mode games |
 | `survivalPlayed` | Total survival mode games |
 | `wins` | Total wins (all modes) |
 | `wins_draw` | Draw mode wins |

 ## Build Validation
 - ✅ `npx vite build` passes cleanly
 - 30 chunks, initial JS: ~194KB (gzip 61KB)
 - No new npm dependencies added
 - New files: reconnect.js, stats.js, ProfileStatsScreen.jsx, ConnectionStatus.jsx, ReconnectModal.jsx
