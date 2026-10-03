export const names = [
  "Nippon India Small Cap Fund",
  "DSP Small Cap Fund",
  "Invesco India Smallcap Fund",
  "Motilal Oswal Small Cap Fund",
  "Edelweiss Small Cap Fund",
  "Aditya Birla Sun Life Small Cap Fund",
  "Mirae Asset Small Cap Fund",
  "Mahindra Manulife Small Cap Fund",
  "UTI Small Cap Fund",
  "Sundaram Small Cap Fund",
  "ITI Small Cap Fund",
  "TRUSTMF Small Cap Fund",
  "Abakkus Small Cap Fund",
  "Bajaj Finserv Small Cap Fund",
  "PGIM India Small Cap Fund",
  "Helios Small Cap Fund",
  "JM Small Cap Fund",
  "LIC MF Small Cap Fund",
  "Groww Small Cap Fund",
  "Quantum Small Cap Fund",
];
export const funds = names.map((name, i) => ({
  id: String(i + 1).padStart(2, "0"),
  name,
}));
export function previousMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}
export function topFive(snapshot) {
  return (snapshot?.holdings || [])
    .filter((h) => h.instrument === "equity")
    .sort(
      (a, b) =>
        b.allocation - a.allocation || a.company.localeCompare(b.company),
    )
    .slice(0, 5);
}
