# Session Handoff - 2026-04-08

## Current State

- Google Apps Script quotation bidding app in `workplace/jobs/quotation_bidding`.
- Main backend is in `Code.js`, UI is in `Index.html`, and Drive batch helper remains in `BatchRequests.js`.
- User-facing wording has been shifted from Vendor to Supplier while internal field/function names still largely use `vendor*` for compatibility.
- Vendor quotation data is now vendor-sheet-first: yearly sheets named `Quotation yyyy` are the primary source.
- The main spreadsheet now uses `WorkOrders.Quotations` as the stored list of QT numbers for each work order and `WorkOrders.quotationCount` as the aggregate count.
- Vendor detail records are resolved from the vendor's own quotation sheets by quotation number lookup instead of loading from the legacy main `Quotations` sheet.
- Vendor page loading should now go through `syncCurrentVendorSheet` directly instead of `getBootstrapData` first.
- Vendor session restore now persists the client-side role so a browser reload can still route vendor users into the direct sync path.
- Work order creation now returns to the UI immediately and sends supplier notification emails through a separate async server call.
- Backend bootstrap/data access now includes execution-scoped caches plus timing logs to surface Spreadsheet bottlenecks.

## Completed Recently

- Moved the vendor quotation form into a dedicated modal and wired work order actions for `Add QT` and quotation editing.
- Restyled the quotation upload area to match the work order upload behavior, including immediate preview cards, visible progress, file limits, and `Remove all`.
- Added a read-only work order detail modal and moved the `View` action into the first work order column.
- Implemented multiple quotations per vendor per work order, including `Manage QT` and per-work-order quotation counts in the vendor UI.
- Changed vendor sheet persistence to yearly `Quotation yyyy` sheets with the requested A-R style schema and `=IMAGE()` for the first product image.
- Changed quotation save/finalize flow so vendor sheet is written first, then the quotation number is added to `WorkOrders.Quotations` and `WorkOrders.quotationCount` is updated in the main spreadsheet.
- Added `getVendorQuotationsForWorkOrder()` so `Manage QT` first reads QT numbers from the main `WorkOrders` row and then resolves those rows from the vendor sheet.
- Optimized vendor loading so vendor refresh no longer does bootstrap first and then sync; `syncCurrentVendorSheet()` now returns vendor bootstrap directly from synced rows.
- Removed the per-row quotation-count update bottleneck inside `syncVendorSheetInternal_()` and replaced it with batched count updates.
- Fixed vendor session restore so a page reload no longer falls back to `getBootstrapData` just because `state.role` was empty on startup.
- Moved admin comparison and Thai price/admin note persistence to read and write vendor-sheet rows directly by quotation number.
- Changed admin and vendor UI wording from Vendor to Supplier where user-facing text appears.
- Added supplier notification emails for new work orders, with save-first then async-send behavior and toast progress/result updates in the UI.
- Sorted work orders newest-first in bootstrap output and added a `position` argument to toast helpers with top-right default.
- Added execution-scoped caches for the main spreadsheet handle, vendor spreadsheets by URL, parsed sheet tables, table row lookup indexes, script properties, and `APP_SECRET`.
- Reworked `getTable_()` to read only the actual used row range by known header width instead of `getDataRange()`.
- Reworked vendor `_QuotationIndex` and yearly quotation sheet reads to use bounded ranges and per-execution cache for index rows.
- Added `[PROFILE]` timing logs around `getBootstrapData`, `getAdminBootstrap_`, and `getVendorBootstrap_` to identify remaining hot spots.

## Important Runtime Behavior

- Work orders persist `workOrderFolderId`.
- Quotations persist `quotationFolderId`.
- Work orders persist both `quotationCount` and comma-separated QT ids in `Quotations`.
- Work order and quotation saves both use immediate response plus deferred finalize.
- Drive move and trash operations use batch requests first, with DriveApp fallback.
- `doGet()` no longer base64-encodes the logo on each request.
- Date fields are normalized for HTML `type="date"` inputs.
- Upload auth is requested on demand when files are selected, and selected files render immediately in a `Preparing upload` state.
- Vendor refresh path in the client should use `loadVendorWorkspaceData()` / `syncCurrentVendorSheet()` rather than `getBootstrapData()`.
- The legacy main `Quotations` sheet should no longer be treated as the runtime source of truth for vendor flows.
- Admin new-work saves should show success before email notification sending completes; email delivery is handled via `sendWorkOrderNotificationEmails()` after save.
- Bootstrap/profile logs now emit JSON payloads via `Logger.log('[PROFILE] ...')` so latency can be compared before and after each optimization pass.

## Known Bottlenecks / Risks

- `getVendorQuotationsForWorkOrder()` still scans all yearly `Quotation yyyy` sheets for the current vendor while resolving the QT ids listed in `WorkOrders.Quotations`.
- `syncVendorSheetInternal_()` still reads every yearly vendor quotation sheet during a vendor sync so it can refresh `WorkOrders.Quotations` / `quotationCount` aggregates.
- Latest profile sample showed `requireSession` and admin `loadWorkOrders` as the dominant bootstrap costs before the most recent bounded-range/cache pass; this should be re-measured on the next real run.
- There is still no automatic purge path if a vendor manually deletes a QT row from their spreadsheet; stale QT ids may remain in `WorkOrders.Quotations` until a purge flow is added.
- End-to-end browser testing is still unverified from this environment because the deployed web app requires a signed-in Google session.

## Browser Testing Status

- Diagnostics were clean for the latest `Index.html` and `Code.js` changes.
- I could not complete a real browser smoke test because the deployed Apps Script web app redirects to Google sign-in in this environment.
- `Code.js` compiled clean after the latest profiler cleanup, bounded-range table reads, and script-property/app-secret caching changes.

## Continue From Here

1. Open the deployed web app while signed in to the correct Google account and confirm that vendor login and browser reload both load through the direct vendor sync path.
2. Smoke test vendor flows: `Add QT`, `Manage QT`, edit quotation, file upload progress, work order `View` modal, and browser reload after vendor login.
3. Validate that each save updates the main `WorkOrders` row correctly: `Quotations` should contain the QT ids and `quotationCount` should match the number of ids.
4. Capture a fresh `[PROFILE]` sample after the latest deploy/run and compare `requireSession`, admin `loadWorkOrders`, and vendor `loadVendorIndex` against the previous timings.
5. If vendor quotation loading is still slow, extend the existing `_QuotationIndex` strategy so `getVendorQuotationsForWorkOrder()` and vendor sync avoid scanning every `Quotation yyyy` sheet.
6. Add a purge/delete flow so removed vendor-sheet rows are also removed from `WorkOrders.Quotations`.

## Useful References

- Session restore and direct vendor load logic are in `Index.html`.
- Vendor save/load/aggregate logic is in `Code.js` around `saveVendorQuotation()`, `finalizeVendorQuotationSave()`, `getVendorQuotationsForWorkOrder()`, `getVendorBootstrap_()`, `syncCurrentVendorSheet()`, the `_QuotationIndex` helpers, and the helper functions for `WorkOrders.Quotations`.
- Bootstrap/session profiling and execution caches are in `Code.js` around `getBootstrapData()`, `getAdminBootstrap_()`, `getVendorBootstrap_()`, `getTable_()`, `getScriptProperties_()`, and `getAppSecret_()`.
- Local project metadata is in `.clasp.json`.