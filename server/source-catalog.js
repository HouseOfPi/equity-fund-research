import fs from "node:fs";
import { funds } from "./funds.js";

const registry = JSON.parse(fs.readFileSync(new URL("../scripts/disclosure-sources.json", import.meta.url), "utf8"));
export function registeredMonths() { return [...new Set(registry.map((source) => source.month))].sort().reverse(); }
export function sourcesForMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error("Choose a valid reporting month");
  const [year, number] = month.split("-").map(Number), end = new Date(Date.UTC(year, number, 0));
  const day = end.getUTCDate(), name = end.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const short = name.slice(0, 3), upload = new Date(Date.UTC(year, number, 1));
  const uploadPath = `${upload.getUTCFullYear()}/${String(upload.getUTCMonth() + 1).padStart(2, "0")}`;
  const compact = `${String(day).padStart(2, "0")}${String(number).padStart(2, "0")}${year}`;
  const financialYear = number >= 4 ? year : year - 1;
  const ordinal = day === 31 ? "31st" : day === 30 ? "30th" : `${day}th`;
  const urls = {
    "01": `https://mf.nipponindiaim.com/InvestorServices/FactsheetsDocuments/NIMF-MONTHLY-PORTFOLIO-${day}-${short}-${String(year).slice(2)}.xls`,
    "03": registry.find((source) => source.fundId === "03").url,
    "04": `https://www.motilaloswalmf.com/content/dam/motilal-mf/sheets/fund-csvs/Month_End_Portfolio_${name}_${year}/YO46.xlsx`,
    "06": `https://mutualfund.adityabirlacapital.com/-/media/bsl/files/resources/monthly-portfolio/${year}/monthly-portfolio-${compact}_abslmf.zip`,
    "07": `https://www.miraeassetmf.co.in/docs/default-source/portfolios/mascf_${short.toLowerCase()}${year}.xlsx`,
    "14": `https://media.bajajamc.com/wp-content/uploads/${uploadPath}/Bajaj-Finserv-Mutual-Fund_Monthly-Portfolio-as-on-${day}-${short}-${year}.xls`,
    "15": `https://www.pgimindia.com/api/v1/brochure/about-us/image/PGIM%20INDIA%20SMALL%20CAP%20FUND%20${short}%20${year}.xlsx`,
    "16": `https://www.heliosmf.in/wp-content/uploads/${uploadPath}/helios-small-cap-fund-monthly-portfolio-as-on-${ordinal}-${name.toLowerCase()}-${year}.xlsx`,
    "17": `https://www.jmfinancialmf.com/CMS/downloads/Portfolio%20Disclosure/Monthly%20Portfolio%20of%20Schemes/Monthly%20Portfolio%20-%20JM%20Small%20Cap%20Fund%20-%20${short}%20${day},%20${year}.xlsx`,
    "19": `https://assets-netstorage.growwmf.in/compliance_docs/Statutory%20Disclosure/Portfolio/${financialYear}%20-${financialYear + 1}/Monthly%20Portfolio-%20${short}%20${day}%20${year}.xlsx`,
  };
  return funds.map((fund) => {
    const exact = registry.find((source) => source.fundId === fund.id && source.month === month);
    if (exact) return { ...exact };
    const base = registry.find((source) => source.fundId === fund.id);
    if (!base || !urls[fund.id]) return { fundId: fund.id, month, unavailable: true };
    const source = { ...base, month, url: urls[fund.id] };
    if (fund.id === "06") source.member = `${compact}_ABSLMF_MonthlyDisclosure.xls`;
    return source;
  });
}
