# API Integration Mapping

## Auth
- `POST /api/auth/login`
  - Request: `{ phoneNumber?, email?, password }`
  - Response mapped from `message + data.token + data.user` to auth store.
- `POST /api/auth/request-otp`
  - Request: `{ phoneNumber }`
  - Response: `{ message, data.otpSessionId? }`
- `POST /api/auth/verify-otp`
  - Request: `{ phoneNumber, otp, otpSessionId? }`
  - Response: same shape as login.
- `POST /api/auth/forgot-password`
  - Request: `{ phoneNumber? | email? }`
- `POST /api/auth/reset-password`
  - Request: `{ token? | phoneNumber+otp, newPassword }`

## Users
- `GET /api/users`
  - Supports pagination (`page`, `limit`) in `UserService.getAll`.
- `POST /api/users`
  - Create user with role in new model.
- `PATCH /api/users/:id`
  - Role/status updates.

## Nurseries
- `GET /api/nurseries`
  - Used in super-admin nursery management screen.
- `POST /api/nurseries`
  - Create nursery.
- `PATCH /api/nurseries/:id`
  - Update nursery.

## Plant Types
- `GET /api/plant-types`
- `POST /api/plant-types`
- `PATCH /api/plant-types/:id`
- Payload additions integrated:
  - `expectedSeedQtyPerBatch`
  - `expectedSeedUnit`

## Sales
- `GET /api/sales`
- `GET /api/sales/:id`
- `POST /api/sales`
  - Request mapping includes:
    - `items[]`
    - `paymentMode`
    - `amountPaid`
    - `discountAmount`
    - `transactionRef`
- `POST /api/sales/:id/returns`
  - Request: `{ quantity, reason?, refundAmount? }`

## Payments
- `GET /api/payments`
  - Used in payment verification queue.
- `POST /api/payments`
  - Request: `{ saleId, amount, transactionRef?, proofUrl? }`
- `PATCH /api/payments/:id/verify`
  - Request: `{ action: ACCEPT|REJECT, rejectionReason? }`

## Banners
- `GET /api/banners`
- `POST /api/banners`
- `PATCH /api/banners/:id`
- `DELETE /api/banners/:id`
- Banner list in customer dashboard filters by active status.

## Reports
- `POST /api/reports/export`
  - Request: `{ format: PDF|EXCEL, scope, nurseryId?, fromDate?, toDate? }`
  - Response mapped to `reportId + status`.
- `GET /api/reports/:id/download`
  - Returns downloadable URL.

## Staff Accounting
- `GET /api/staff-accounts`
  - Mapped fields:
    - `salesAmount`
    - `collectionsAmount`
    - `expensesAmount`
    - `netBalance`

## Notes
- All endpoints are called through shared axios client (`src/services/api.ts`) with JWT bearer injection.
- Normalization is applied where backend may wrap payloads inside `data`.

## Core Endpoint Coverage Snapshot
- `/api/users/*`: integrated.
- `/api/nurseries/*`: integrated for super-admin management.
- `/api/plant-types/*`: integrated with new seed expectation fields.
- `/api/seeds/*`: existing module integration retained.
- `/api/sowing/*`: existing module integration retained.
- `/api/germination/*`: existing module integration retained.
- `/api/inventory/*`: existing module integration retained.
- `/api/customers/*`: existing module integration retained.
- `/api/sales/*`: integrated; returns endpoint added.
- `/api/payments/*`: integrated for proof submit + verification queue.
- `/api/expenses/*`: existing module integration retained.
- `/api/labours/*`: existing module integration retained.
- `/api/banners/*`: integrated for customer rendering and admin CRUD.
- `/api/reports/export`, `/api/reports/:id/download`: integrated.
- `/api/staff-accounts`: integrated.
- `/api/profit`: existing module integration retained.
