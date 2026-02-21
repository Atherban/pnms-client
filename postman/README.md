# PNMS Postman Demo Seeder

## Files
- `postman/PNMS-Demo-Seed.postman_collection.json`
- `postman/PNMS-Local.postman_environment.json`

## How to run
1. Import both files into Postman.
2. Select the `PNMS Local` environment.
3. Update `baseUrl`, `email`, and `password` to valid backend values.
4. Run the collection folders in order:
   - `00 - Auth`
   - `01 - Plant Types (Plants)`
   - `02 - Seeds`
   - `03 - Customers`
   - `04 - Expenses`
   - `05 - Inventory`
   - `06 - Sales`

## Notes
- The collection creates 5 demo records each for plants, seeds, customers, expenses, inventory, and sales.
- Create requests store generated IDs in collection variables, and downstream requests automatically reuse those IDs.
- Re-running the collection will create additional records; clear old data if you need a fresh demo state.
