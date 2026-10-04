# Analysis from the coding environment

The website's **AI analysis** button reads the latest saved report for the selected
month. It never invokes a model, generates a report, or requires an OpenAI API key.
If no report exists, it explains that analysis must be prepared in Codex. If the
holdings have changed, the previous report stays readable with a stale-data notice.

Ask Codex: **Analyze August 2026 portfolios and save the report.** Codex reviews the
full database-backed portfolio dataset in the coding environment, writes the
analysis, and imports it. Running the commands alone does not write an analysis.

## Prepare and save

```sh
npm run analysis:export -- --month 2026-08 --out data/analysis/2026-08-input.json
# Read the exported data and instructions, then author the report in Codex.
npm run analysis:save -- --file data/analysis/2026-08-report.json
```

The export includes all equity positions for the selected and two preceding months,
all fund/company comparison evidence, a dataset fingerprint, research instructions
and the report JSON schema. No external model service is called by either command.

The authored JSON has the shape `{ "month": "2026-08", "datasetHash": "...", "preparedBy": { "agent": "Codex", "model": null }, "report": {...} }`.
Record the actual preparing agent and model in `preparedBy`. Use `null` for the model when the exact model is unavailable; never guess it. Both fields are displayed in the popup. Use the exported fingerprint and schema. The report needs supported findings,
exact numerical claims, a behavior summary for every comparable fund, and limitations.
Distinguish observations from hypotheses; investigate broad versus concentrated
additions, disagreement, concentration, share/weight divergence and persistence.
Do not infer prices, valuation, flows, sectors or manager intent from holdings alone.

Saving validates the report against the current database inside the storage
transaction. Unknown/disputed evidence, incorrect numerical claims, missing fund
summaries or a changed fingerprint are rejected. Validation checks structured
claims, not every prose sentence. Only a successful validation saves a completed
report with `origin: coding-environment`. Identical imports reuse the same record.

## Storage and access

Reports persist by month in Neon under `observatory_state.document.aiReports`,
with the `observatory_ai_reports` view available for queries. Local file storage
is used only when DATABASE_URL is absent. New reports retain earlier versions;
reports are not automatically evicted when more months are added. The database
credentials remain server-side and in the coding environment.

Authenticated `GET /api/ai-analysis?month=YYYY-MM` returns the latest completed
report, or `run: null`. `GET /api/ai-analysis/:id` reads a historical report.
`POST /api/ai-analysis` returns 405; there is no browser generation or import route.
Previously generated reports remain available and are labeled as predating this
workflow. The website labels reports authored in the coding environment separately.

No OPENAI_API_KEY or AI_MODEL is used. Existing ignored local credentials can be
removed if no other work needs them. Refreshing disclosures updates portfolios,
not analysis; request an updated report in Codex when needed.
