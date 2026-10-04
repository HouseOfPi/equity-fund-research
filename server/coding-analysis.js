import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createStore } from "./store.js";
import { createPostgresStorage } from "./postgres-store.js";
import { buildAnalysisInput, analysisInstructions, reportJsonSchema } from "./ai-analysis.js";
const [command, ...args] = process.argv.slice(2);
const value = (flag) => args[args.indexOf(flag) + 1];
if (!["export", "save"].includes(command)) throw Error("Use export --month YYYY-MM --out FILE or save --file FILE");
const database = process.env.DATABASE_URL ? createPostgresStorage(process.env.DATABASE_URL) : null;
try {
  const store = database?.store || createStore(path.resolve(process.env.DATA_DIR || "data"));
  if (command === "export") {
    const month = args.includes("--month") ? value("--month") : null;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) throw Error("Use --month YYYY-MM");
    const output = args.includes("--out") ? value("--out") : null;
    if (!output) throw Error("Use --out FILE");
    const input = buildAnalysisInput(await store.get(), month);
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ month, datasetHash: input.datasetHash, instructions: analysisInstructions, reportSchema: reportJsonSchema, ...input }, null, 2));
    console.log(`Exported ${input.coverage.comparedFunds} comparable funds to ${output}. Analyze in the coding environment; no model API is called.`);
  } else {
    const file = args.includes("--file") ? value("--file") : null;
    if (!file) throw Error("Use --file FILE");
    const report = await store.saveCodingReport(JSON.parse(fs.readFileSync(file, "utf8")));
    console.log(JSON.stringify({ id: report.id, month: report.month, status: report.status, origin: report.origin }));
  }
} finally { await database?.close(); }
