# Phase 3 — UI/UX System Unification ✅ COMPLETED

## Summary
Unified all game screens under the neobrutalist design system. Fixed the broken shared ExitConfirmModal, added CSS design tokens for game modes and typography, and normalized the Draw game's visual language to match the rest of the app.

## Changes

### 1. ExitConfirmModal.jsx — Critical Syntax Fix
- **File:** `src/components/shared/ExitConfirmModal.jsx`
- **Bug:** Line 1 had `'تخرج من الغرفة؟'` as a bare Arabic string destructured parameter (invalid JS). This caused a syntax error preventing the component from ever loading.
- **Fix:** Changed to `title = 'تخرج من الغرفة؟'` (proper default prop value).

### 2. CSS Design Tokens Added
- **File:** `src/index.css`
- Added **game-mode tokens** for dark immersive screens (draw/survival games):
  - `--color-game-bg` — dark background for game canvas
  - `--game-surface` / `--game-surface-strong` — translucent overlays
  - `--game-text` / `--game-text-muted` — text colors on dark
  - `--game-accent` / `--game-success` / `--game-danger` — semantic game colors
  - Full dark mode overrides included
- Added **typography scale** tokens:
  - `--text-xs` through `--text-3xl` (11px → 48px)
- Added **missing spacing token**: `--space-2xl: 48px` (was missing between xl:32 and 3xl:64)

### 3. DrawGameScreen — Full Visual Normalization
- **File:** `src/screens/DrawGameScreen.jsx`
- **Before:** Used blue gradient backgrounds (`#1a2a6c`, `#1e3c72`, `#0f2027`), rounded corners (borderRadius 14-18), translucent white overlays, no brutal borders — completely different visual language from the rest of the app.
- **After:** Unified with neobrutalist design system:
  - Backgrounds use `var(--color-game-bg)` (dark purple, consistent with brand)
  - Canvas border uses `var(--brutal-border)` + `var(--brutal-shadow)`
  - Buttons use `.btn` classes (`.btn-yellow`, `.btn-white`)
  - All rounded corners removed — sharp brutal edges
  - Timer uses brutal-border card style
  - Score strip uses design tokens
  - Chat/guess input uses brutal borders and design tokens
  - Tool panel uses `--game-surface` tokens with brutal borders
  - **Removed local `ExitConfirmModal`** (29 lines) — now uses shared component
  - **Added import** of shared `ExitConfirmModal` from `components/shared/`
- All 3 sub-screens normalized: choosing phase, reveal phase, and drawing phase

### 4. SurvivalGameOverScreen — Hardcoded Colors Fixed
- **File:** `src/screens/SurvivalGameOverScreen.jsx`
- Replaced `#1C1040` with `var(--bg-dark-purple)` for loser background
- Used CSS variable-based `titleColor`/`titleShadow`/`cardShadow` computed values
- All hardcoded colors now use design tokens
- Full rewrite (file was corrupted during edits, restored cleanly)

### 5. GameOverScreen — Border Radius Fix
- **File:** `src/screens/GameOverScreen.jsx`
- Removed `borderRadius: 28` from main card (contradicts `--brutal-radius: 0px`)

### 6. AuthScreen — Border Radius Fix
- **File:** `src/screens/AuthScreen.jsx`
- Removed `borderRadius: 24` from main card
- Changed tab container from `borderRadius: 12` to sharp `border: var(--brutal-border)`

### 7. Dead Code Cleanup
- **File:** `src/hooks/useRoom.js`
  - Removed unused imports: `doc`, `updateDoc` from firebase/firestore; `resolveChallenge` from rooms; `warmAudio` from audio
- **File:** `src/firebase/drawRooms.js`
  - Removed dead variable `guessers` at line 219 (computed but never read)

## Files Modified
- `src/index.css` — Game tokens, typography scale, missing spacing token
- `src/components/shared/ExitConfirmModal.jsx` — Syntax fix
- `src/screens/DrawGameScreen.jsx` — Full visual normalization + shared modal
- `src/screens/SurvivalGameOverScreen.jsx` — Token-based colors
- `src/screens/GameOverScreen.jsx` — Border radius fix
- `src/screens/AuthScreen.jsx` — Border radius fix
- `src/hooks/useRoom.js` — Unused import cleanup
- `src/firebase/drawRooms.js` — Dead variable removal

## Build Validation
- Build: **PASS** (865ms, 781.74 KB JS / 232.74 KB gzipped)
- No new warnings introduced
- Bundle size unchanged (marginal reduction from dead code removal)

## Known Issues Remaining (Deferred)
- `--space-*` and `--text-*` tokens defined but not yet consumed in inline styles — gradual migration
- LeaderboardScreen/BrowseRoomsScreen use `borderRadius: 16` on some cards — acceptable for non-game screens
- OnlineGameScreen has inline exit confirm (host-specific behavior) — kept as-is
- LobbyScreen has inline exit confirm — kept as-is (different UX flow from shared modal)

## Next Phase
**Phase 4: Performance Optimization** — Code splitting (lazy-load game screens), bundle size reduction, image optimization
