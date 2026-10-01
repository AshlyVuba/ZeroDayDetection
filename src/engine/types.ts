export type RiskBand = "low" | "medium" | "high";
export type Lang = "en" | "sn" | "nd" | "zu" | "pt" | "sw";

export interface Signal {
  id: string;
  weight: number;
  evidence?: string;
}

export interface RiskResult {
  score: number;
  band: RiskBand;
  signals: Signal[];
  scamType?: string;
}

export interface Transaction {
  id: string;
  recipientId: string;
  amount: number;
  currency: string;
  timestamp: number;
}
