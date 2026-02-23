import type { Dealer } from "../types";

export const DEALERS: Dealer[] = [
  { id:"MS",   name:"Morgan Stanley", color:"#60a5fa", responseRate:0.92, speedMs:[600,1800],  axisBias:0.98 },
  { id:"GS",   name:"Goldman Sachs",  color:"#4ade80", responseRate:0.88, speedMs:[800,2200],  axisBias:1.01 },
  { id:"JPM",  name:"JP Morgan",      color:"#fbbf24", responseRate:0.95, speedMs:[400,1600],  axisBias:0.99 },
  { id:"BAML", name:"BofA Sec",       color:"#f87171", responseRate:0.85, speedMs:[900,2500],  axisBias:1.02 },
  { id:"CITI", name:"Citigroup",      color:"#a78bfa", responseRate:0.82, speedMs:[700,2100],  axisBias:1.00 },
  { id:"UBS",  name:"UBS AG",         color:"#fb923c", responseRate:0.78, speedMs:[1000,2800], axisBias:0.97 },
  { id:"BNPP", name:"BNP Paribas",    color:"#22d3ee", responseRate:0.80, speedMs:[800,2400],  axisBias:1.01 },
  { id:"DB",   name:"Deutsche Bank",  color:"#e2b96b", responseRate:0.90, speedMs:[500,1700],  axisBias:0.99 },
];
