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
- `postman/PNMS-Frontend-QA.postman_collection.json`
- `postman/PNMS-Frontend-QA.postman_environment.json`

Quick steps:
1. In backend (`pnms/`), run:
```bash
npm run qa:reset-seed
npm run postman:build
npm run postman:env:template
```
2. Run `npm run postman:sync` in this client project.
3. Import both files into Postman.
4. Set valid `baseUrl` in the environment.
5. Run collection folders top to bottom.

This creates end-to-end dependency data and exercises all backend endpoints in flow order.

Detailed instructions: `postman/README.md`
