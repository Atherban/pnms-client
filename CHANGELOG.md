# PNMS Frontend v2 Changelog

## Summary
PNMS frontend was refactored to align with backend v2 role model and APIs. Legacy UI assumptions for `ADMIN`/`VIEWER` were replaced with `NURSERY_ADMIN`/`CUSTOMER` while retaining migration-safe behavior for existing sessions.

## Added
- Phone-first auth with dedicated screens:
  - `/(auth)/request-otp`
  - `/(auth)/verify-otp`
  - `/(auth)/forgot-password`
  - `/(auth)/reset-password`
- Role model utilities (`src/utils/role.ts`) for safe normalization.
- Customer module updates:
  - Due tracking and partial-payment proof submission.
  - Lifecycle visibility (sown/germinated/discarded).
  - Notification center.
- Payments integration (`/api/payments/*`) with verification flow.
- Sale return UI and routes:
  - `/(admin)/sales/returns/[id]`
  - `/(staff)/sales/returns/[id]`
- Super-admin nursery management backed by `/api/nurseries/*`.
- Banner management pages:
  - `/(admin)/banners/index`
  - `/(admin)/banners/create`
  - `/(admin)/banners/edit`
- Staff accounting screen:
  - `/(admin)/staff/accounting`
- Reports export integration with `/api/reports/export` and download-link handling.

## Updated
- Auth payload and mapping now supports:
  - `phoneNumber + password`
  - fallback `email + password`
- Route guards now use new role model in layouts and auth redirects.
- Sales payload supports partial-payment metadata:
  - `amountPaid`, `discountAmount`, `transactionRef`
- Sale detail shows:
  - gross/net/paid/due
  - payment status and verification state
  - return timeline entries
- Plant type payload and forms support:
  - `expectedSeedQtyPerBatch`
  - `expectedSeedUnit`

## Breaking Changes
- Role constants changed to:
  - `SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`, `CUSTOMER`
- Legacy role checks should not be used in new code paths.
- `AuthService` OTP methods renamed to backend-aligned:
  - `requestOtp`
  - `verifyOtp`

## Backward Compatibility
- Legacy roles are normalized on client bootstrap (`ADMIN -> NURSERY_ADMIN`, `VIEWER -> CUSTOMER`) to prevent forced logouts during migration.
- `/(viewer)` routes redirect to customer module for old bookmarks.
