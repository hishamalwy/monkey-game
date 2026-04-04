# Phase 8 — Profile & Statistics ✅ COMPLETED

## Summary
Built a full profile statistics screen with per-mode breakdowns, match history, and enhanced leaderboard with level badges.

## Files Created
- `src/firebase/stats.js` — Match history recording (subcollection `users/{uid}/matches`)
- `src/screens/ProfileStatsScreen.jsx` — Full profile stats screen with match history

## Files Modified
- `src/firebase/leaderboard.js` — Per-mode play count tracking (monkeyPlayed, drawPlayed, survivalPlayed), mode-aware recordLoss, mode-aware leaderboard sorting
- `src/App.jsx` — Added `/profile` route with lazy loading
- `src/hooks/useNavigation.js` — Added `toProfile()` navigation
- `src/screens/SettingsScreen.jsx` — Added "الإحصائيات الكاملة" button linking to profile
- `src/screens/LeaderboardScreen.jsx` — Level emoji + level number shown per player
- `src/screens/GameOverScreen.jsx` — Records match to history subcollection
- `src/screens/DrawGameOverScreen.jsx` — Records match + passes mode to recordLoss
- `src/screens/SurvivalGameOverScreen.jsx` — Records match + passes mode to recordLoss
- `src/context/AuthContext.jsx` — Migration for monkeyPlayed, drawPlayed, survivalPlayed

## ProfileStatsScreen Sections
1. **Profile Header** — Avatar, username, level + XP progress bar
2. **Overview Stats** — Games, wins, win rate %, coins
3. **Streak & Extras** — Login streak, draw wins, total XP
4. **Per-Mode Stats** — Monkey, Draw, Survival cards with games played / wins / win rate
5. **Match History** — Last 15 matches with mode, win/loss, date, player count

## Per-Mode Stats Tracked
| Field | Description |
|-------|------------|
| `monkeyPlayed` | Total monkey mode games |
| `drawPlayed` | Total draw mode games |
| `survivalPlayed` | Total survival mode games |
| `wins` | Total wins (all modes) |
| `wins_draw` | Draw mode wins |

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

## Leaderboard Enhancement
- Now shows level emoji + level number per player (e.g., 🦁 لفل 5)
- Properly sorts by mode-specific wins (wins_draw for draw mode)

## Build Validation
- ✅ `npx vite build` passes cleanly
- 30 chunks, initial JS: ~214KB (gzip 68KB)
- No new npm dependencies added
