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
  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: res.statusText || "Server unavailable. Please retry." };
  }
  if (!res.ok)
    throw Object.assign(Error(data?.error || "Request failed. Please retry."), {
      status: res.status,
    });
  return data;
}

export function prev(m) {
  let [y, n] = m.split("-").map(Number);
  return new Date(Date.UTC(y, n - 2, 1)).toISOString().slice(0, 7);
}

export function exportCsv(filename, headers, rows) {
  const escapeCell = (cell) => {
    if (cell == null) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };
  const content = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
