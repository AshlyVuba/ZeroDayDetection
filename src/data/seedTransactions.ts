import type { Transaction } from "../engine/types";

const weekOne = Date.UTC(2025, 0, 1);
const day = 24 * 60 * 60 * 1_000;

export const seedTransactions: readonly Transaction[] = [
  {
    id: "seed-tx-01",
    recipientId: "+27 71 234 5678",
    amount: 180,
    currency: "ZAR",
    timestamp: weekOne,
  },
  {
    id: "seed-tx-02",
    recipientId: "082 345 6789",
    amount: 250,
    currency: "ZAR",
    timestamp: weekOne + 2 * day,
  },
  {
    id: "seed-tx-03",
    recipientId: "0712345678",
    amount: 320,
    currency: "ZAR",
    timestamp: weekOne + 6 * day,
  },
  {
    id: "seed-tx-04",
    recipientId: "+27 (82) 345-6789",
    amount: 150,
    currency: "ZAR",
    timestamp: weekOne + 9 * day,
  },
  {
    id: "seed-tx-05",
    recipientId: "+27 71 234 5678",
    amount: 400,
    currency: "ZAR",
    timestamp: weekOne + 13 * day,
  },
  {
    id: "seed-tx-06",
    recipientId: "0823456789",
    amount: 275,
    currency: "ZAR",
    timestamp: weekOne + 16 * day,
  },
  {
    id: "seed-tx-07",
    recipientId: "071 234 5678",
    amount: 200,
    currency: "ZAR",
    timestamp: weekOne + 20 * day,
  },
  {
    id: "seed-tx-08",
    recipientId: "+27 82 345 6789",
    amount: 350,
    currency: "ZAR",
    timestamp: weekOne + 23 * day,
  },
  {
    id: "seed-tx-09",
    recipientId: "+27 71 234 5678",
    amount: 300,
    currency: "ZAR",
    timestamp: weekOne + 27 * day,
  },
  {
    id: "seed-tx-10",
    recipientId: "082 345 6789",
    amount: 175,
    currency: "ZAR",
    timestamp: weekOne + 30 * day,
  },
  {
    id: "seed-tx-11",
    recipientId: "0712345678",
    amount: 225,
    currency: "ZAR",
    timestamp: weekOne + 34 * day,
  },
  {
    id: "seed-tx-12",
    recipientId: "+27 (82) 345-6789",
    amount: 390,
    currency: "ZAR",
    timestamp: weekOne + 42 * day,
  },
];
