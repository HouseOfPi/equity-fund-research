import "dotenv/config";
import fs from "node:fs";
import { importSchema } from "./schema.js";
const file = process.argv[2];
if (!file || !process.env.UPDATER_TOKEN)
  throw Error(
    "Usage: node server/import-cli.js snapshot.json (UPDATER_TOKEN required)",
  );
const batch = importSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
const response = await fetch(
  (process.env.API_URL || "http://localhost:3001") + "/api/updater/import",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.UPDATER_TOKEN,
    },
    body: JSON.stringify(batch),
  },
);
console.log(await response.text());
if (!response.ok) process.exitCode = 1;
