import { z } from "zod";
import { funds } from "./funds.js";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Invalid date",
  );
const source = z
  .object({
    label: z.string().min(1),
    url: z
      .string()
      .url()
      .refine((s) => s.startsWith("https://"), "HTTPS required"),
    type: z.enum(["official", "independent"]),
    disclosureDate: date,
    retrievedAt: z.string().datetime(),
    result: z.enum(["agrees", "conflict", "not_checked"]),
    feed: z.string().optional(),
  })
  .strict();
export const snapshotSchema = z
  .object({
    fundId: z.enum(funds.map((f) => f.id)),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    disclosureDate: date,
    complete: z.boolean(),
    verification: z.enum([
      "official",
      "provider_agreement",
      "unverified",
      "conflict",
    ]),
    sources: z.array(source).min(1),
    aum: z
      .object({
        crore: z.number().positive(),
        date,
        sourceUrl: z
          .string()
          .url()
          .refine((s) => s.startsWith("https://")),
        verified: z.literal(true),
      })
      .optional(),
    holdings: z.array(
      z
        .object({
          companyId: z.string().min(1),
          company: z.string().min(1),
          instrument: z.enum([
            "equity",
            "cash",
            "treps",
            "derivative",
            "debt",
            "fund_unit",
          ]),
          quantity: z.number().int().safe().nonnegative().nullable(),
          allocation: z.number().min(0).max(100),
          reviewReason: z.string().min(1).optional(),
          identifierEvidence: z.string().optional(),
          corporateAction: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((s, ctx) => {
    const error = (message) => ctx.addIssue({ code: "custom", message });
    if (s.disclosureDate.slice(0, 7) !== s.month)
      error("Disclosure as-of date must match month");
    if (s.sources.some((x) => x.disclosureDate !== s.disclosureDate))
      error("All comparison sources must use the same disclosure date");
    if (
      s.verification === "official" &&
      !s.sources.some((x) => x.type === "official" && x.result === "agrees")
    )
      error("Official verification requires official evidence");
    if (
      s.verification === "provider_agreement" &&
      s.sources.filter((x) => x.type === "independent" && x.result === "agrees")
        .length < 2
    )
      error("Provider agreement requires two providers");
    if (
      s.sources.some((x) => x.result === "conflict") &&
      s.verification !== "conflict"
    )
      error("Unresolved conflict must be flagged");
    if (new Set(s.holdings.map((h) => h.companyId)).size !== s.holdings.length)
      error("Consolidate duplicate company IDs before import");
    if (s.holdings.some((h) => h.corporateAction && !h.reviewReason))
      error(
        "Corporate actions require a review reason; resolve and document evidence before comparison",
      );
    if (s.holdings.reduce((n, h) => n + h.allocation, 0) > 100.5)
      error("Allocations exceed net assets");
    if (s.aum && s.aum.date.slice(0, 7) !== s.month)
      error("AUM must match reporting month");
  });
export const importSchema = z
  .object({
    snapshots: z.array(snapshotSchema).min(1).max(100),
    note: z.string().min(1).max(2000),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.snapshots.map((s) => s.month + ":" + s.fundId)).size ===
      v.snapshots.length,
    "Duplicate snapshot in batch",
  );
