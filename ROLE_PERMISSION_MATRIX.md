# Role Permission Matrix (Frontend Guards)

| Area | SUPER_ADMIN | NURSERY_ADMIN | STAFF | CUSTOMER |
|---|---|---|---|---|
| Global dashboard | Yes | No | No | No |
| Nursery management | Yes | No | No | No |
| User management (nursery) | Optional oversight | Yes | No | No |
| Plant type management | Optional oversight | Yes | Read-only/operational linked | No |
| Operational modules (seeds/sowing/germination/inventory/sales) | Optional read | Yes | Yes | No |
| Sale creation | Optional | Yes | Yes | No |
| Partial payment visibility | Yes | Yes | Yes | Own only |
| Payment proof upload | No | No | Yes (if collecting proof) | Yes |
| Payment verification | Yes | Yes | No | No |
| Sale returns | Yes | Yes | Yes | No |
| Banners CRUD | Optional/global | Yes | No | Read-only |
| Reports export | Yes (global) | Yes (nursery) | Limited/none | No |
| Staff accounting | Yes | Yes | No | No |
| Customer lifecycle/due pages | No | Optional support | Optional support | Yes (own only) |

## Route Guard Mapping
- `/(super-admin)/*` => `SUPER_ADMIN`
- `/(admin)/*` => `NURSERY_ADMIN`
- `/(staff)/*` => `STAFF`
- `/(customer)/*` => `CUSTOMER`
- `/(viewer)/*` => redirected to `/(customer)` for migration compatibility.

## Component-Level Access
- Payment verification actions are hidden unless role is `NURSERY_ADMIN` or `SUPER_ADMIN`.
- Sale return CTA shown for staff/admin operational groups.
- Customer dues and notifications filtered to current customer context.
