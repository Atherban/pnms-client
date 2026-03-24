# Staff Module Stitch Prompts

Use these prompts in Google Stitch. Focus only on the information, labels, states, and actions to display on each screen. Do not enforce colors, styling, component choices, or layout patterns.

## 1. Staff Dashboard

```md
Create a staff dashboard screen for a nursery management app.

Display the logged-in staff member name and role.
Display summary values for:
- total inventory items
- total seeds
- today's sowings
- today's sales
- low stock items
- pending tasks

Display quick actions that let staff go to:
- sales
- record sowing
- inventory
- seed inventory
- plant types
- notifications
- customer seed batches
- customers
- expenses
- labours

Display loading, empty, refresh, and error states.
Provide logout action.
```

## 2. Notifications

```md
Create a notifications screen for staff.

Display:
- total notifications
- unread notifications count

For each notification display:
- title
- message or description
- read or unread status
- created date and time
- any related action context if available

Allow actions to:
- refresh notifications
- mark a notification as read
- mark all as read
- clear notifications if supported
- open related record when a notification is actionable

Display empty, loading, and error states.
```

## 3. Sales List

```md
Create a staff sales listing screen.

Display summary information for sales such as:
- total sales count
- paid sales
- unpaid or partially paid sales
- total sale amount if available to staff

For each sale display:
- bill or invoice number
- customer name
- customer phone number if available
- sale date and time
- total amount
- paid amount
- due amount
- payment status
- payment mode
- sale type or order type if available
- staff performer if available

Allow actions to:
- search sales
- filter sales
- sort sales
- refresh data
- open sale details
- create a new sale
- open bill
- open return flow when applicable

Display loading, empty, and error states.
```

## 4. Create Sale

```md
Create a new sale screen for staff.

Display:
- current customer selection
- option to choose an existing customer
- option to create a new customer during sale
- customer name
- mobile number
- address

Display inventory items available for sale with:
- plant name
- category
- available quantity
- unit price
- thumbnail image if available

Display search and filtering for inventory items.

Display cart details including:
- selected items
- quantity per item
- unit price
- item total
- sale subtotal
- discount if applicable
- total amount
- paid amount
- due amount

Display payment details:
- payment mode
- payment amount
- sale note if applicable

Allow actions to:
- add item to cart
- update quantity
- remove item
- clear cart
- save sale
- generate bill after save
- open sale detail after save

Display validation, loading, success, and error states.
```

## 5. Sale Detail

```md
Create a sale detail screen for staff.

Display:
- bill or invoice number
- sale date and time
- customer name
- customer mobile number
- customer address if available
- sale status
- payment status
- payment mode
- paid amount
- due amount
- total amount
- discount if any
- notes if any
- performer or recorded by

Display sold items with:
- plant name
- quantity
- unit price
- line total
- thumbnail image if available

Display related actions when applicable:
- view bill
- start return request
- record payment if allowed
- refresh

Display loading and error states.
```

## 6. Sale Bill

```md
Create a customer bill or invoice screen for a staff user.

Display:
- invoice title
- bill number
- sale date
- nursery name
- nursery contact details
- nursery address
- customer name
- customer phone number
- customer address if available

Display invoice items with:
- item name
- quantity
- unit price
- line total

Display totals:
- subtotal
- discount if any
- grand total
- paid amount
- due amount
- payment mode
- payment status

Allow actions to:
- share bill
- print bill
- download or export bill if supported

Display loading and error states.
```

## 7. Sale Return

```md
Create a sale return screen for staff.

Display sale reference information:
- bill number
- customer name
- sale date
- total amount

Display sale items that can be returned with:
- item name
- sold quantity
- already returned quantity if any
- eligible quantity for return
- unit price

Display return form information:
- selected item
- return quantity
- return reason
- return amount if applicable
- request status

Display return history with:
- previous return requests
- item name
- quantity
- reason
- created date
- status

Allow actions to:
- submit return request
- refresh return history

Display validation, loading, empty, and error states.
```

## 8. Inventory List

```md
Create an inventory listing screen for staff.

Display summary values for inventory such as:
- total inventory count
- in-stock count
- low stock count
- out-of-stock count

For each inventory record display:
- plant name
- plant category
- source type
- quantity in stock
- quantity unit
- stock status
- growth stage if available
- selling price if staff is allowed to see it
- thumbnail image if available

Allow actions to:
- search inventory
- refresh inventory
- open inventory details
- add inventory

Display loading, empty, and error states.
```

## 9. Add Inventory

```md
Create an add inventory screen for staff.

Display:
- plant type selection
- plant type name
- plant category
- default quantity unit
- default cost or selling reference if available
- plant thumbnail image if available

Display form fields for:
- selected plant type
- quantity
- quantity unit

Display validation guidance for valid quantity and unit.

Allow actions to:
- search plant types
- choose a plant type
- save purchased inventory entry
- go back

Display loading, success, and error states.
```

## 10. Inventory Detail

```md
Create an inventory detail screen for staff.

Display:
- plant name
- category
- stock summary
- available quantity
- initial quantity if available
- quantity unit
- growth stage
- status
- source type
- source model
- source reference
- received date
- updated date
- unit cost or price details if staff can view them
- thumbnail image if available

Display related plant information if available.
Display navigation to related records if applicable.
Display loading and error states.
```

## 11. Seed Inventory

```md
Create a seed inventory screen for staff.

Display summary values for:
- total seed records
- valid stock
- low stock
- expired stock

For each seed record display:
- seed name
- plant type name
- plant category
- supplier name
- total purchased quantity
- used quantity
- remaining quantity
- discarded quantity if available
- quantity unit
- expiry date
- stock or validity status
- thumbnail image if available

Allow actions to:
- search seeds
- refresh seed data
- open seed details
- add seed

Display loading, empty, and error states.
```

## 12. Create Seed

```md
Create a seed creation screen for staff.

Display plant type selection information:
- plant type name
- category
- thumbnail image if available

Display form fields for:
- seed name
- supplier name
- total purchased quantity
- quantity unit
- expiry date
- notes if supported

Display validation and helper information for required fields.

Allow actions to:
- search plant types
- select plant type
- open date picker for expiry date
- save the seed record

Display loading, success, and error states.
```

## 13. Seed Detail

```md
Create a seed detail screen for staff.

Display:
- seed name
- plant type name
- category
- supplier name
- total purchased quantity
- used quantity
- remaining quantity
- discarded quantity
- quantity unit
- expiry date
- stock status
- created date
- updated date
- thumbnail image if available

Display related actions if available:
- edit seed
- upload image
- refresh
- navigate to related usage or sowing records

Display loading and error states.
```

## 14. Edit Seed

```md
Create a seed edit screen for staff.

Display existing seed information:
- seed name
- supplier name
- total purchased quantity
- expiry date

Display editable fields for:
- seed name
- supplier name
- total purchased quantity
- expiry date

Display helper text and validation for required values.

Allow actions to:
- update the seed
- reset changed values if supported
- open date picker for expiry date

Display loading, success, and error states.
```

## 15. Plant Types

```md
Create a plant types screen for staff.

Display summary values for:
- total plant types
- total categories
- average lifecycle days
- average price if visible to staff

For each plant type display:
- plant name
- category
- variety if available
- lifecycle days
- expected seed quantity per batch if available
- minimum stock level if available
- selling price if visible to staff
- thumbnail image if available

Allow actions to:
- search plant types
- filter by category, lifecycle, or price if available
- sort results
- refresh
- open plant details

Display loading, empty, and error states.
```

## 16. Plant Detail

```md
Create a plant detail screen for staff.

Display:
- plant name
- category
- variety
- lifecycle days
- selling price if staff can view it
- default cost price if staff can view it
- expected seed quantity per batch
- expected seed unit
- minimum stock level
- description if available
- thumbnail image or gallery if available

Display growth stage information when available:
- stage names
- day ranges
- stage count

Display loading and error states.
```

## 17. Sowing List

```md
Create a sowing records screen for staff.

Display summary values for:
- total sowing records
- total seeds sown
- total discarded
- unique plant types

For each sowing record display:
- seed name
- plant name
- variety if available
- category
- quantity sown
- quantity germinated
- quantity discarded
- quantity pending germination
- sowing date
- performed by
- performer role
- supplier or source information if available
- thumbnail image if available

Allow actions to:
- search sowing records
- filter by date range
- filter by category
- refresh
- open create sowing flow

Display loading, empty, and error states.
```

## 18. Create Sowing

```md
Create a record sowing screen for staff.

Display available seed or customer seed batch options with:
- seed name
- plant name
- category
- supplier name or customer seed batch source
- available stock
- quantity unit
- expiry date if applicable
- stock status

Display form fields for:
- selected seed or selected customer seed batch
- selected customer when required
- quantity sown
- sowing date
- notes if supported

Display helper information such as:
- available stock
- remaining stock after entry if available
- expected seed unit

Allow actions to:
- search seed records
- select a seed
- select a customer or batch if applicable
- save sowing record

Display validation, loading, success, empty, and error states.
```

## 19. Germination List

```md
Create a germination records screen for staff.

Display summary values for:
- total germination records
- total germinated quantity
- total discarded quantity
- overall success rate

For each germination record display:
- plant name
- seed name
- supplier or source
- category
- quantity sown
- germinated quantity
- discarded quantity
- pending quantity
- germination date
- sowing date
- performed by
- performer role
- inventory generation status if available
- thumbnail image if available

Allow actions to:
- search records
- filter by date range
- filter by inventory status
- filter by performance
- refresh
- open create germination flow

Display loading, empty, and error states.
```

## 20. Create Germination

```md
Create a record germination screen for staff.

Display available sowing records with:
- seed name
- plant name
- category
- supplier or source
- quantity sown
- already germinated quantity
- pending quantity
- sowing date
- last updated date if available

Display form fields for:
- selected sowing
- germinated quantity
- discarded quantity
- germination date
- notes if supported

Display derived information such as:
- total processed quantity
- remaining pending quantity
- success percentage for the selected record if available

Allow actions to:
- search sowing records
- select a sowing
- save germination record
- navigate to sowing creation if no sowing is available

Display validation, loading, empty, success, and error states.
```

## 21. Customers

```md
Create a customers management screen for staff.

Display:
- total customer count
- filtered customer count

For each customer display:
- customer name
- mobile number
- address
- total orders or purchase summary if available
- outstanding due if available
- created date if available

Allow actions to:
- search customers
- add customer
- edit customer
- delete customer if staff is allowed
- refresh customer list

Display loading, empty, and error states.
```

## 22. Customer Seed Batches

```md
Create a customer seed batches management screen for staff.

Display:
- total seed batch count
- active batches count if available
- completed batches count if available

For each customer seed batch display:
- customer name
- plant type name
- batch name or identifier
- seed quantity supplied
- seeds sown
- seeds remaining if available
- batch status
- created date
- updated date

Allow actions to:
- search seed batches
- filter by status
- open create customer seed batch flow
- view batch details if available
- refresh data

Display loading, empty, and error states.
```

## 23. Create Customer Seed Batch

```md
Create a screen for staff to create a customer seed batch.

Display form fields for:
- customer selection
- plant type selection
- batch name or identifier
- supplied seed quantity
- quantity unit if applicable
- start date if applicable
- notes

Display selected customer details and selected plant type details when chosen.

Allow actions to:
- search and select customer
- search and select plant type
- save customer seed batch

Display validation, loading, success, and error states.
```

## 24. Expenses

```md
Create an expenses screen for staff.

Display summary values for:
- total expenses amount
- expense count
- contributor count if available

For each expense record display:
- expense type
- amount
- description
- purpose
- product details if available
- expense date
- purchaser or staff name if available

Allow actions to:
- search expenses
- add expense
- edit expense
- delete expense only if allowed
- refresh expense list

Display validation, loading, empty, and error states.
```

## 25. Labours

```md
Create a labours screen for staff.

Display summary values for:
- total labour records
- total hours worked
- total labour cost
- average wage per hour
- unique workers count

For each labour record display:
- labour name
- work type
- hours worked
- wage per hour
- total wage for the record
- work date

Allow actions to:
- search labour records
- add labour record
- edit labour record
- delete labour record only if allowed
- refresh labour data

Display validation, loading, empty, and error states.
```

## 26. New Orders

```md
Create a new orders queue screen for staff.

Display order summary:
- total placed orders

For each order display:
- order number
- customer name
- customer phone number
- ordered items summary
- total amount
- order date and time
- payment status
- current order status
- delivery address if available

Allow actions to:
- search orders
- refresh data
- move order from placed to confirmed
- open order details if available

Display loading, empty, and error states.
```

## 27. Orders To Pack

```md
Create an orders to pack screen for staff.

Display order summary:
- total confirmed orders waiting for packing

For each order display:
- order number
- customer name
- customer phone number
- item summary
- total amount
- confirmed date if available
- payment status
- current order status
- packing readiness notes if available

Allow actions to:
- search orders
- refresh data
- move order from confirmed to packed
- open order details if available

Display loading, empty, and error states.
```

## 28. Orders To Deliver

```md
Create an orders to deliver screen for staff.

Display order summary:
- total packed orders waiting for delivery

For each order display:
- order number
- customer name
- customer phone number
- item summary
- total amount
- packed date if available
- delivery address
- payment status
- current order status

Allow actions to:
- search orders
- refresh data
- move order from packed to delivered
- open order details if available

Display loading, empty, and error states.
```
