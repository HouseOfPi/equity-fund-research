import React, { useState } from "react";
const textOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
export function useSortedRows(rows, initial = null) {
  const [sort, setSort] = useState(initial);
  function sortBy(key) {
    setSort((previous) => ({ key, direction: previous?.key === key && previous.direction === "ascending" ? "descending" : "ascending" }));
  }
  const sorted = sort ? [...rows].sort((a, b) => {
    const left = a[sort.key], right = b[sort.key];
    // Withheld quantities stay last in either direction, rather than becoming zero.
    if (left == null || right == null) return left == null ? right == null ? 0 : 1 : -1;
    const order = typeof left === "number" && typeof right === "number" ? left - right : textOrder.compare(left, right);
    return sort.direction === "ascending" ? order : -order;
  }) : rows;
  return { rows: sorted, sort, sortBy };
}
export function SortButton({ column, sorting }) {
  const active = sorting.sort?.key === column.key;
  const next = active && sorting.sort.direction === "ascending" ? "descending" : "ascending";
  return <button className="combined-sort" onClick={() => sorting.sortBy(column.key)} aria-label={`${column.label}: sort ${next}`} title={`Sort ${next}`}>
    <span>{column.label}</span><span className={active ? "sort-arrow active" : "sort-arrow"} aria-hidden="true">{active ? sorting.sort.direction === "ascending" ? "▲" : "▼" : "↕"}</span>
  </button>;
}
export function SortHeading({ column, sorting }) {
  return <th scope="col" aria-sort={sorting.sort?.key === column.key ? sorting.sort.direction : "none"}><SortButton column={column} sorting={sorting} /></th>;
}
