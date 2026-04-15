# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FreeDinnerForOneApp** (internal brand: "Thecomp") is a React Native + Expo fitness social app. Users record strength and cardio workouts, share posts, compete on a weekly leaderboard, and track stats over time. It uses a Duolingo-inspired dark UI with vibrant green accents.

## Development Commands

```bash
npm start          # Start Expo dev server
npm run android    # Build and run on Android
npm run ios        # Build and run on iOS
npm run web        # Run on web
```

No lint or test scripts are configured.

## Architecture

### Routing
File-based routing via `expo-router`. The root layout (`app/_layout.tsx`) manages auth state and redirects — unauthenticated users go to `login`, authenticated users to `(tabs)`. Modals are presented using expo-router presentation modes (`modal`, `transparentModal`, `fullScreenModal`).

### State Management (three layers)
1. **WorkoutContext** (`context/WorkoutContext.tsx`) — global React Context wrapping the entire app. Holds the active workout session (exercises, sets, rest timer), cardio session state, and the weekly game/score system. Uses refs (`checkTimerLogicRef`) to keep interval callbacks stable while still reading fresh state.
2. **AsyncStorage** — offline-first local persistence. Active sessions survive app restarts; timer timestamps allow recovery after the app is backgrounded.
3. **Firestore** — remote sync. `SyncService.ts` hydrates local storage from Firestore on login and wipes it on logout. Writes go to local storage first, then to Firestore.

### Data Layer
`services/WorkoutRepository.ts` (~43KB) is the central access layer for all data operations: workout sessions, templates, exercises, posts, reactions, comments, and body weight logs. It handles both AsyncStorage and Firestore, plus optional AES encryption.

### Encryption
Sensitive user data (workouts, weight logs) can be encrypted with AES via CryptoJS using `EXPO_PUBLIC_ENCRYPTION_KEY`. Encrypted Firestore documents have `isEncrypted: true` and store a `data` field with the ciphertext. Plaintext fallback exists for migration.

### Game/Leaderboard System
Weekly workouts are capped at 4 per week. Weeks start on Monday and are identified by the ISO date of that Monday. All date logic uses the **Melbourne timezone**, not UTC.

### Notifications & Rest Timer
`services/NotificationService.ts` manages push token registration and rest timers between sets. An `AppState` listener in WorkoutContext re-checks the timer on app resume to handle background gaps.

## Firebase / Environment

Firebase config comes from `.env` via `EXPO_PUBLIC_` variables (see `config/firebase.ts`). Collections:
- `users/{userId}` — profile, privacy settings, push tokens
- `users/{userId}/sessions` — workout sessions
- `users/{userId}/routines` — workout templates
- `users/{userId}/weight_logs` — body weight history
- `posts` — shared workout posts (reactions, comments as subcollections)

## Key Types

All shared TypeScript interfaces live in `constants/types.ts`: `UserProfile`, `WorkoutSession`, `CardioSession`, `WorkoutTemplate`, `Exercise`, `WorkoutPost`, etc.

## UI Conventions

- Color palette: `constants/Colors.ts` — deep navy `#131f24` background, vibrant green `#58cc02` primary
- Font weight 900 for headers; 3D button shadow effect (see `settingsButton` pattern)
- `DuoTouch` (`components/ui/DuoTouch.tsx`) is the standard tappable element — wraps haptic feedback
- Icons from `@expo/vector-icons` (Ionicons, MaterialCommunityIcons)
- Empty states use dashed-border cards

## Build & Deployment

EAS builds configured in `eas.json` with `development`, `preview`, and `production` channels. Targets iOS 15.1+, Android, and Web. React Native new architecture is enabled.
