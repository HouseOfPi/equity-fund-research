# Snapshot schema

Authoritative validation: `server/schema.js` (Zod). The persistent document is `{snapshots: Record<month:fundId, Snapshot>, history: Update[], lastSuccessfulCheck: ISO timestamp|null}`. No real records are included by default.

An import is `{note: string, snapshots: Snapshot[]}` with 1–100 unique month/fund pairs. Unknown fields are rejected.

| Snapshot field | Type / meaning                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| fundId         | `01` through `20`, assigned in the requested shortlist order; see `server/funds.js`                                    |
| month          | Valid `YYYY-MM` reporting month                                                                                        |
| disclosureDate | Valid `YYYY-MM-DD` portfolio **as-of date**, matching month, not the download/publication date                         |
| complete       | True only for the entire disclosed portfolio, never a top-five extraction                                              |
| verification   | `official`, `provider_agreement`, `unverified`, `conflict`                                                             |
| sources        | At least one Source object                                                                                             |
| holdings       | All disclosed instruments with canonical company identifiers                                                           |
| aum            | Optional verified `{crore: positive number, date: YYYY-MM-DD, sourceUrl: HTTPS URL, verified: true}`; month must match |

Source: `{label, url, type, disclosureDate, retrievedAt, result, feed?}`. URL must use HTTPS. Type is `official` or `independent`; result is `agrees`, `conflict`, or `not_checked`. Retrieval time is ISO 8601 UTC. All sources must have the same as-of date as the snapshot. Official verification requires an agreeing official source; provider agreement requires two agreeing independent provider records. Any conflict requires `verification: conflict`. Different providers may have the same feed, which must be disclosed when known.

Holding: `{companyId, company, instrument, quantity, allocation, reviewReason?, identifierEvidence?, corporateAction?}`. Company and canonical ID must be nonempty. Quantity is a nonnegative safe integer or null, never imputed zero. Allocation is percentage of net assets in [0,100], not percentage of the equity sleeve; total cannot exceed 100.5 (rounding tolerance). Instrument is `equity`, `cash`, `treps`, `derivative`, `debt`, or `fund_unit`. Listed and unlisted company equity both use `equity`. IDs must be unique within the snapshot. Corporate action metadata requires a review reason while uncertain.

`companyId` is a stable, evidence-backed canonical company key reused across funds and months. Spelling and name changes are display attributes; shared cards group by canonical ID. Never use fuzzy spelling matches to assert purchases. Use ISIN plus an audited identity mapping when a corporate action changes identifiers. Aggregate truly duplicate equity lines before import; retain evidence in `identifierEvidence` and record reconciliation in `note`. Similar names with different IDs across adjacent months are flagged for review by the comparator.

Position classification only runs when both adjacent disclosures are complete and not conflicted. Null quantities and review reasons produce Needs review. A missing row becomes new/exited only under that completeness condition. Percentage share change is undefined when previous quantity is zero. Allocation differences are shown separately in percentage points, including “New to top 5” for entry into that subset. Never label top-five entry as a new investment.

AUM ordering is used only when available records have verified, comparable same-date scheme AUM; records without AUM follow; otherwise shortlist order is displayed explicitly. AUM is never a research quality or trustworthiness ranking. All record-level AUM dates and source links are visible in Sources.
