import fs from "node:fs";
import crypto from "node:crypto";
if (fs.existsSync(".env")) {
  console.log("Existing .env preserved. Run npm run dev.");
} else {
  fs.writeFileSync(
    ".env",
    `APP_PASSWORD=password123\nSESSION_SECRET=${crypto.randomBytes(32).toString("hex")}\nUPDATER_TOKEN=${crypto.randomBytes(32).toString("hex")}\nAPP_ORIGIN=http://localhost:5173\nDATA_DIR=./data\nCOOKIE_SECURE=false\nNODE_ENV=development\n# Neon pooled Postgres connection string (blank uses local files)\nDATABASE_URL=\n`,
    { mode: 0o600 },
  );
  console.log(
    "Local configuration created. Run npm run dev, then open http://localhost:5173. Initial password: password123.",
  );
}
