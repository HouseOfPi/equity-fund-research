# Official disclosure updates

The dashboard follows **AMC workbook → validation → Neon transaction → saved portfolio API → browser**.
Opening, reloading, or changing the month reads the database and never downloads an AMC disclosure.

## Update from the dashboard

1. Sign in and choose the reporting month on the portfolio page.
2. Click **Refresh** to download that month’s official reports again and save validated holdings in Neon.
3. Follow the inline progress; expand **Fund results** for individual outcomes.
4. The dashboard reloads saved records automatically when the refresh finishes and recalculates combined share movements against the previous month.

Refresh uses `POST /api/portfolio/refresh`, authenticated by the signed-in session
and protected by the same-origin POST policy. It accepts only a reporting month;
source URLs come from the fixed official registry. Duplicate requests coalesce.
Automated updater and manual import endpoints still require `UPDATER_TOKEN`;
no server secret is sent to the browser. The separate update tab has been removed.

The updater accepts the request with HTTP 202 and returns a persisted run ID.
`GET /api/updates/:id` reports progress; `GET /api/updates` lists recent runs.
Requests for a month already being updated return the existing run. Interrupted
runs whose heartbeat is older than two minutes can be retried. On a local server,
the process must remain running. On Vercel, `waitUntil` keeps the invocation alive
within the configured 300-second limit; this is not an unlimited durable queue.

## Update from a terminal or hosted scheduler

```bash
npm run data:sync -- --month 2026-08
```

The command loads `.env`, connects directly to Neon when `DATABASE_URL` is set,
fetches official files, and records the same update history. With no month argument
it checks the previous completed calendar month. A nonzero exit code reports a
partial or failed run; valid funds still commit and failed funds retain saved data.

A hosted scheduler may invoke this command with server-side credentials. No cron
or deployment is created by this change. There is no page-open update timer.

## Source coverage and validation

`scripts/disclosure-sources.json` contains audited, exact June, July and August
2026 file URLs for all 20 funds. All three months are saved in Neon: July compares
June with July, and August compares July with August. No workbooks are downloaded
when the dashboard loads. Direct official Edelweiss workbook links were found and
validated on 4 October 2026, resolving its earlier missing coverage. Earlier
partial update runs remain in the audit history as records of those attempts.
`server/source-catalog.js` also constructs month-specific URLs for ten publishers
with predictable file paths. Opaque/random URLs for other months require an audited
registry entry. A URL pattern is a candidate only: workbook contents must attest
the exact requested scheme and month-end date before import.

The native Node parser handles XLS, XLSX and selected members of ZIP archives. It
checks scheme identity, as-of date, required columns, identifiers, quantities,
percentage scaling, market-value totals, net-asset allocation totals and explicitly
configured cash subtotals. Small weights with documented AMC footnotes retain
allocation evidence. Equity quantities must be integers; non-equity units may be
fractional. Missing identifiers require an explicit audited allowance and a review
flag. The July Groww workbook uses an audited placeholder identifier for Lohia
Corp; it is retained as fund-scoped evidence and flagged for review. A matching
issuer name with a different identifier in the adjacent month also requires
review, rather than being counted as an automatic new holding or exit. Failed
parsing does not overwrite a saved snapshot.

The validated holdings, official URL, retrieval time and SHA-256 checksum are saved.
The source checksum records the downloaded bytes; raw workbooks are not stored by
the Node updater. The older Python download script can archive files locally for
additional offline review.

Passing snapshots, source evidence and the completed update record commit in one
transaction. Refreshing only retrieval metadata is not a material holding change.
Prior changed snapshots remain in the audit history. Failed sources are visible in
the run report, even when a previous valid snapshot still exists.

## Analysis

Cards and tables show the top 15 company-equity holdings. Shared holdings uses that
same subset. Fund analysis compares all disclosed equity positions across adjacent
complete months. Combined analysis adds share quantities only across funds with
comparable records, shows fund-level changes and sources, and suppresses totals for
companies needing review. Summary cards and counted filters distinguish net
increases, net decreases, new companies across compared funds and complete exits.
Mixed directions is an independent filter for companies with funds both adding
and reducing. Coverage and review notices accompany the scrollable company table;
expanding a company shows each fund's quantities and disclosure sources.
Allocation percentages remain individual fund weights.
