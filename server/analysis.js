export function compare(previous, current) {
  if (
    !previous?.complete ||
    !current?.complete ||
    previous.verification === "conflict" ||
    current.verification === "conflict"
  )
    return {
      pending: true,
      reason:
        "Complete, comparable disclosures for both adjacent months are required.",
    };
  const equity = (s) => s.holdings.filter((h) => h.instrument === "equity");
  const index = (s) => new Map(equity(s).map((h) => [h.companyId, h]));
  const a = index(previous),
    b = index(current);
  const normalized = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const ambiguous = new Set();
  for (const [id, p] of a)
    for (const [other, c] of b)
      if (id !== other && normalized(p.company) === normalized(c.company)) {
        ambiguous.add(id);
        ambiguous.add(other);
      }
  const rows = [...new Set([...a.keys(), ...b.keys()])].map((id) => {
    const p = a.get(id),
      c = b.get(id);
    const uncertain =
      ambiguous.has(id) ||
      p?.reviewReason ||
      c?.reviewReason ||
      (p?.quantity == null && p) ||
      (c?.quantity == null && c);
    const movement = uncertain
      ? "Needs review"
      : !p
        ? "New position"
        : !c
          ? "Exited position"
          : c.quantity > p.quantity
            ? "Increased share quantity"
            : c.quantity < p.quantity
              ? "Decreased share quantity"
              : "Unchanged";
    const net = uncertain ? null : (c?.quantity ?? 0) - (p?.quantity ?? 0);
    return {
      id,
      company: c?.company || p.company,
      movement,
      previousQuantity: p?.quantity ?? (uncertain ? null : 0),
      currentQuantity: c?.quantity ?? (uncertain ? null : 0),
      net,
      percent: net == null || !p?.quantity ? null : (net / p.quantity) * 100,
      allocation: c?.allocation ?? null,
      reason:
        c?.reviewReason ||
        p?.reviewReason ||
        (ambiguous.has(id)
          ? "Identifier changed without consolidation evidence"
          : uncertain
            ? "Quantity unavailable"
            : null),
    };
  });
  return {
    pending: false,
    rows,
    previousDate: previous.disclosureDate,
    currentDate: current.disclosureDate,
    sources: [...previous.sources, ...current.sources],
    counts: Object.fromEntries(
      [
        "Increased share quantity",
        "Decreased share quantity",
        "New position",
        "Exited position",
        "Unchanged",
        "Needs review",
      ].map((k) => [k, rows.filter((r) => r.movement === k).length]),
    ),
  };
}
