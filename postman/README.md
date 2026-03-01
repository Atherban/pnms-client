# PNMS Frontend QA Postman Pack

## Files
- `PNMS-Frontend-QA.postman_collection.json`
- `PNMS-Frontend-QA.postman_environment.json`

## Generate + Sync
1. In backend (`pnms/`):
```bash
npm run qa:reset-seed
npm run postman:build
npm run postman:env:template
npm run postman:verify
```
2. In frontend (`pnms-client/`):
```bash
npm run postman:sync
```

## Import and Run
1. Import both files from this folder.
2. Select environment `PNMS Frontend QA Local`.
3. Set `baseUrl` if needed.
4. Run folders top to bottom.
