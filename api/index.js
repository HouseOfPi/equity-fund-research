import { waitUntil } from "@vercel/functions";
import { createApp } from "../server/app.js";
const required = [
  "APP_PASSWORD",
  "SESSION_SECRET",
  "DATABASE_URL",
  "APP_ORIGIN",
];
const missing = required.filter((key) => !process.env[key]);
let app;
export default function handler(req, res) {
  if (missing.length || process.env.SESSION_SECRET?.length < 32) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error: "Hosting configuration incomplete. Contact the operator.",
      }),
    );
  }
  if (!app)
    app = createApp({
      password: process.env.APP_PASSWORD,
      secret: process.env.SESSION_SECRET,
      updaterToken: process.env.UPDATER_TOKEN,
      origin: process.env.APP_ORIGIN,
      secure: true,
      defer: waitUntil,
      databaseUrl: process.env.DATABASE_URL,
      manifestUrl: process.env.DISCLOSURE_MANIFEST_URL,
    });
  return app(req, res);
}
