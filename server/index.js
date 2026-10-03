import "dotenv/config";
import path from "node:path";
import { createApp } from "./app.js";
if (
  !process.env.APP_PASSWORD ||
  !process.env.SESSION_SECRET ||
  process.env.SESSION_SECRET.length < 32
)
  throw Error(
    "Set APP_PASSWORD and SESSION_SECRET (at least 32 characters) in server environment.",
  );
if (
  process.env.NODE_ENV === "production" &&
  (process.env.COOKIE_SECURE !== "true" ||
    process.env.APP_PASSWORD === "password123")
)
  throw Error(
    "Production requires HTTPS secure cookies and a changed password.",
  );
createApp({
  password: process.env.APP_PASSWORD,
  secret: process.env.SESSION_SECRET,
  updaterToken: process.env.UPDATER_TOKEN,
  origin: process.env.APP_ORIGIN || "http://localhost:5173",
  secure: process.env.COOKIE_SECURE === "true",
  dataDir: path.resolve(process.env.DATA_DIR || "data"),
  manifestUrl: process.env.DISCLOSURE_MANIFEST_URL,
  databaseUrl: process.env.DATABASE_URL,
}).listen(process.env.PORT || 3001, "0.0.0.0", () =>
  console.log("Smallcap Observatory server ready"),
);
