# Role Model Migration Notes

## Old -> New Role Mapping
- `ADMIN` -> `NURSERY_ADMIN`
- `VIEWER` -> `CUSTOMER`
- `STAFF` -> `STAFF`
- `SUPER_ADMIN` -> `SUPER_ADMIN`

## Client Migration Strategy
1. Normalize role on auth bootstrap using `normalizeRole`.
2. Keep old route group `/(viewer)` as redirect-only to preserve bookmarks.
3. Replace all new guard logic with normalized roles only.
4. Preserve existing data display patterns where possible, but use new payment and auth contracts.

## Session/Data Migration
- Existing stored users with legacy role values are converted at runtime.
- JWT remains source of truth; frontend normalization is for guard compatibility only.
- Nursery context fields supported in auth state:
  - `nurseryId`
  - `allowedNurseryIds`

## QA Checklist
- Login via `phoneNumber + password` works.
- OTP request/verify works.
- Forgot/reset password flows work.
- `NURSERY_ADMIN` cannot access super-admin routes.
- `CUSTOMER` cannot access admin/staff routes.
- Sale detail shows paid/due/payment status.
- Payment proof verification updates status in UI.
- Sale return appears in timeline.
