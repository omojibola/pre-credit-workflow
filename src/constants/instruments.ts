import type { Instrument } from "../types";

const ISSUER_DATA: Array<[string, string, string, string]> = [
  ["Vodafone Group","VOD","TMT","BBB-"],["Barclays PLC","BARC","FIN","BBB+"],
  ["BP Capital Mkt","BP","NRG","A-"],["GSK Finance","GSK","HLT","A"],
  ["National Grid","NGG","UTL","BBB"],["Shell Intl Fin","RDSB","NRG","AA-"],
  ["HSBC Holdings","HSBA","FIN","A-"],["BT Group PLC","BT","TMT","BB+"],
  ["Rolls-Royce","RR","IND","BB"],["Rio Tinto Fin","RIO","MTL","A-"],
  ["Diageo Finance","DGE","CST","A-"],["AstraZeneca","AZN","HLT","A"],
  ["Unilever NV","ULVR","CST","A+"],["Anglo American","AAL","MTL","BBB-"],
  ["Lloyds Banking","LLOY","FIN","BBB+"],["NatWest Group","NWG","FIN","BBB"],
  ["Standard Charter","STAN","FIN","BBB+"],["Centrica PLC","CNA","UTL","BB+"],
  ["Imperial Brands","IMB","CST","BBB-"],["BAE Systems","BA","IND","BBB+"],
  ["Compass Group","CPG","CST","BBB+"],["Severn Trent","SVT","UTL","BBB"],
  ["Legal & General","LGEN","INS","A-"],["Aviva PLC","AV","INS","BBB+"],
  ["Prudential PLC","PRU","INS","A-"],["RELX Group","REL","MDI","BBB+"],
  ["WPP Finance","WPP","MDI","BBB-"],["Reckitt Finance","RKT","HLT","A-"],
  ["Informa PLC","INF","MDI","BBB-"],["Melrose Ind","MRO","IND","BB+"],
];

export const BASE_SPREAD: Record<string, number> = {
  "AA-":35,"A+":42,"A":52,"A-":68,"BBB+":88,"BBB":115,"BBB-":155,"BB+":225,"BB":290,"BB-":380,
};

export const INSTRUMENT_TENORS = ["3Y","5Y","7Y"] as const;

export const INSTRUMENTS: Instrument[] = ISSUER_DATA.flatMap(
  ([issuer, ticker, sector, rating]) =>
    INSTRUMENT_TENORS.map((tenor) => ({
      id: `${ticker}_${tenor}`,
      issuer,
      ticker,
      sector,
      rating,
      tenor,
      baseMid: (BASE_SPREAD[rating] ?? 100) + (Math.random() - 0.5) * 18,
    }))
).slice(0, 80);

export const DESK_DV01_LIMIT = 250_000;
export const TTL_MS          = 30_000;
export const ROW_HEIGHT      = 44;
export const HISTORY_MAX_PTS = 120;
export const AUDIT_MAX_ENTRIES = 500;
