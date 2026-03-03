# PNMS Client (Expo)

Mobile client for the Plant Nursery Management System (PNMS), built with Expo + React Native.

## Tech Stack
- Expo Router
- React Query
- Zustand
- Axios

## Prerequisites
- Node.js 20+
- npm 10+
- Expo CLI (`npx expo` is enough)
- Running PNMS backend API

## Environment
Create `.env` in project root:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
```

`EXPO_PUBLIC_API_BASE_URL` is required. The app will fail fast at startup if missing.

## Run
```bash
npm install
npm run start
```

Other scripts:
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run lint`
- `npm test`
