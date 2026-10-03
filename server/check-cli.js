import "dotenv/config";
if (!process.env.UPDATER_TOKEN) throw Error("UPDATER_TOKEN required");
const response = await fetch(
  (process.env.API_URL || "http://localhost:3001") + "/api/updater/check",
  {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.UPDATER_TOKEN },
    signal: AbortSignal.timeout(60000),
  },
);
console.log(await response.text());
if (!response.ok) process.exitCode = 1;
