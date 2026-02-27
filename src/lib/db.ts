import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "store");
const DB_PATH = path.join(DB_DIR, "xray.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      bolt11 TEXT NOT NULL,
      payment_hash TEXT NOT NULL,
      amount_sats INTEGER NOT NULL,
      params_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result_html TEXT,
      created_at INTEGER NOT NULL,
      paid_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_hash ON invoices (payment_hash);
  `);
  return _db;
}

export interface Invoice {
  id: string;
  bolt11: string;
  payment_hash: string;
  amount_sats: number;
  params_json: string;
  status: "pending" | "paid" | "complete" | "failed";
  result_html: string | null;
  created_at: number;
  paid_at: number | null;
}

export function createInvoice(
  invoice: Omit<Invoice, "status" | "result_html" | "paid_at">
): void {
  getDb()
    .prepare(
      `INSERT INTO invoices (id, bolt11, payment_hash, amount_sats, params_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(
      invoice.id,
      invoice.bolt11,
      invoice.payment_hash,
      invoice.amount_sats,
      invoice.params_json,
      invoice.created_at
    );
}

export function getInvoice(id: string): Invoice | null {
  return getDb()
    .prepare("SELECT * FROM invoices WHERE id = ?")
    .get(id) as Invoice | null;
}

export function getInvoiceByPaymentHash(paymentHash: string): Invoice | null {
  return getDb()
    .prepare("SELECT * FROM invoices WHERE payment_hash = ?")
    .get(paymentHash) as Invoice | null;
}

export function markPaid(id: string): void {
  getDb()
    .prepare(
      `UPDATE invoices SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'pending'`
    )
    .run(Math.floor(Date.now() / 1000), id);
}

export function markComplete(id: string, html: string): void {
  getDb()
    .prepare(`UPDATE invoices SET status = 'complete', result_html = ? WHERE id = ?`)
    .run(html, id);
}

export function markFailed(id: string): void {
  getDb()
    .prepare(`UPDATE invoices SET status = 'failed' WHERE id = ?`)
    .run(id);
}
