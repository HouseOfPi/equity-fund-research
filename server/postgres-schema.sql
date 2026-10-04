CREATE TABLE IF NOT EXISTS observatory_state (
  id integer PRIMARY KEY CHECK (id = 1),
  document jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS observatory_sessions (
  id text PRIMARY KEY,
  document jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS observatory_sessions_expiry ON observatory_sessions (expires_at);

CREATE TABLE IF NOT EXISTS observatory_funds (
  id text PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE IF NOT EXISTS observatory_snapshots (
  fund_id text NOT NULL REFERENCES observatory_funds (id),
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  disclosure_date date NOT NULL,
  complete boolean NOT NULL,
  verification text NOT NULL CHECK (verification IN ('official', 'provider_agreement', 'unverified', 'conflict')),
  aum_crore numeric CHECK (aum_crore > 0),
  aum_date date,
  aum_source_url text,
  PRIMARY KEY (fund_id, month),
  CHECK (to_char(disclosure_date, 'YYYY-MM') = month)
);
CREATE INDEX IF NOT EXISTS observatory_snapshots_month ON observatory_snapshots (month);
CREATE TABLE IF NOT EXISTS observatory_holdings (
  fund_id text NOT NULL,
  month text NOT NULL,
  company_id text NOT NULL,
  company text NOT NULL,
  instrument text NOT NULL CHECK (instrument IN ('equity', 'cash', 'treps', 'derivative', 'debt', 'fund_unit')),
  quantity numeric CHECK (quantity >= 0),
  allocation numeric NOT NULL CHECK (allocation BETWEEN -100 AND 100),
  review_reason text,
  identifier_evidence text,
  allocation_evidence text,
  corporate_action text,
  PRIMARY KEY (fund_id, month, company_id),
  FOREIGN KEY (fund_id, month) REFERENCES observatory_snapshots (fund_id, month) ON DELETE CASCADE,
  CHECK (allocation >= 0 OR instrument = 'cash')
);
-- Upgrade existing databases without rounding fractional non-equity units.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'observatory_holdings'::regclass
             AND attname = 'quantity' AND atttypid = 'bigint'::regtype) THEN
    ALTER TABLE observatory_holdings ALTER COLUMN quantity TYPE numeric USING quantity::numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'observatory_holdings'::regclass
                 AND conname = 'observatory_holdings_quantity_valid') THEN
    ALTER TABLE observatory_holdings ADD CONSTRAINT observatory_holdings_quantity_valid
      CHECK (quantity <= 9007199254740991 AND (instrument <> 'equity' OR quantity = trunc(quantity)));
  END IF;
END $$;
ALTER TABLE observatory_holdings ADD COLUMN IF NOT EXISTS allocation_evidence text;
CREATE INDEX IF NOT EXISTS observatory_holdings_company ON observatory_holdings (company_id, month);
CREATE TABLE IF NOT EXISTS observatory_sources (
  fund_id text NOT NULL,
  month text NOT NULL,
  source_number integer NOT NULL,
  label text NOT NULL,
  url text NOT NULL CHECK (url LIKE 'https://%'),
  type text NOT NULL CHECK (type IN ('official', 'independent')),
  disclosure_date date NOT NULL,
  retrieved_at timestamptz NOT NULL,
  result text NOT NULL CHECK (result IN ('agrees', 'conflict', 'not_checked')),
  feed text,
  sha256 text,
  PRIMARY KEY (fund_id, month, source_number),
  FOREIGN KEY (fund_id, month) REFERENCES observatory_snapshots (fund_id, month) ON DELETE CASCADE
);
ALTER TABLE observatory_sources ADD COLUMN IF NOT EXISTS sha256 text;
CREATE OR REPLACE VIEW observatory_update_runs AS
SELECT run->>'id' AS id, run->>'month' AS month, run->>'status' AS status,
  (run->>'startedAt')::timestamptz AS started_at,
  (run->>'completedAt')::timestamptz AS completed_at, run AS document
FROM observatory_state,
LATERAL jsonb_array_elements(COALESCE(document->'updateRuns', '[]'::jsonb)) AS updates(run)
WHERE observatory_state.id = 1;
CREATE OR REPLACE VIEW observatory_import_history AS
SELECT entry_number, entry AS document
FROM observatory_state,
LATERAL jsonb_array_elements(document->'history') WITH ORDINALITY AS history(entry, entry_number)
WHERE id = 1;

CREATE OR REPLACE VIEW observatory_ai_reports AS
SELECT report->>'id' AS id, report->>'month' AS month, report->>'status' AS status,
  report->>'datasetHash' AS dataset_hash, report->>'model' AS model,
  (report->>'startedAt')::timestamptz AS started_at, report AS document
FROM observatory_state,
LATERAL jsonb_array_elements(COALESCE(document->'aiReports', '[]'::jsonb)) AS reports(report)
WHERE observatory_state.id = 1;
