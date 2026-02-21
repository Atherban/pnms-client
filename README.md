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

## Demo Data Seeding (Postman)
Use the ready-to-import files under `postman/`:
- `postman/PNMS-Demo-Seed.postman_collection.json`
- `postman/PNMS-Local.postman_environment.json`

Quick steps:
1. Import both files into Postman.
2. Set valid `baseUrl`, `email`, `password` in the environment.
3. Run collection folders top to bottom.

This seeds 5 records each for plants, seeds, customers, expenses, inventory, and sales.

Detailed instructions: `postman/README.md`
