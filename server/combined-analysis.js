// Compare every disclosed equity position in complete adjacent portfolios.
export function combinedAnalysis(funds) {
  const covered = funds.filter((fund) => !fund.analysis.pending), companies = new Map();
  for (const fund of covered) for (const row of fund.analysis.rows) {
    if (!companies.has(row.id)) companies.set(row.id, { id: row.id, company: row.company, entries: [] });
    companies.get(row.id).entries.push({ ...row, fundId: fund.id, fundName: fund.name, sources: fund.analysis.sources });
  }
  const rows = [...companies.values()].map((company) => {
    const review = company.entries.some((entry) => entry.movement === "Needs review"),
      previous = review ? null : company.entries.reduce((n, entry) => n + entry.previousQuantity, 0),
      current = review ? null : company.entries.reduce((n, entry) => n + entry.currentQuantity, 0),
      net = review ? null : current - previous,
      increased = company.entries.filter((entry) => ["Increased share quantity", "New position"].includes(entry.movement)).length,
      decreased = company.entries.filter((entry) => ["Decreased share quantity", "Exited position"].includes(entry.movement)).length;
    const movement = review ? "Needs review" : previous === 0 && current > 0 ? "New across funds"
      : current === 0 && previous > 0 ? "Exited across funds" : net > 0 ? "Net increase" : net < 0 ? "Net decrease" : "Unchanged";
    return { ...company, review, previous, current, net, movement,
      percent: !previous || net == null ? null : net / previous * 100,
      increased, decreased, mixed: increased > 0 && decreased > 0 };
  }).sort((a, b) => Number(a.review) - Number(b.review) || (b.net ?? 0) - (a.net ?? 0) || a.company.localeCompare(b.company));
  const counts = {
    changed: rows.filter((row) => row.movement !== "Unchanged").length,
    increased: rows.filter((row) => row.movement === "Net increase").length,
    decreased: rows.filter((row) => row.movement === "Net decrease").length,
    new: rows.filter((row) => row.movement === "New across funds").length,
    exited: rows.filter((row) => row.movement === "Exited across funds").length,
    mixed: rows.filter((row) => row.mixed).length,
    all: rows.length,
    review: rows.filter((row) => row.review).length,
  };
  return { covered: covered.length, pending: funds.length - covered.length, rows, counts,
    reviewComparisons: rows.reduce((n, row) => n + row.entries.filter((entry) => entry.movement === "Needs review").length, 0),
    pendingFunds: funds.filter((fund) => fund.analysis.pending).map((fund) => ({ id: fund.id, name: fund.name, reason: fund.analysis.reason })),
  };
}
