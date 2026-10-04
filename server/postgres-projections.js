import fs from "node:fs";
import { funds } from "./funds.js";

export const schemaSql = fs.readFileSync(new URL("./postgres-schema.sql", import.meta.url), "utf8");

export async function seedFunds(client) {
  await client.query(`
    INSERT INTO observatory_funds (id, name)
    SELECT id, name FROM jsonb_to_recordset($1::jsonb) AS f(id text, name text)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  `, [JSON.stringify(funds)]);
}

// The application's state document and its queryable tables commit together.
// Rebuild children to remove stale holdings and evidence when a snapshot changes.
export async function syncSnapshots(client, snapshots) {
  const input = JSON.stringify(Object.values(snapshots));
  await client.query("DELETE FROM observatory_sources");
  await client.query("DELETE FROM observatory_holdings");
  await client.query(`
    DELETE FROM observatory_snapshots s WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements($1::jsonb) x
      WHERE x->>'fundId' = s.fund_id AND x->>'month' = s.month
    )
  `, [input]);
  await client.query(`
    INSERT INTO observatory_snapshots
      (fund_id, month, disclosure_date, complete, verification, aum_crore, aum_date, aum_source_url)
    SELECT x->>'fundId', x->>'month', (x->>'disclosureDate')::date,
      (x->>'complete')::boolean, x->>'verification',
      (x->'aum'->>'crore')::numeric, (x->'aum'->>'date')::date, x->'aum'->>'sourceUrl'
    FROM jsonb_array_elements($1::jsonb) x
    ON CONFLICT (fund_id, month) DO UPDATE SET
      disclosure_date = EXCLUDED.disclosure_date, complete = EXCLUDED.complete,
      verification = EXCLUDED.verification, aum_crore = EXCLUDED.aum_crore,
      aum_date = EXCLUDED.aum_date, aum_source_url = EXCLUDED.aum_source_url
  `, [input]);
  await client.query(`
    INSERT INTO observatory_holdings
      (fund_id, month, company_id, company, instrument, quantity, allocation,
       review_reason, identifier_evidence, allocation_evidence, corporate_action)
    SELECT x->>'fundId', x->>'month', h->>'companyId', h->>'company',
      h->>'instrument', (h->>'quantity')::numeric, (h->>'allocation')::numeric,
      h->>'reviewReason', h->>'identifierEvidence', h->>'allocationEvidence', h->>'corporateAction'
    FROM jsonb_array_elements($1::jsonb) x,
      LATERAL jsonb_array_elements(x->'holdings') h
  `, [input]);
  await client.query(`
    INSERT INTO observatory_sources
      (fund_id, month, source_number, label, url, type, disclosure_date, retrieved_at, result, feed, sha256)
    SELECT x->>'fundId', x->>'month', source_number, s->>'label', s->>'url', s->>'type',
      (s->>'disclosureDate')::date, (s->>'retrievedAt')::timestamptz, s->>'result', s->>'feed', s->>'sha256'
    FROM jsonb_array_elements($1::jsonb) x,
      LATERAL jsonb_array_elements(x->'sources') WITH ORDINALITY AS sources(s, source_number)
  `, [input]);
}
