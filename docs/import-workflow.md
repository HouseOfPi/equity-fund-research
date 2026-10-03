# Operator import workflow

1. Obtain the official AMC monthly portfolio disclosure for the exact scheme in `server/funds.js`. Exclude ETFs, index funds and funds of funds. Preserve the requested shortlist.
2. Record the actual portfolio as-of date, download time, URL and file evidence in your research archive. Publication time is distinct from the portfolio as-of date.
3. Extract the complete portfolio, net-asset allocations and share quantities. Retain non-equity instruments in the record with their correct type; comparisons automatically exclude them. Include unlisted company equity. Never infer a company's market-cap category from the scheme label.
4. Reconcile canonical company IDs across months and fund houses. For supported name/identifier changes, consolidate lines under one canonical ID, aggregate duplicate lines and document evidence. Flag splits, bonuses, mergers and unresolved mappings with `reviewReason`. Do not infer buying or selling from post-action quantities without reconciliation.
5. Cross-check top holdings against an independent source for the same disclosure date where available. Record disagreement as conflict; record missing checks as not_checked. Do not declare official verification from third-party agreement. Preserve common-feed information where known.
6. Prepare the batch matching `docs/data-schema.md`. Do not label partial top-five data complete. Include a material, evidence-oriented note.
7. Sign in as a viewer and open Updater & history. Use the separately held updater token, or the CLI with server environment credentials. Validation occurs before atomic import; unsuccessful imports are recorded in history. Existing other months remain intact. Corrections replace that month's record while prior versions remain in operator history on disk.
8. Reload the viewer. Verify the exact month, dates, source links, top-five weights and whole-portfolio reconciliation. Back up the persistent store.

No fake production import template is shipped. Test fixtures under `tests/` explicitly use synthetic names and `example.invalid`; they are not disclosure evidence and must never be imported into the real store.
