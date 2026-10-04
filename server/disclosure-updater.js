import crypto from "node:crypto";
import { funds } from "./funds.js";
import { sourcesForMonth } from "./source-catalog.js";
import { parseDisclosureFile } from "./disclosure-parser.js";
import { importSchema } from "./schema.js";

export async function fetchDisclosure(source, { fetcher = fetch } = {}) {
  if (!source.url?.startsWith("https://")) throw Error("HTTPS disclosure source required");
  const response = await fetcher(source.url, { signal: AbortSignal.timeout(20000), headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  } });
  if (!response.ok) throw Error("Official source returned HTTP " + response.status);
  if (Number(response.headers.get("content-length")) > 40_000_000) throw Error("Disclosure exceeds download limit");
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 40_000_000) { await response.body.cancel?.().catch(() => {}); throw Error("Disclosure exceeds download limit"); }
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks), sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  return parseDisclosureFile(bytes, source, new Date().toISOString(), sha256);
}

export function createDisclosureUpdater(store, { fetchSource = fetchDisclosure, catalog = sourcesForMonth } = {}) {
  async function run(update) {
    let report = funds.map((fund) => ({ fundId: fund.id, name: fund.name, status: "pending" }));
    let progress = Promise.resolve();
    const saveProgress = () => {
      const snapshot = structuredClone(report);
      progress = progress.then(() => store.progressUpdate(update.id, snapshot));
      return progress;
    };
    const heartbeat = setInterval(() => { saveProgress().catch(() => {}); }, 10000);
    heartbeat.unref?.();
    try {
      const queue = catalog(update.month), snapshots = [];
      const workers = await Promise.allSettled(Array.from({ length: 6 }, async () => {
        while (queue.length) {
          const source = queue.shift(), entry = report.find((entry) => entry.fundId === source.fundId);
          if (source.unavailable) {
            entry.status = "unavailable";
            entry.error = "A vetted official workbook URL is not configured for this fund and month.";
          } else {
            entry.status = "fetching"; entry.sourceUrl = source.url;
            await saveProgress();
            try {
              let snapshot;
              for (let attempt = 0; attempt < 2; attempt++) {
                try { snapshot = await fetchSource(source); break; }
                catch (error) {
                  if (attempt || !/timeout|aborted|fetch failed|HTTP (?:429|5\d\d)/i.test(error.message)) throw error;
                }
              }
              if (snapshot.fundId !== source.fundId || snapshot.month !== update.month) throw Error("Source returned a different fund or reporting month");
              importSchema.parse({ note: "Official source validation", snapshots: [snapshot] });
              snapshots.push(snapshot); entry.status = "verified"; entry.holdings = snapshot.holdings.length;
            } catch (error) {
              entry.status = "failed";
              entry.error = String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database]").slice(0, 500);
            }
          }
          await saveProgress();
        }
      }));
      const failure = workers.find((worker) => worker.status === "rejected");
      if (failure) throw failure.reason;
      clearInterval(heartbeat); await progress;
      snapshots.sort((a, b) => a.fundId.localeCompare(b.fundId));
      const batch = snapshots.length ? importSchema.parse({
        note: `Fetched ${snapshots.length}/${funds.length} official ${update.month} disclosures. Workbook scheme/date, identifiers, quantities, percentage units, cash aggregates and grand totals validated. Source SHA-256 checksums recorded. Failed funds retain their saved records.`,
        snapshots,
      }) : null;
      return await store.finishUpdate(update.id, batch, report);
    } catch (error) {
      clearInterval(heartbeat);
      await progress.catch(() => {});
      report = report.map((entry) => ["pending", "fetching", "verified"].includes(entry.status) ? { ...entry, status: "failed", error: "Update interrupted before saving." } : entry);
      return store.finishUpdate(update.id, null, report, "Update could not finish. Saved portfolios are preserved.");
    } finally { clearInterval(heartbeat); }
  }
  return { run };
}
