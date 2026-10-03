export const monthLabel = (m) =>
  m
    ? new Date(m + "-01T00:00:00Z").toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
export const number = (n) => (n == null ? "—" : n.toLocaleString("en-IN"));
export const pct = (n) => (n == null ? "—" : n.toFixed(2) + "%");
export async function api(url, options = {}) {
  const res = await fetch("/api" + url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json();
  if (!res.ok)
    throw Object.assign(Error(data.error || "Request failed. Please retry."), {
      status: res.status,
    });
  return data;
}

export function prev(m) {
  let [y, n] = m.split("-").map(Number);
  return new Date(Date.UTC(y, n - 2, 1)).toISOString().slice(0, 7);
}
