# VRV Servicing Module — Implementation Spec (for Cursor)

> **Project:** agaoa.com — Augusta Golf Homes AOA portal (Towers III · IV · V)
> **Goal:** Add a **VRV Servicing** module (its own top-nav section, separate from Finance & Accounts) that moves the society's VRV/AC AMC (Annual Maintenance Contract) accounts out of Excel into the portal. That means flat contracts, payments received, staff salary, material purchases and a cashbook, plus a dashboard with correct totals.
> **Source:** `AC_AMC_Full_Accounts_Tracker_AutoAdd_Flats.xlsx`. Its data is exported to `vrv_seed_data.json`, which ships next to this file.

---

## 0. Instructions for Cursor (read first)

1. **Detect the existing stack before writing code.** Find the framework, router, ORM/DB layer, auth/session, UI component library and styling approach, and **follow the existing patterns exactly**. Copy how the existing top-level sections and their features (e.g. Finance & Accounts → Dues, Leases) are built, including folder structure, naming, API style, table components, forms, modals, toasts and permission checks.
2. Do **not** add a new UI library or CSS framework. Reuse the existing header, side nav, stat cards ("36 Owner", "26 Vehicles" style), tables ("Recent Leases" style) and buttons ("Open reports →" pill style).
3. Use the existing **apartment code** format `AUG` + tower (2 digits) + flat (4 digits), e.g. Tower 3 flat 405 → `AUG030405`, Tower 4 flat 7 → `AUG040007`. Link VRV contracts to the existing apartment/flat and owner records wherever they exist.
4. Store all money as **integer rupees** (or paise if the codebase already does that). Never use floats.
5. **Never store computed values** such as balance, status or expiry. Compute them in queries or services so they can never go stale. (The Excel file had broken totals because of hand-written formulas. See §4.)
6. Build in the order given in §9 and run the acceptance checks in §10.

---

## 1. Where it lives in the UI

- **VRV Servicing is its OWN top-level header/nav item. It is separate from Finance & Accounts and must NOT be nested under it.**
  Top nav order: Portal · Resident Directory · Access & Personnel · Finance & Accounts · **VRV Servicing** · Documents & Governance.
  It uses the same active-state style as the other nav items (gold pill when active).
- Clicking **VRV Servicing** opens its own section with its own left sidebar (heading "VRV SERVICING"). The section is built the same way as the existing sections (Portal, Finance & Accounts), with its own layout/route group:
  1. **Overview** (dashboard) — `/vrv`
  2. **AMC Contracts** (flat register) — `/vrv/contracts`
  3. **Payments** — `/vrv/payments`
  4. **Staff Salary** — `/vrv/salary`
  5. **Materials** — `/vrv/materials`
  6. **Cashbook** — `/vrv/cashbook`
- VRV money must NOT be mixed into Finance & Accounts totals (Dues etc.). The two are separate account books.
- On the **Portal → Overview** page, add one more stat card: **"VRV AMC — ₹X outstanding"** that links to `/vrv`.
- **Reports & Alerts** box on the Portal overview: push alerts for contracts with `Expiring Soon` (≤ 30 days) and `Expired` status, and for flats with an outstanding balance more than 30 days after the contract start.
- Match the route style of the existing top-level sections if they use a different pattern.

### Permissions
| Role | Access |
|---|---|
| Admin / AOA committee | Full CRUD on everything, export |
| Accounts / Treasurer (if the role exists) | Full CRUD on payments, salary, materials, cashbook; read contracts |
| Resident / Owner | **Read-only, own flat only**: their contract, payments and balance (a card on their flat page) |

Reuse the existing role/permission helper.

---

## 2. Data model

Table names are suggestions. Adapt them to the existing naming convention (snake_case or camelCase, singular or plural).

### 2.1 `vrv_amc_contracts` (Excel sheet: *AMC Register*)
| Field | Type | Notes |
|---|---|---|
| id | pk | |
| apartment_code | string, indexed | `AUG030005`. FK to apartments table if one exists |
| tower | int | 3, 4, 5 |
| flat_no | string | "5", "205", … |
| owner_name | string, nullable | Prefill from owner record if linked |
| mobile | string, nullable | Prefill from owner record if linked |
| service | string | default `"VRV Service & Repair"` |
| annual_amount | int (₹) | default 35000 |
| period_label | string | e.g. `"2026-2027"` |
| start_date | date, nullable | |
| preferred_payment_mode | enum nullable | Cash, UPI, Cheque, Bank Transfer |
| remarks | text nullable | |
| legacy_id | string nullable | Excel ID like `Tower3-5-2026`, for traceability |
| created_at / updated_at / created_by | | |

**Unique:** (`apartment_code`, `period_label`). One contract per flat per AMC year. Renewal = a new row for the next period.

**Computed (do not store):**
- `expiry_date` = `start_date + 12 months − 1 day` (01-Oct-2026 → 30-Sep-2027); null if no start date
- `total_received` = SUM(payments.amount WHERE contract_id = this)
- `balance` = MAX(0, annual_amount − total_received)
- `payment_status` = `Paid` if received ≥ amount · `Partial` if received > 0 · else `Pending`
- `last_payment_date` = MAX(payments.payment_date)
- `expiry_alert` = `Not Started` (no start date) · `Expired` (expiry < today) · `Expiring Soon` (expiry ≤ today + 30) · else `Active`

### 2.2 `vrv_payments` (Excel sheet: *Payment History*)
| Field | Type | Notes |
|---|---|---|
| id | pk | |
| contract_id | fk → vrv_amc_contracts | required |
| payment_date | date | required |
| amount | int (₹) | required, > 0 |
| mode | enum | Cash, UPI, Cheque, Bank Transfer |
| reference_no | string nullable | Transaction / cheque no. |
| cheque_date | date nullable | show the field only when mode = Cheque |
| received_by | string nullable | |
| remarks | text nullable | |

Tower, flat, owner and period come **through the contract**. Do not duplicate them as the Excel did.
Optional: a **receipt PDF / print view** for each payment, if a PDF utility already exists in the project.

### 2.3 `vrv_salary_payments` (Excel sheet: *Salary Register*)
| Field | Type | Notes |
|---|---|---|
| id | pk | |
| employee_name | string | (or FK to a staff table if Access & Personnel already has one) |
| role | string nullable | Technician, Helper… |
| salary_month | date (1st of month) | store as `2026-11-01`, show as "Nov 2026". The Excel had only "Jan…Dec" with no year, which breaks across years |
| salary_due | int (₹) | full salary for that month |
| payment_date | date | |
| amount_paid | int (₹) | |
| mode | enum | Cash, UPI, Cheque, Bank Transfer |
| reference_no | string nullable | |
| paid_by | string nullable | |
| remarks | text nullable | |

Part payments = multiple rows with the same employee + month.
**Computed per (employee, month) group:** `total_paid`, `balance = MAX(0, salary_due − total_paid)`, status Paid / Partial / Pending.
⚠️ Calculate the summary "Total Salary Balance" **per group, once**, not per row. The Excel summary double-counted when a month was paid in parts.

### 2.4 `vrv_materials` (Excel sheet: *Material Register*)
| Field | Type | Notes |
|---|---|---|
| id | pk | |
| purchase_date | date | |
| material_name | string | Gas cylinder, copper pipe, filter… |
| category | string nullable | |
| qty | decimal | |
| unit | string | pcs, kg, m, ltr |
| rate | int (₹) | |
| total_amount | computed = qty × rate | do not store |
| paid_amount | int (₹) | may be less than total (credit) |
| mode | enum | Cash, UPI, Cheque, Bank Transfer, **Credit** |
| vendor | string nullable | |
| bill_no | string nullable | |
| bill_attachment | file nullable | use the existing upload helper (Documents module) |

Computed: `vendor_due = total_amount − paid_amount`.

### 2.5 `vrv_cashbook` (Excel sheet: *Cashbook*)
| Field | Type | Notes |
|---|---|---|
| id | pk | |
| date | date | |
| type | enum | Income, Expense |
| description | string | |
| category | string nullable | |
| amount | int (₹) | positive; direction comes from `type` |
| mode | enum | Cash, UPI, Cheque, Bank Transfer |
| reference | string nullable | |

Plus a single setting: **`vrv_opening_balance`** (int ₹, default 0), editable by Admin. Put it in the existing settings table or a one-row `vrv_settings` table.

> Cashbook is **only for other transactions**. Show this hint on the page: *"Flat payments, salary and material purchases are recorded on their own pages, so don't enter them here again."*

---

## 3. Dashboard (Overview) metrics

| Metric | Formula |
|---|---|
| Flats under AMC | COUNT(contracts for the selected period) |
| Total AMC contract value | SUM(contracts.annual_amount) |
| AMC payments received | SUM(payments.amount) |
| AMC outstanding | SUM(per-contract balance) |
| Paid / Partial / Pending flats | counts by computed status |
| Material purchase total | SUM(qty × rate) |
| Material amount paid | SUM(materials.paid_amount) |
| Vendor dues | material total − material paid |
| Salary paid | SUM(salary.amount_paid) |
| Salary pending | SUM over (employee, month) groups of balance |
| Other money in | SUM(cashbook.amount WHERE type = Income) |
| Other money out | SUM(cashbook.amount WHERE type = Expense) |
| Opening balance | setting |
| **Total money in** | opening balance + AMC payments received + other money in |
| **Total money out** | salary paid + material amount paid + other money out |
| **Current cash / bank balance** | total money in − total money out |

Filters at the top: **AMC Period** (default current, e.g. 2026-2027) and **Tower** (All / 3 / 4 / 5). Money in/out cards respect a date range (default: the selected AMC period's dates, 1 Apr–31 Mar or the contract year; make this configurable).

Also on the dashboard:
- **Tower-wise collection bars**: Tower 3 / 4 / 5 → received vs contract value.
- **Monthly cash flow**: money in vs money out per month (simple bar chart, using whatever chart lib the project already has; if none, plain CSS bars are fine).
- **Recent payments** (last 5) and **Needs attention** (Pending flats, expiring contracts, missing owner/mobile).

---

## 4. Bugs in the Excel file — make sure the app does NOT copy them

1. Total Money In was `Payments + Salary Paid + Opening`, which put salary on the wrong side. Correct: `Opening + Payments + Other In`.
2. Total Money Out was `Material Paid + Other In + Other Out`, which put other-in on the wrong side. Correct: `Salary Paid + Material Paid + Other Out`.
3. Cash balance was `In + Out − itself`, which is circular and adds out to in. Correct: `In − Out`.
4. Salary balance was summed per row, so part payments were counted twice. Correct: sum per (employee, month) group.
5. Salary month had no year. Store a real month date.

---

## 5. Pages — UI behaviour

Follow the design canvas "VRV Servicing — agaoa.com" for layout. It has 3 screens: Overview, AMC Contracts and the Record Payment modal. Paste screenshots of it into Cursor along with this file. Style tokens to reuse from the existing site:
- Header / hero dark green `#1F3A2E`-ish (use the existing CSS variable), gold accent pill `#C9A24A`-ish for the active nav item and the ADMIN badge, cream page background, white cards with soft border, large green numbers on stat cards.

### 5.1 Overview `/vrv`
- Dark green hero strip: "VRV Servicing — AMC 2026-2027", with a subtitle "Towers 3, 4 and 5 · 16 flats under contract" and buttons **+ Record Payment**, **+ Add Flat**.
- Row 1 stat cards: Contract Value · Received · Outstanding · Cash Balance (cash balance card highlighted).
- Row 2 stat cards: Paid flats · Partial · Pending · Expiring ≤30 days.
- Cash flow panel: Money In list (Opening, AMC receipts, Other in) vs Money Out list (Salary, Material, Other out) with totals.
- Tower-wise collection progress bars.
- Recent payments table and a Needs-attention list.

### 5.2 AMC Contracts `/vrv/contracts`
- Toolbar: search (flat / owner / mobile), Tower filter chips, Status filter (All / Paid / Partial / Pending), Expiry filter, **Export CSV/Excel**, **+ Add Flat**.
- Table columns: Apartment · Owner · Mobile · Annual Amount · Received · Balance · Status badge · Start → Expiry · Expiry alert badge · Actions (Record payment, Edit, View).
- Collection progress bar inside the Received cell.
- Status badge colours: Paid = green, Partial = amber, Pending = red/grey; Expired = red, Expiring Soon = amber, Active = green, Not Started = grey.
- **Contract detail drawer/page**: contract info, all payments (timeline), balance, add-payment button, renew-for-next-period button (copies the flat with the new period and the same amount).
- **Add/Edit Flat form:** Tower (select) + Flat No. → auto-builds the apartment code and autofills owner/mobile from the existing owner records if found. Amount defaults to 35000, then start date, period, payment mode and remarks. Block duplicates for (apartment, period).
- **Bulk add:** "Add multiple flats" modal: pick tower, paste flat numbers comma-separated, same amount and start date.

### 5.3 Payments `/vrv/payments`
- Table: Date · Apartment · Owner · Amount · Mode · Ref/Cheque no. · Received by · Remarks · Actions.
- Filters: date range, tower, mode. Footer total.
- **Record Payment modal** (also opened from the dashboard and contracts): searchable Apartment select (shows owner + current balance), amount (warn if it exceeds the balance, but allow it), date (default today), mode, reference, cheque date (only for Cheque), received by, remarks. After saving, show a toast: "₹3,000 received from AUG030005 — balance ₹32,000".

### 5.4 Staff Salary `/vrv/salary`
- Grouped table by **month → employee**: Salary due · Paid · Balance · Status, expandable to show the individual payments.
- **Pay Salary modal:** employee (autocomplete from previous entries/staff), role, month picker (month + year), salary due (prefill from that employee's last entry), amount paid, date, mode, reference, paid by, remarks.
- Summary chips: Total due · Paid · Balance (group-wise, see §2.3).

### 5.5 Materials `/vrv/materials`
- Table: Date · Material · Category · Qty × Unit · Rate · Total · Paid · Due · Mode · Vendor · Bill.
- **Add Purchase modal** with a live `Total = Qty × Rate` preview and bill photo upload.
- Footer: total purchase, total paid, vendor dues.

### 5.6 Cashbook `/vrv/cashbook`
- Opening balance card (editable by admin, inline).
- Table: Date · Type badge (Income green / Expense red) · Description · Category · In · Out · Mode · Ref · **running balance** (optional).
- The "Don't double-enter" hint banner.

### Common
- Every list: pagination, sort by date desc, empty state ("No records yet", same as the existing RFID table), export CSV.
- Currency format: Indian grouping `₹5,60,000` (`Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0})`).
- Date format: `01 Oct 2026` in the UI, ISO in the API/DB, same as the existing tables (they show `2027-08-31`, so use whichever the project already uses).
- Mobile responsive: tables collapse to cards under 768px, and the sidebar becomes a top tab scroller.
- Delete = soft delete with a confirm dialog (use the project's own modal, never `window.confirm`). Keep an audit trail (`created_by`, `updated_by`) if the project has one.

---

## 6. API (adapt to the existing style: REST routes / server actions / tRPC)

```
GET    /api/vrv/summary?period=2026-2027&tower=all&from=&to=
GET    /api/vrv/contracts?period=&tower=&status=&q=
POST   /api/vrv/contracts            (single or {bulk: [...]})
GET    /api/vrv/contracts/:id        (includes payments + computed fields)
PATCH  /api/vrv/contracts/:id
DELETE /api/vrv/contracts/:id
POST   /api/vrv/contracts/:id/renew  ({period_label, start_date, annual_amount})

GET|POST          /api/vrv/payments
PATCH|DELETE      /api/vrv/payments/:id
GET|POST          /api/vrv/salary
PATCH|DELETE      /api/vrv/salary/:id
GET|POST          /api/vrv/materials
PATCH|DELETE      /api/vrv/materials/:id
GET|POST          /api/vrv/cashbook
PATCH|DELETE      /api/vrv/cashbook/:id
GET|PUT           /api/vrv/settings  (opening_balance)
GET               /api/vrv/export?sheet=contracts|payments|salary|materials|cashbook&format=csv|xlsx
GET               /api/vrv/me        (resident: own flat's contract + payments)
```

Validation (zod / Joi / whatever is already used): amounts are integers > 0, dates are valid, mode is in the enum, apartment code matches `/^AUG\d{6}$/`.
Put all computed values in **one service** (`vrvSummaryService` or similar) so the dashboard, lists and the resident view all use the same maths.

---

## 7. Seed / import

- `vrv_seed_data.json` contains **16 contracts** (Towers 3, 4, 5 @ ₹35,000, period 2026-2027) and **1 payment** (AUG030005, ₹3,000, Cheque, 01-Oct-2026).
- Write an idempotent seed script (upsert on `apartment_code + period_label`) and put it next to the project's existing seeds. Set `period_label = "2026-2027"` for every contract.
- For contracts with `owner_name = null` (AUG050010, AUG050110, AUG050409, AUG050510): try to fill the owner/mobile from the existing owner records by apartment code; otherwise leave null and show them under "Needs attention → Missing owner details".
- Optional (nice to have): an **Import from Excel** button on the contracts page that accepts the same .xlsx layout (AMC Register sheet, headers in row 1), with a preview of the parsed rows before saving.

Expected numbers after the seed (use these to test):
| Metric | Value |
|---|---|
| Flats | 16 |
| Contract value | ₹5,60,000 |
| Received | ₹3,000 |
| Outstanding | ₹5,57,000 |
| Paid / Partial / Pending | 0 / 1 / 15 |
| Cash balance | ₹3,000 (opening 0 + 3,000 − 0) |
| AUG030005 expiry | 30 Sep 2027, alert "Active" |
| Other 15 flats | alert "Not Started" |

---

## 8. Resident view

On the resident's flat / "Your flat owner record" page, add a card **"VRV AMC"** showing: period, annual amount, paid, balance, status badge, expiry, and a payments list. It is read-only, and the API must only ever return the logged-in user's own flat(s).

---

## 9. Build order

1. DB schema + migration (5 tables + setting).
2. `vrvSummaryService` with all computed fields and unit tests (cover part payments, overpayment, missing start date, salary part payments).
3. Seed script and data from `vrv_seed_data.json`.
4. API routes + validation + permission checks.
5. New top-nav item "VRV Servicing" + its own section layout and sidebar + Overview page.
6. Contracts list + detail + add/edit/bulk + renew.
7. Payments page + Record Payment modal (reused on dashboard and contract detail).
8. Salary, Materials, Cashbook pages.
9. Portal overview stat card + Reports & Alerts integration + resident card.
10. Export CSV/XLSX, mobile responsiveness, empty states.

---

## 10. Acceptance checklist

- [ ] After the seed, the dashboard shows exactly the numbers in §7.
- [ ] Recording ₹5,000 for AUG030006 → status Partial, balance ₹30,000, received ₹8,000 total, cash balance ₹8,000.
- [ ] Recording ₹32,000 more for AUG030005 → status Paid, balance ₹0.
- [ ] Salary: employee "Ramesh", Nov 2026, due ₹15,000, paid ₹10,000 and then ₹5,000 → one group, Paid, balance ₹0. Salary paid ₹15,000 and cash balance reduced by ₹15,000 (**not increased**).
- [ ] Material: 2 × ₹1,500 with ₹2,000 paid → total ₹3,000, vendor due ₹1,000, cash reduced by ₹2,000.
- [ ] Cashbook Income ₹1,000 → cash +₹1,000; Expense ₹500 → cash −₹500.
- [ ] Contract with start 01-Nov-2025 → expiry 31-Oct-2026 → "Expired" and shows in Reports & Alerts.
- [ ] A duplicate flat for the same period is rejected with a clear message.
- [ ] A resident login sees only their own flat's VRV card. Admin APIs return 403 for residents.
- [ ] All amounts are shown as `₹5,60,000` (Indian format).
- [ ] Pages work at 375px width.
