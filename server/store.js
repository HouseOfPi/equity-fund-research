import { beginAIReport, finishAIReport, saveCodingReport } from "./ai-analysis.js";
import { applyImport, beginUpdate, progressUpdate, finishUpdate } from "./update-state.js";
import fs from "node:fs";
import path from "node:path";
import session from "express-session";
export function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "observatory.json");
  let data = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { snapshots: {}, history: [], lastSuccessfulCheck: null };
  const save = () => {
    const temp = file + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(temp, file);
  };
  return {
    get: () => data,
    record(entry) {
      data.history.unshift(entry);
      data.history = data.history.slice(0, 1000);
      save();
    },
    check() {
      data.lastSuccessfulCheck = new Date().toISOString();
      save();
    },
    import(batch, actor) { const result = applyImport(data, batch, actor); save(); return result; },
    saveCodingReport(envelope) { const result = saveCodingReport(data, envelope); save(); return result; },
    beginAIReport(metadata) { const result = beginAIReport(data, metadata); save(); return result; },
    finishAIReport(id, result) { const saved = finishAIReport(data, id, result); save(); return saved; },
    beginUpdate(month) { const result = beginUpdate(data, month); save(); return structuredClone(result); },
    progressUpdate(id, report) { progressUpdate(data, id, report); save(); },
    finishUpdate(id, batch, report, error) { const result = finishUpdate(data, id, batch, report, error); save(); return result; },
  };
}
export class FileSessions extends session.Store {
  constructor(dir) {
    super();
    this.dir = path.join(dir, "sessions");
    fs.mkdirSync(this.dir, { recursive: true });
  }
  file(id) {
    return path.join(this.dir, id.replace(/[^a-zA-Z0-9_-]/g, "") + ".json");
  }
  get(id, cb) {
    try {
      const s = JSON.parse(fs.readFileSync(this.file(id), "utf8"));
      if (new Date(s.cookie.expires) < new Date())
        return this.destroy(id, () => cb(null, null));
      cb(null, s);
    } catch (e) {
      cb(e.code === "ENOENT" ? null : e, null);
    }
  }
  set(id, s, cb) {
    try {
      fs.writeFileSync(this.file(id), JSON.stringify(s), { mode: 0o600 });
      cb?.();
    } catch (e) {
      cb?.(e);
    }
  }
  destroy(id, cb) {
    fs.rm(this.file(id), { force: true }, cb || (() => {}));
  }
}
