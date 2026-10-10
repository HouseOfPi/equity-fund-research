import React, { useState, useMemo } from "react";
import { number, pct, exportCsv } from "./utils.js";

export const INVESTORS_DATA = {
  kedia: {
    id: "kedia",
    name: "Vijay Kedia",
    avatar: "VK",
    firm: "Kedia Securities Pvt. Ltd.",
    badge: "S.M.I.L.E. Framework",
    filingQuarter: "June 2026",
    description: "Managing Director of Kedia Securities. Celebrated for multi-bagger small-cap discoveries using his signature S.M.I.L.E. discipline with multi-year holding horizons.",
    anchorHolding: "Atul Auto Limited",
    anchorStake: "20.91%",
    recentShift: "Eimco Elecon (+1.45%)",
    philosophyTitle: "Vijay Kedia's S.M.I.L.E. Investing Framework",
    philosophyPoints: [
      { letter: "S", title: "Small in size", desc: "Small-cap market capitalisation with immense operational runway to scale 5x to 10x." },
      { letter: "M", title: "Medium in experience", desc: "Promoters with 10-15+ years of industry experience; proven resilience across market cycles." },
      { letter: "L", title: "Large in aspiration", desc: "Hungry leadership, conservative leverage, and high corporate governance standards." },
      { letter: "E", title: "Extra-large market", desc: "Large addressable market size (TAM) enabling multi-year compounding." },
    ],
    holdings: [
      {
        rank: 1,
        company: "Atul Auto Limited",
        ticker: "ATULAUTO",
        sector: "Auto & Ancillary",
        stake: 20.91,
        shares: 5800000,
        estimatedValueCrore: 282.5,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Anchor multi-bagger position held for over 10+ years; primary three-wheeler manufacturer transitioning rapidly into commercial electric vehicles.",
      },
      {
        rank: 2,
        company: "Neuland Laboratories Limited",
        ticker: "NEULANDLAB",
        sector: "Pharma & Chemicals",
        stake: 1.01,
        shares: 130000,
        estimatedValueCrore: 174.8,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Specialized Active Pharmaceutical Ingredient (API) and Custom Manufacturing Solutions (CMS) vendor with expanding margins and global innovator ties.",
      },
      {
        rank: 3,
        company: "Elecon Engineering Company Limited",
        ticker: "ELECON",
        sector: "Capital Goods & Infra",
        stake: 1.00,
        shares: 1120000,
        estimatedValueCrore: 139.2,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Dominant industrial gear & material handling equipment manufacturer benefiting from heavy capex across domestic steel, mining, and defense industries.",
      },
      {
        rank: 4,
        company: "Vaibhav Global Limited",
        ticker: "VAIBHAVGBL",
        sector: "Consumer & Retail",
        stake: 2.05,
        shares: 3380000,
        estimatedValueCrore: 114.6,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Vertically integrated direct-to-consumer electronic retailer of affordable fashion jewellery and lifestyle merchandise operating in the US, UK, and Germany.",
      },
      {
        rank: 5,
        company: "Mahindra Holidays & Resorts India Ltd",
        ticker: "MHRIL",
        sector: "Consumer & Retail",
        stake: 1.00,
        shares: 2020000,
        estimatedValueCrore: 84.7,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Leading leisure hospitality vacation ownership chain backed by the Mahindra Group, expanding room inventory across premium tourist destinations.",
      },
      {
        rank: 6,
        company: "Sudarshan Chemical Industries Limited",
        ticker: "SUDARSCHEM",
        sector: "Pharma & Chemicals",
        stake: 1.27,
        shares: 880000,
        estimatedValueCrore: 81.9,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Top global producer of organic, inorganic and effect pigments serving paints, plastics, cosmetics, inks and specialty coatings worldwide.",
      },
      {
        rank: 7,
        company: "Repro India Limited",
        ticker: "REPRO",
        sector: "Tech & Services",
        stake: 6.32,
        shares: 890000,
        estimatedValueCrore: 69.4,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "On-demand digital book printing and distribution platform partnered with leading e-commerce platforms and international academic publishers.",
      },
      {
        rank: 8,
        company: "Eimco Elecon (India) Limited",
        ticker: "EIMCOELECO",
        sector: "Capital Goods & Infra",
        stake: 1.45,
        shares: 84000,
        estimatedValueCrore: 47.8,
        filingQuarter: "June 2026",
        action: "Fresh Entry",
        actionType: "positive",
        actionDetail: "Freshly added position in the June 2026 quarter; market leader in underground coal and mineral mining machinery.",
      },
      {
        rank: 9,
        company: "Om Infra Limited",
        ticker: "OMINFRAL",
        sector: "Capital Goods & Infra",
        stake: 2.49,
        shares: 2400000,
        estimatedValueCrore: 44.5,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Turnkey hydro-mechanical equipment contractor for dams, reservoirs, barrages, and water transmission infrastructure projects.",
      },
      {
        rank: 10,
        company: "Affordable Robotic & Automation Ltd",
        ticker: "ARAPL",
        sector: "Tech & Services",
        stake: 1.05,
        shares: 110000,
        estimatedValueCrore: 25.1,
        filingQuarter: "June 2026",
        action: "Trimmed",
        actionType: "negative",
        actionDetail: "Automated multilevel parking systems and factory floor robotic conveyor systems; slight 0.3% stake reduction.",
      },
      {
        rank: 11,
        company: "Precision Camshafts Limited",
        ticker: "PRECAM",
        sector: "Auto & Ancillary",
        stake: 1.05,
        shares: 1000000,
        estimatedValueCrore: 23.6,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Tier-1 supplier of camshafts to global automotive OEMs with growing exposure to electric commercial vehicle retrofits.",
      },
      {
        rank: 12,
        company: "Innovators Facade Systems Limited",
        ticker: "INNOVATORS",
        sector: "Capital Goods & Infra",
        stake: 1.02,
        shares: 195000,
        estimatedValueCrore: 18.2,
        filingQuarter: "June 2026",
        action: "Trimmed",
        actionType: "negative",
        actionDetail: "Specialized building façade engineering solutions for international airports, commercial complexes and high-rise commercial structures.",
      },
      {
        rank: 13,
        company: "Global Vectra Helicorp Limited",
        ticker: "GLOBALVECT",
        sector: "Tech & Services",
        stake: 1.46,
        shares: 205000,
        estimatedValueCrore: 14.3,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Largest private helicopter charter company in India serving offshore oil & gas exploration missions and religious tourism routes.",
      },
      {
        rank: 14,
        company: "Tac Infosec Limited",
        ticker: "TAC",
        sector: "Tech & Services",
        stake: 1.05,
        shares: 110000,
        estimatedValueCrore: 11.8,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "SaaS vulnerability management and automated threat audit platform serving global Fortune 500 banks and fintech enterprises.",
      },
    ],
  },

  kacholia: {
    id: "kacholia",
    name: "Ashish Kacholia",
    avatar: "AK",
    firm: "Lucky Securities",
    badge: "The Mid-Cap Maven",
    filingQuarter: "June 2026",
    description: "Known in Indian markets as the 'Big Whale'. Focuses on high-conviction growth investing in scalable manufacturing, niche packaging, and specialty chemical leaders.",
    anchorHolding: "Safari Industries Ltd",
    anchorStake: "2.14%",
    recentShift: "Shaily Engineering (+0.8%)",
    philosophyTitle: "Ashish Kacholia's Conviction Growth Framework",
    philosophyPoints: [
      { letter: "N", title: "Niche Moat", desc: "Selects companies commanding 40%+ market share in mission-critical industrial components." },
      { letter: "O", title: "Operating Leverage", desc: "Enters when capital expenditures complete and fixed costs yield explosive margin expansion." },
      { letter: "R", title: "Relentless ROE", desc: "Demands return on equity consistently exceeding 18-20% through cycles." },
      { letter: "P", title: "Patient Aggression", desc: "Scales positions aggressively through market dips and holds through 3-7 year cycles." },
    ],
    holdings: [
      {
        rank: 1,
        company: "Safari Industries (India) Limited",
        ticker: "SAFARI",
        sector: "Consumer & Retail",
        stake: 2.14,
        shares: 510000,
        estimatedValueCrore: 248.6,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "High-growth luggage brand capturing market share through aggressive retail expansion and domestic manufacturing moats.",
      },
      {
        rank: 2,
        company: "Shaily Engineering Plastics Limited",
        ticker: "SHAILY",
        sector: "Capital Goods & Infra",
        stake: 5.48,
        shares: 504000,
        estimatedValueCrore: 212.4,
        filingQuarter: "June 2026",
        action: "Accumulated",
        actionType: "positive",
        actionDetail: "High-precision injection molded plastics manufacturer servicing global medical devices, drug delivery pens, and IKEA home furnishings.",
      },
      {
        rank: 3,
        company: "Gravita India Limited",
        ticker: "GRAVITA",
        sector: "Pharma & Chemicals",
        stake: 1.85,
        shares: 1280000,
        estimatedValueCrore: 196.2,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Multinational recycling leader in lead, aluminum, and plastics benefiting from global sustainability mandates and battery waste rules.",
      },
      {
        rank: 4,
        company: "Balu Forge Industries Limited",
        ticker: "BALUFORGE",
        sector: "Auto & Ancillary",
        stake: 2.12,
        shares: 2180000,
        estimatedValueCrore: 168.5,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Specialist precision machined crankshaft and forged component producer serving railways, defense, aerospace, and new energy vehicles.",
      },
      {
        rank: 5,
        company: "Yasho Industries Limited",
        ticker: "YASHO",
        sector: "Pharma & Chemicals",
        stake: 2.10,
        shares: 240000,
        estimatedValueCrore: 136.8,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Specialty chemical producer of antioxidants, aroma chemicals, and rubber additives with recent major capex commissioning.",
      },
      {
        rank: 6,
        company: "Ami Organics Limited",
        ticker: "AMIORG",
        sector: "Pharma & Chemicals",
        stake: 1.74,
        shares: 640000,
        estimatedValueCrore: 128.4,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Advanced pharmaceutical intermediates and specialty chemicals manufacturer serving top global active ingredient innovators.",
      },
      {
        rank: 7,
        company: "Fineotex Chemical Limited",
        ticker: "FCL",
        sector: "Pharma & Chemicals",
        stake: 2.34,
        shares: 2600000,
        estimatedValueCrore: 88.7,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Leading specialty chemical manufacturer for textiles, water treatment, hygiene, and oil drilling sectors across 70+ countries.",
      },
      {
        rank: 8,
        company: "Raghav Productivity Enhancers Ltd",
        ticker: "RPEL",
        sector: "Capital Goods & Infra",
        stake: 2.01,
        shares: 460000,
        estimatedValueCrore: 84.2,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "World's largest producer of silica ramming mass for induction furnaces, benefiting from domestic steel expansion.",
      },
      {
        rank: 9,
        company: "Dhabriya Polywood Limited",
        ticker: "DHABRIYA",
        sector: "Capital Goods & Infra",
        stake: 5.12,
        shares: 550000,
        estimatedValueCrore: 72.8,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Manufacturer of uPVC windows, doors, and PVC modular furniture catering to institutional real estate and infrastructure developers.",
      },
      {
        rank: 10,
        company: "La Opala RG Limited",
        ticker: "LAOPALA",
        sector: "Consumer & Retail",
        stake: 1.35,
        shares: 1500000,
        estimatedValueCrore: 54.1,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Pioneer and market leader in opal glassware and tableware in India with high brand recall and pan-India distribution.",
      },
      {
        rank: 11,
        company: "Tanfac Industries Limited",
        ticker: "TANFACIND",
        sector: "Pharma & Chemicals",
        stake: 1.18,
        shares: 118000,
        estimatedValueCrore: 48.3,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Joint venture with Anupam Rasayan; major manufacturer of anhydrous hydrofluoric acid and specialty fluoride derivatives.",
      },
      {
        rank: 12,
        company: "Brand Concepts Limited",
        ticker: "BCONCEPT",
        sector: "Consumer & Retail",
        stake: 1.45,
        shares: 160000,
        estimatedValueCrore: 32.5,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Fashion and lifestyle brand licensee managing luggage, backpacks and small leather accessories for global labels like Tommy Hilfiger.",
      },
    ],
  },

  agrawal: {
    id: "agrawal",
    name: "Mukul Agrawal",
    avatar: "MA",
    firm: "Param Capital",
    badge: "Momentum Growth Investor",
    filingQuarter: "June 2026",
    description: "Aggressive growth investor known for spotting early-stage breakout themes across engineering, defense, IT, and consumer industrials with high trading agility.",
    anchorHolding: "Raymond Limited",
    anchorStake: "1.42%",
    recentShift: "Arisinfra (+1.6%)",
    philosophyTitle: "Mukul Agrawal's High-Velocity Growth Framework",
    philosophyPoints: [
      { letter: "E", title: "Early Discovery", desc: "Takes sizable stakes in micro-caps right before institutional mutual funds and FIIs take notice." },
      { letter: "M", title: "Momentum Tailwinds", desc: "Rides structural policy changes in defense indigenisation, infrastructure capex, and digital SaaS." },
      { letter: "D", title: "Diversified Bets", desc: "Maintains 50+ holdings across sectors to capture multi-bagger asymmetry with calculated risk." },
      { letter: "F", title: "Fast Capital Reallocation", desc: "Quick to scale winning positions and mercilessly exit stagnating narratives." },
    ],
    holdings: [
      {
        rank: 1,
        company: "Raymond Limited",
        ticker: "RAYMOND",
        sector: "Consumer & Retail",
        stake: 1.42,
        shares: 945000,
        estimatedValueCrore: 295.4,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Legacy brand unlocking value via corporate demergers across suiting, lifestyle apparel, real estate, and aerospace engineering.",
      },
      {
        rank: 2,
        company: "Dishman Carbogen Amcis Limited",
        ticker: "DCAL",
        sector: "Pharma & Chemicals",
        stake: 3.42,
        shares: 5350000,
        estimatedValueCrore: 245.8,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Global CRAMS powerhouse with manufacturing sites in Switzerland, UK, and India specializing in high-potency active compounds.",
      },
      {
        rank: 3,
        company: "Zaggle Prepaid Ocean Services Ltd",
        ticker: "ZAGGLE",
        sector: "Tech & Services",
        stake: 2.18,
        shares: 2680000,
        estimatedValueCrore: 215.6,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Fast-growing enterprise SaaS fintech platform managing corporate spend, employee benefits, and vendor payout workflows.",
      },
      {
        rank: 4,
        company: "Dynamatic Technologies Limited",
        ticker: "DYNAMATECH",
        sector: "Auto & Ancillary",
        stake: 2.45,
        shares: 165000,
        estimatedValueCrore: 185.3,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Tier-1 aerospace manufacturing partner to Airbus, Boeing, and Bell Helicopters, producing flight-critical assemblies and hydraulic gear.",
      },
      {
        rank: 5,
        company: "PDS Limited",
        ticker: "PDSL",
        sector: "Consumer & Retail",
        stake: 2.76,
        shares: 3620000,
        estimatedValueCrore: 165.7,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Asset-light global fashion supply chain platform providing design, sourcing, and logistics to world's leading apparel brands.",
      },
      {
        rank: 6,
        company: "PTC India Financial Services Ltd",
        ticker: "PFS",
        sector: "Tech & Services",
        stake: 1.84,
        shares: 11800000,
        estimatedValueCrore: 110.2,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Infrastructure finance company providing structured debt solutions for renewable green energy, transmission, and clean mobility.",
      },
      {
        rank: 7,
        company: "Capacite Infraprojects Limited",
        ticker: "CAPACITE",
        sector: "Capital Goods & Infra",
        stake: 1.85,
        shares: 1560000,
        estimatedValueCrore: 98.4,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Specialist EPC contractor building super high-rise residential towers, modern hospital campuses, and institutional headquarters.",
      },
      {
        rank: 8,
        company: "Surya Roshni Limited",
        ticker: "SURYAROSNI",
        sector: "Capital Goods & Infra",
        stake: 1.34,
        shares: 1450000,
        estimatedValueCrore: 92.1,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Major Indian manufacturer of ERW steel pipes, GI pipes, and energy-efficient commercial LED lighting solutions.",
      },
      {
        rank: 9,
        company: "Ceinsys Tech Limited",
        ticker: "CEINSYS",
        sector: "Tech & Services",
        stake: 4.88,
        shares: 760000,
        estimatedValueCrore: 84.5,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Geospatial engineering and mobility technology enterprise serving smart city, water pipeline, and defense mapping contracts.",
      },
      {
        rank: 10,
        company: "Ganesha Ecosphere Limited",
        ticker: "GANECOS",
        sector: "Pharma & Chemicals",
        stake: 1.75,
        shares: 380000,
        estimatedValueCrore: 76.8,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "India's largest recycler of post-consumer PET bottles into Recycled Polyester Staple Fibre (RPSF) and sustainable yarns.",
      },
      {
        rank: 11,
        company: "Arisinfra Solutions Limited",
        ticker: "ARISINFRA",
        sector: "Tech & Services",
        stake: 1.60,
        shares: 680000,
        estimatedValueCrore: 65.2,
        filingQuarter: "June 2026",
        action: "Fresh Entry",
        actionType: "positive",
        actionDetail: "Fresh position initiated in June 2026 quarter; tech-enabled B2B procurement network for construction building materials.",
      },
    ],
  },

  khanna: {
    id: "khanna",
    name: "Dolly Khanna",
    avatar: "DK",
    firm: "Rajiv Khanna Portfolio",
    badge: "Traditional Value Investor",
    filingQuarter: "June 2026",
    description: "Managed by veteran Rajiv Khanna. Masters in identifying turnaround small-cap manufacturing and cyclical commodity plays boasting asset strength and unloved valuations.",
    anchorHolding: "Rain Industries Ltd",
    anchorStake: "1.72%",
    recentShift: "Savera Industries (+0.5%)",
    philosophyTitle: "Dolly Khanna's Deep Asset-Value Framework",
    philosophyPoints: [
      { letter: "C", title: "Cyclical Troughs", desc: "Enters during peak industry pessimism when product spreads hit historical lows." },
      { letter: "B", title: "Balance Sheet Health", desc: "Prioritises companies trading at steep discounts to replacement book value with minimal bankruptcy risk." },
      { letter: "D", title: "Dividend History", desc: "Values long corporate operating track records with consistent shareholder payout culture." },
      { letter: "U", title: "Uncrowded Ideas", desc: "Avoids expensive popular market consensus; seeks hidden gems in South India's industrial belt." },
    ],
    holdings: [
      {
        rank: 1,
        company: "Rain Industries Limited",
        ticker: "RAIN",
        sector: "Pharma & Chemicals",
        stake: 1.72,
        shares: 5780000,
        estimatedValueCrore: 115.8,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Global producer of calcined petroleum coke (CPC), coal tar pitch, and advanced chemical materials serving the global aluminium smelter industry.",
      },
      {
        rank: 2,
        company: "KCP Limited",
        ticker: "KCP",
        sector: "Capital Goods & Infra",
        stake: 2.65,
        shares: 3420000,
        estimatedValueCrore: 62.4,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Diversified South Indian industrial group producing premium cement, heavy sugar mill machinery, and precision foundry castings.",
      },
      {
        rank: 3,
        company: "Talbros Automotive Components Ltd",
        ticker: "TALBROAUTO",
        sector: "Auto & Ancillary",
        stake: 1.58,
        shares: 980000,
        estimatedValueCrore: 58.6,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Pioneer in automotive gaskets, heat shields, and steering components with technical joint ventures with global Japanese and European majors.",
      },
      {
        rank: 4,
        company: "Nitin Spinners Limited",
        ticker: "NITINSPIN",
        sector: "Consumer & Retail",
        stake: 1.48,
        shares: 830000,
        estimatedValueCrore: 48.2,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Export-oriented manufacturer of high-quality 100% cotton yarns, compact yarns, and knitted fabrics with strong margins.",
      },
      {
        rank: 5,
        company: "Prakash Pipes Limited",
        ticker: "PRAKASH",
        sector: "Capital Goods & Infra",
        stake: 2.45,
        shares: 580000,
        estimatedValueCrore: 38.4,
        filingQuarter: "June 2026",
        action: "Trimmed",
        actionType: "negative",
        actionDetail: "Manufacturer of rigid PVC pipes, fittings, and flexible packaging laminates benefiting from rural irrigation and water missions.",
      },
      {
        rank: 6,
        company: "Savera Industries Limited",
        ticker: "SAVERA",
        sector: "Consumer & Retail",
        stake: 2.15,
        shares: 260000,
        estimatedValueCrore: 36.1,
        filingQuarter: "June 2026",
        action: "Accumulated",
        actionType: "positive",
        actionDetail: "Prominent Chennai luxury hospitality property owner; accumulated an additional 0.5% stake in the June quarter.",
      },
      {
        rank: 7,
        company: "Som Distilleries & Breweries Limited",
        ticker: "SDBL",
        sector: "Consumer & Retail",
        stake: 1.15,
        shares: 890000,
        estimatedValueCrore: 29.5,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Fast-growing domestic alcoholic beverage and beer manufacturer expanding retail footprint across Karnataka, Odisha, and Delhi.",
      },
      {
        rank: 8,
        company: "Deepak Spinners Limited",
        ticker: "DEEPAKSP",
        sector: "Consumer & Retail",
        stake: 1.95,
        shares: 140000,
        estimatedValueCrore: 24.3,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Producer of synthetic staple fiber blended yarns for weaving, knitting, and industrial upholstery.",
      },
      {
        rank: 9,
        company: "Tinna Rubber & Infrastructure Limited",
        ticker: "TINNA",
        sector: "Auto & Ancillary",
        stake: 1.32,
        shares: 110000,
        estimatedValueCrore: 22.1,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Eco-friendly re-processor of end-of-life tyres into crumb rubber modifier (CRM) for highway bitumen and rubber reclaimed compounds.",
      },
    ],
  },

  damani: {
    id: "damani",
    name: "Radhakishan Damani",
    avatar: "RD",
    firm: "Derive Investments",
    badge: "The Dean of Value Investing",
    filingQuarter: "June 2026",
    description: "Legendary mentor to Rakesh Jhunjhunwala and founder of DMart. Known for his calm, ultra long-term compounder mindset and zero-debt, cash-generating business moats.",
    anchorHolding: "Avenue Supermarts (DMart)",
    anchorStake: "72.30%",
    recentShift: "VST Industries (29.10%)",
    philosophyTitle: "Radhakishan Damani's Unshakeable Moat Framework",
    philosophyPoints: [
      { letter: "M", title: "Everyday Low Cost", desc: "Relentless cost obsession allowing companies to pass on unbeatable value to end-consumers." },
      { letter: "C", title: "Negative Working Capital", desc: "Suppliers fund the business while customers pay upfront cash, turning growth self-financing." },
      { letter: "L", title: "Long-Term Compounding", desc: "Decade-long holding periods; ignores macro volatility to let compounding work uninterrupted." },
      { letter: "H", title: "Humble Leadership", desc: "Low profile, conservative accounts, and high skin in the game with clean balance sheets." },
    ],
    holdings: [
      {
        rank: 1,
        company: "Avenue Supermarts Limited (DMart)",
        ticker: "DMART",
        sector: "Consumer & Retail",
        stake: 72.30,
        shares: 470000000,
        estimatedValueCrore: 162500.0,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Founder anchor holding; India's most profitable supermarket chain operating on an own-store, low-cost retailing fortress model.",
      },
      {
        rank: 2,
        company: "VST Industries Limited",
        ticker: "VSTIND",
        sector: "Consumer & Retail",
        stake: 29.10,
        shares: 4490000,
        estimatedValueCrore: 3150.0,
        filingQuarter: "June 2026",
        action: "Accumulated",
        actionType: "positive",
        actionDetail: "Hyderabad-based cigarette and tobacco giant boasting debt-free operations, generous dividend yields, and steady cash flows.",
      },
      {
        rank: 3,
        company: "Sundaram Finance Limited",
        ticker: "SUNDARMFIN",
        sector: "Tech & Services",
        stake: 2.37,
        shares: 2630000,
        estimatedValueCrore: 1420.0,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "The gold standard among Indian NBFCs with immaculate asset quality, conservative lending underwriting, and deep commercial vehicle relationships.",
      },
      {
        rank: 4,
        company: "3M India Limited",
        ticker: "3MINDIA",
        sector: "Pharma & Chemicals",
        stake: 1.48,
        shares: 167000,
        estimatedValueCrore: 840.0,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Indian subsidiary of Minnesota-based 3M Company commanding patent-protected leadership across industrial adhesives, dental health, and traffic safety.",
      },
      {
        rank: 5,
        company: "United Breweries Limited",
        ticker: "UBL",
        sector: "Consumer & Retail",
        stake: 1.23,
        shares: 3250000,
        estimatedValueCrore: 720.0,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "India's undisputed market leader in beer with iconic flagship brand Kingfisher and backing from Heineken international brewing group.",
      },
      {
        rank: 6,
        company: "Trent Limited",
        ticker: "TRENT",
        sector: "Consumer & Retail",
        stake: 1.52,
        shares: 540000,
        estimatedValueCrore: 490.0,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Tata Group's retail compounding engine transforming Indian fast fashion via runaway success format Zudio and Westside stores.",
      },
      {
        rank: 7,
        company: "The India Cements Limited",
        ticker: "INDIACEM",
        sector: "Capital Goods & Infra",
        stake: 1.80,
        shares: 5580000,
        estimatedValueCrore: 360.0,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Major South Indian cement producer with extensive limestone reserves and strategic distribution throughout Tamil Nadu and Andhra Pradesh.",
      },
      {
        rank: 8,
        company: "Mangalam Organics Limited",
        ticker: "MANORG",
        sector: "Pharma & Chemicals",
        stake: 2.15,
        shares: 184000,
        estimatedValueCrore: 58.2,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Leading producer of camphor, terpene phenolic resins, and synthetic pine resins supplying pharmaceuticals, religious retail, and adhesives.",
      },
      {
        rank: 9,
        company: "Advani Hotels & Resorts (India) Ltd",
        ticker: "ADVANIHOTR",
        sector: "Consumer & Retail",
        stake: 4.18,
        shares: 1930000,
        estimatedValueCrore: 48.6,
        filingQuarter: "June 2026",
        action: "Steady",
        actionType: "neutral",
        actionDetail: "Debt-free owner-operator of Caravela Beach Resort Goa, known for high return on capital and steady dividend distribution history.",
      },
    ],
  },
};

export const INVESTOR_KEYS = ["kedia", "kacholia", "agrawal", "khanna", "damani"];

export default function AceInvestors({ selectedInvestor: controlledInvestor, onSelectInvestor }) {
  const [internalInvestor, setInternalInvestor] = useState("kedia");
  const selectedInvestor = controlledInvestor || internalInvestor;
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [view, setView] = useState("table");
  const [expandedId, setExpandedId] = useState(null);
  const [showPhilosophy, setShowPhilosophy] = useState(false);

  React.useEffect(() => {
    setSearch("");
    setSectorFilter("All");
    setExpandedId(null);
  }, [selectedInvestor]);

  const activeInvestor = INVESTORS_DATA[selectedInvestor] || INVESTORS_DATA.kedia;

  const sectors = useMemo(() => {
    const list = ["All", ...new Set(activeInvestor.holdings.map((h) => h.sector))];
    return list;
  }, [activeInvestor]);

  const filteredHoldings = useMemo(() => {
    return activeInvestor.holdings.filter((h) => {
      const matchSector = sectorFilter === "All" || h.sector === sectorFilter;
      const matchSearch =
        search.trim() === "" ||
        h.company.toLowerCase().includes(search.toLowerCase()) ||
        h.ticker.toLowerCase().includes(search.toLowerCase()) ||
        h.sector.toLowerCase().includes(search.toLowerCase());
      return matchSector && matchSearch;
    });
  }, [activeInvestor, search, sectorFilter]);

  const totalPortfolioValue = useMemo(() => {
    return activeInvestor.holdings.reduce((sum, h) => sum + h.estimatedValueCrore, 0);
  }, [activeInvestor]);

  const handleExportCsv = () => {
    const headers = [
      "Rank",
      "Company Name",
      "Ticker",
      "Sector",
      "Public Stake (%)",
      "Estimated Value (Rs Cr)",
      "Shares Held",
      "Quarter Filing",
      "Portfolio Action",
      "Investment Notes",
    ];
    const rows = filteredHoldings.map((h) => [
      h.rank,
      h.company,
      h.ticker,
      h.sector,
      h.stake.toFixed(2),
      h.estimatedValueCrore.toFixed(1),
      h.shares,
      h.filingQuarter,
      h.action,
      h.actionDetail,
    ]);
    exportCsv(activeInvestor.id + "-portfolio.csv", headers, rows);
  };

  const handleInvestorSelect = (key) => {
    if (onSelectInvestor) {
      onSelectInvestor(key);
    } else {
      setInternalInvestor(key);
    }
    setSearch("");
    setSectorFilter("All");
    setExpandedId(null);
  };

  return (
    <div className="ace-investors-container">
      {/* Page Title & Intro */}
      <div className="ace-page-header">
        <div className="ace-header-text">
          <span className="eyebrow-chip">✦ Institutional Intelligence</span>
          <h1>Ace Investors Portfolio</h1>
          <p className="dashboard-subtitle">
            Disclosed public equity holdings (&gt;1% filings) of India&apos;s celebrated super-investors
          </p>
        </div>

        {/* Investor Switcher Bar (Clean, no 'live' captions) */}
        <div className="investor-tabs" role="tablist" aria-label="Select Ace Investor">
          {INVESTOR_KEYS.map((key) => {
            const inv = INVESTORS_DATA[key];
            const isActive = selectedInvestor === key;
            return (
              <button
                key={inv.id}
                role="tab"
                aria-selected={isActive}
                className={"investor-tab-btn " + (isActive ? "active" : "")}
                onClick={() => handleInvestorSelect(key)}
              >
                <span className={"tab-avatar " + (isActive ? "" : "secondary")}>
                  {inv.avatar}
                </span>
                <span className="tab-name">{inv.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Investor Hero Profile Card */}
      <section className="investor-profile-card">
        <div className="profile-main-col">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{activeInvestor.avatar}</div>
            <div className="profile-identity">
              <div className="profile-badge-row">
                <span className="badge verified">Verified SEBI Public Filings</span>
                <span className="badge neutral">{activeInvestor.firm}</span>
                <span className="badge neutral">{activeInvestor.badge}</span>
              </div>
              <h2>{activeInvestor.name}</h2>
              <p className="profile-desc">{activeInvestor.description}</p>
            </div>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <span className="stat-label">Disclosed Portfolio Value</span>
              <b className="stat-val positive">
                {totalPortfolioValue >= 10000
                  ? "₹" + (totalPortfolioValue / 1000).toFixed(1) + "k+ Cr"
                  : "₹" + number(Math.round(totalPortfolioValue)) + "+ Cr"}
              </b>
              <small className="stat-hint">&gt;1% Disclosed Holdings</small>
            </div>
            <div className="profile-stat-box">
              <span className="stat-label">Tracked Positions</span>
              <b className="stat-val">{activeInvestor.holdings.length} Companies</b>
              <small className="stat-hint">{sectors.length - 1} Diverse Sectors</small>
            </div>
            <div className="profile-stat-box">
              <span className="stat-label">Anchor Position</span>
              <b className="stat-val">{activeInvestor.anchorHolding}</b>
              <small className="stat-hint">{activeInvestor.anchorStake} Stake</small>
            </div>
            <div className="profile-stat-box">
              <span className="stat-label">Recent Movement</span>
              <b className="stat-val info">{activeInvestor.recentShift}</b>
              <small className="stat-hint">Latest Quarter</small>
            </div>
          </div>
        </div>

        {/* Strategy / Philosophy Disclosure */}
        <div className="profile-philosophy-toggle">
          <button
            className="philosophy-btn"
            onClick={() => setShowPhilosophy(!showPhilosophy)}
            aria-expanded={showPhilosophy}
          >
            <span>✦ Read {activeInvestor.name}&apos;s Core Investment Framework</span>
            <span className="chevron-icon">{showPhilosophy ? "▴" : "▾"}</span>
          </button>

          {showPhilosophy && (
            <div className="philosophy-content">
              <div className="smile-grid">
                {activeInvestor.philosophyPoints.map((pt, idx) => (
                  <div className="smile-card" key={idx}>
                    <b className="smile-letter">{pt.letter}</b>
                    <h4>{pt.title}</h4>
                    <p>{pt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Holdings Section Controls */}
      <section className="ace-holdings-section">
        <div className="ace-toolbar">
          <div className="ace-toolbar-left">
            <div className="sector-filters" role="group" aria-label="Filter by Sector">
              {sectors.map((sec) => (
                <button
                  key={sec}
                  className={"sector-pill " + (sectorFilter === sec ? "active" : "")}
                  onClick={() => setSectorFilter(sec)}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          <div className="ace-toolbar-right">
            <div className="search-input-wrap">
              <input
                type="search"
                placeholder={"Search " + activeInvestor.name + "'s holdings…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={"Search " + activeInvestor.name + " holdings"}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>

            <div className="view-switch" role="group" aria-label="Portfolio View">
              <button
                aria-pressed={view === "table"}
                className={view === "table" ? "selected" : ""}
                onClick={() => setView("table")}
                title="Switch to Table View"
              >
                ☷ Table
              </button>
              <button
                aria-pressed={view === "cards"}
                className={view === "cards" ? "selected" : ""}
                onClick={() => setView("cards")}
                title="Switch to Cards View"
              >
                ▦ Cards
              </button>
            </div>

            <button
              className="export-csv-btn"
              onClick={handleExportCsv}
              title={"Download " + activeInvestor.name + "'s portfolio as CSV"}
              aria-label="Export CSV"
            >
              ↓ Export CSV
            </button>
          </div>
        </div>

        {/* Holdings Table */}
        {view === "table" ? (
          <div className="fund-table-wrap">
            <table className="fund-table">
              <thead>
                <tr>
                  <th scope="col" className="col-num">#</th>
                  <th scope="col">Company & Ticker</th>
                  <th scope="col">Sector</th>
                  <th scope="col" className="numeric">Stake (%)</th>
                  <th scope="col" className="col-bar-head">Holding Scale</th>
                  <th scope="col" className="numeric">Est. Value</th>
                  <th scope="col">Recent Action</th>
                  <th scope="col" className="col-toggle">Investment Rationale</th>
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.map((h) => {
                  const isExpanded = expandedId === h.rank;
                  const maxStake = Math.max(...activeInvestor.holdings.map((x) => x.stake), 10);
                  const barPercent = Math.min(100, Math.round((h.stake / maxStake) * 100));

                  return (
                    <React.Fragment key={h.rank}>
                      <tr
                        className={"fund-row " + (isExpanded ? "is-expanded" : "")}
                        onClick={() => setExpandedId(isExpanded ? null : h.rank)}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                      >
                        <td className="col-num">
                          <span className="serial-pill">{String(h.rank).padStart(2, "0")}</span>
                        </td>

                        <td className="col-fund">
                          <div className="fund-identity">
                            <b className="fund-name-text">{h.company}</b>
                            <div className="fund-badge-line">
                              <span className="badge neutral">{h.ticker}</span>
                              <span className="fine">{h.filingQuarter} Filing</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="holding-chip">{h.sector}</span>
                        </td>

                        <td className="numeric weight-cell">
                          <b>{pct(h.stake)}</b>
                        </td>

                        <td className="bar-cell">
                          <div className="micro-bar-bg" title={pct(h.stake) + " equity stake"}>
                            <div className="micro-bar-fill" style={{ width: String(barPercent) + "%" }} />
                          </div>
                        </td>

                        <td className="numeric weight-cell">
                          <b>
                            {h.estimatedValueCrore >= 1000
                              ? "₹" + (h.estimatedValueCrore / 1000).toFixed(2) + "k Cr"
                              : "₹" + h.estimatedValueCrore.toFixed(1) + " Cr"}
                          </b>
                        </td>

                        <td>
                          <span
                            className={
                              "status-badge " +
                              (h.actionType === "positive"
                                ? "positive"
                                : h.actionType === "negative"
                                ? "negative"
                                : "neutral")
                            }
                          >
                            {h.action === "Fresh Entry"
                              ? "✦ Fresh Entry"
                              : h.action === "Accumulated"
                              ? "↑ Accumulated"
                              : h.action === "Trimmed"
                              ? "↓ Trimmed"
                              : "= Steady"}
                          </span>
                        </td>

                        <td className="col-toggle">
                          <button
                            className={"holdings-accordion-btn " + (isExpanded ? "active" : "")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : h.rank);
                            }}
                            aria-expanded={isExpanded}
                          >
                            <span>{isExpanded ? "Hide ▴" : "Thesis ▾"}</span>
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="fund-expanded-row">
                          <td colSpan={8}>
                            <div className="fund-holdings-container">
                              <div className="ace-expanded-thesis">
                                <div className="thesis-header">
                                  <h4>Investment Context & Holding Details</h4>
                                  <span className="fine">Public Filing as of {h.filingQuarter}</span>
                                </div>
                                <p className="thesis-text">{h.actionDetail}</p>
                                <div className="thesis-metrics-row">
                                  <span>
                                    Disclosed Shares: <b>{number(h.shares)}</b>
                                  </span>
                                  <span>
                                    Portfolio Weight (Estimated):{" "}
                                    <b>{pct((h.estimatedValueCrore / totalPortfolioValue) * 100)}</b>
                                  </span>
                                  <span>
                                    Reported Stake: <b>{pct(h.stake)}</b>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards View */
          <div className="fund-grid">
            {filteredHoldings.map((h) => {
              const maxStake = Math.max(...activeInvestor.holdings.map((x) => x.stake), 10);
              const barPercent = Math.min(100, Math.round((h.stake / maxStake) * 100));

              return (
                <article className="fund-card" key={h.rank}>
                  <div className="fund-card-header">
                    <div className="fund-card-serial-wrap">
                      <span className="fund-card-serial">#{String(h.rank).padStart(2, "0")}</span>
                      <span
                        className={
                          "status-badge " +
                          (h.actionType === "positive"
                            ? "positive"
                            : h.actionType === "negative"
                            ? "negative"
                            : "neutral")
                        }
                      >
                        {h.action}
                      </span>
                    </div>
                    <h3 className="fund-card-title">{h.company}</h3>
                    <p className="fund-card-date">NSE: {h.ticker} · {h.sector}</p>
                  </div>

                  <div className="fund-card-metric">
                    <div className="fund-metric-label">
                      <span>Disclosed Equity Stake</span>
                      <b>{pct(h.stake)}</b>
                    </div>
                    <div className="fund-metric-bar">
                      <div className="fund-metric-bar-fill" style={{ width: String(barPercent) + "%" }} />
                    </div>
                  </div>

                  <div className="ace-card-body">
                    <div className="ace-card-kv">
                      <span className="fine">Estimated Holding Value</span>
                      <b className="positive">
                        {h.estimatedValueCrore >= 1000
                          ? "₹" + (h.estimatedValueCrore / 1000).toFixed(2) + "k Cr"
                          : "₹" + h.estimatedValueCrore.toFixed(1) + " Cr"}
                      </b>
                    </div>
                    <div className="ace-card-kv">
                      <span className="fine">Disclosed Shares</span>
                      <b>{number(h.shares)}</b>
                    </div>
                    <div className="ace-card-kv">
                      <span className="fine">Portfolio Share</span>
                      <b>{pct((h.estimatedValueCrore / totalPortfolioValue) * 100)}</b>
                    </div>
                    <p className="ace-card-thesis">{h.actionDetail}</p>
                  </div>

                  <div className="fund-card-footer">
                    <span className="fine">Filing: {h.filingQuarter}</span>
                    <a
                      className="ace-filing-link"
                      href={"https://www.google.com/finance/quote/" + h.ticker + ":NSE"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Stock ↗
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
