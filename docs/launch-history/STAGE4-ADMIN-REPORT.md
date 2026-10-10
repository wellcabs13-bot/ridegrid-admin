# RideGrid Stage 4: Corporate Admin Portal Status Report

> **STALE — superseded.** The final-launch integration audit (see `docs/final-launch/INTEGRATION-MAP.md`) found the Corporate Admin Portal fully implemented and committed (`lib/corporate-admin/*`, 19 page routes under `app/corporate-admin/*`, committed as of `ea6bd67`). This report was accurate when written but a later session evidently completed the work described below as missing. Do not treat this file as current status.

Date: 2026-09-25. Branch: `phase-4-customer-module`. Nothing has been committed.

## Status: Stage 4 has not been implemented

There was no Stage 4 (Corporate Admin Portal) brief and no Stage 4 implementation in this session. This file is therefore not a completion report. It records:

- the admin-facing pieces that were built as part of Stage 3 (the Corporate Employee app);
- the gaps a Stage 4 build would need to close.

Nothing was run to produce this report. All results come from the Stage 3 run, which is described in `CORPORATE-ADMIN-LAUNCH-REPORT.md`.

## Admin-side pieces that already exist (built in Stage 3)

### Approval decision API: `/api/corporate/approval-requests`

- **GET:** lists approval requests with the employee, the requested ride, the policy reasons, the steps, and a display status (Pending, Approved, Booked, Rejected, Cancelled, Expired).
- **POST:** records an approve or reject decision. A rejection needs a reason.
- **Access:**
  - Super Admin and Operations can decide for any company.
  - A Corporate Admin can decide only for their own company, based on their active company membership.
- **How decisions are applied:**
  - Each decision updates the lowest pending step.
  - The request is complete once every step is approved, or as soon as one is rejected.
  - The employee is notified of the final decision.
  - Decisions are made in a Serializable transaction, and a changed record is rejected with a conflict error.
- **Tests:** covered in `tests/unit/corporate-employee-mobile-api.test.ts`. The tests check that employees are denied, that Corporate Admins are limited to their own company, that multi-step approvals advance correctly, and that a rejection needs a reason.

### Approval queue in the admin Corporate page

- **Where:** an "Approval requests" tab in `components/admin/CorporateOperations.tsx`, backed by `components/admin/CorporateApprovalRequests.tsx`.
- **Who can use it:** the page (`app/corporate/page.tsx`) is limited to super admins. Corporate Admin users can't open it.

### Security fixes on existing corporate endpoints

| Endpoint | Before | After |
|---|---|---|
| `approvals` | No authentication | Super admin only |
| `travel-policy` | No authentication | Super admin only |
| `budgets` | Any signed-in user could read or create any company's budget | Super admin only |
| `credit-account` | Anyone | RideGrid staff and active members of that company |

### Shared records

The admin side reads the same records that the employee app writes:

- `CorporateApprovalRequest` and `CorporateApprovalStep`;
- corporate `Booking` rows, with `bookingSource = CORPORATE` and the company attached.

## What a Stage 4 Corporate Admin Portal still needs

These gaps were identified during Stage 3. None of them has been built.

1. **A portal Corporate Admin users can log in to.** The existing corporate pages and most `/api/corporate/*` routes are limited to super admins. A portal scoped to the admin's own company does not exist.
2. **Managing employees, branches, departments and cost centers**, scoped to the admin's own company.
3. **Editing the travel policy and approval rules** from the corporate side. Today only super admins can see this configuration.
4. **Viewing company budgets**, and editing employees' monthly and yearly travel limits.
5. **A company booking list and reports** scoped to one company, plus visibility of corporate credit and invoices.
6. **Approvers who are employees** (`isApprover`) deciding requests. Today only Corporate Admins, Super Admins and Operations can decide.
7. **An approval queue built for Corporate Admins.** The current tab uses a browser prompt for remarks and was built for super admins.

## Before any Stage 4 work ships

- **Apply the migration.** Stage 3's additive migration, `20260925000000_corporate_approval_request_snapshot`, is still unapplied. Until it is applied, the approval queue can't list or decide requests.
- **Review changes already in the working tree.** These were already modified or untracked before this session. They were not reviewed or verified here:
  - `app/api/corporate/dashboard/route.ts`, `app/api/corporate/profile/route.ts` and `app/api/corporate/route.ts`;
  - other files in the untracked `components/admin/` folder.

  They may include earlier Stage 4 work. Review them before starting.

## Verification

No Stage 4 verification was run.

The only admin-side code verified is the Stage 3 approval-requests API and admin tab. The corporate employee API tests, the root type-check and the root production build covered them in the Stage 3 run.
