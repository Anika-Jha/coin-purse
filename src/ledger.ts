import Database from "better-sqlite3";

let db: Database.Database | undefined;

function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const databasePath =
    process.env.LEDGER_PATH ?? "./data/ledger.db";

  db = new Database(databasePath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      seller TEXT NOT NULL,
      url TEXT NOT NULL,
      network TEXT NOT NULL,
      asset TEXT NOT NULL,
      amount_base_units TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT NOT NULL,
      tx_hash TEXT
    )
  `);

  return db;
}

export interface PaymentDecisionRecord {
  seller: string;
  url: string;
  network: string;
  asset: string;
  amountBaseUnits: bigint;
  decision: "paid" | "refused";
  reason: string;
  txHash?: string;
}

export function recordDecision(
  record: PaymentDecisionRecord,
): void {
  getDatabase()
    .prepare(`
      INSERT INTO payment_decisions (
        timestamp,
        seller,
        url,
        network,
        asset,
        amount_base_units,
        decision,
        reason,
        tx_hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      new Date().toISOString(),
      record.seller,
      record.url,
      record.network,
      record.asset,
      record.amountBaseUnits.toString(),
      record.decision,
      record.reason,
      record.txHash ?? null,
    );
}

export function getTotalSpent(): bigint {
  const rows = getDatabase()
    .prepare(`
      SELECT amount_base_units
      FROM payment_decisions
      WHERE decision = 'paid'
    `)
    .all() as Array<{
      amount_base_units: string;
    }>;

  return rows.reduce(
    (total, row) =>
      total + BigInt(row.amount_base_units),
    0n,
  );
}

export function getDecisions() {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM payment_decisions
      ORDER BY id ASC
    `)
    .all();
}

export function closeLedger(): void {
  if (db) {
    db.close();
    db = undefined;
  }
}