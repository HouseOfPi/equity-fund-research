# Executed verification — 3 October 2026

- Production Vite build: passed.
- Backend test suite: 8 passed (comparison rules, identifier uncertainty, scheme coverage, schema validation, persistent snapshots/history, login/session cookies, protected APIs, viewer import rejection and exact-month pending results).
- Playwright Chromium UI suite: 2 passed after final edits, on the running application. Covers full names in both views, fixture data parity, themes/view persistence, loading visibility and disabled selector, no missing-month fallback, top/bottom Minimize and keyboard restoration, collapsed shared cards, whole-portfolio analysis and 390px mobile page-overflow checks.
- Desktop and mobile screenshots were captured and desktop layout inspected. Running app was also exercised with agent-browser using container Chromium.

Synthetic fixtures are explicitly labeled and isolated in tests; production datastore starts empty. No real holdings, AUM values, quantities or verification claims were fabricated. Official AMC and independent cross-check ingestion could not be performed because fund-source destinations are unavailable in this environment.

Not operationally verified: a public deployment, HTTPS reverse proxy, real disclosure import accuracy, real corporate-action reconciliation, hosted scheduler, Docker image on a deployed host or multi-instance operation. Scheduling is disabled. The optional hosted check consumes a configured vetted JSON manifest; it is not an AMC document scraper.
