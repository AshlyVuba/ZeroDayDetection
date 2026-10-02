export type RiskBand = "low" | "medium" | "high";
export type Lang = "en" | "sn" | "nd" | "zu" | "pt" | "sw";
export type ScamType =
  | "job_scam"
  | "phishing"
  | "romance_scam"
  | "mobile_money_reversal"
  | "mule_request"
  | "impersonation"
  | "prize_scam";

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

export interface RecentRiskRecord {
  band: RiskBand;
  timestamp: number;
  scamType?: ScamType;
}
