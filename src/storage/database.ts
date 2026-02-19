import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

// types
import { AuditRow, AuditComparison, AuditResult } from "./types.js";

const PULSE_DIR = path.join(os.homedir(), ".pulse");
const RESULTS_DIR = path.join(PULSE_DIR, "results");
const DB_PATH = path.join(PULSE_DIR, "audits.db");

const rowToAuditResult = (row: AuditRow): AuditResult => ({
  id: row.id,
  url: row.url,
  lcp: row.lcp,
  fcp: row.fcp,
  tbt: row.tbt,
  cls: row.cls,
  seoScore: row.seo_score,
  timestamp: row.timestamp,
  gitCommit: row.git_commit,
  gitBranch: row.git_branch,
  speedIndex: row.speed_index,
  fullResultPath: row.full_result_path,
  performanceScore: row.performance_score,
  accessibilityScore: row.accessibility_score,
  bestPracticesScore: row.best_practices_score,
});

const initDatabase = (): Database.Database => {
  fs.mkdirSync(PULSE_DIR, { recursive: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      url                  TEXT NOT NULL,
      timestamp            INTEGER NOT NULL,
      lcp                  REAL,
      fcp                  REAL,
      tbt                  REAL,
      cls                  REAL,
      speed_index          REAL,
      full_result_path     TEXT,
      git_commit           TEXT,
      git_branch           TEXT,
      performance_score    INTEGER,
      accessibility_score  INTEGER,
      best_practices_score INTEGER,
      seo_score            INTEGER
    )
  `);

  return db;
};

const db = initDatabase();

export const updateFullResultPath = (
  id: number,
  fullResultPath: string,
): void => {
  db.prepare("UPDATE audits SET full_result_path = ? WHERE id = ?").run(
    fullResultPath,
    id,
  );
};

export const saveFullResult = (auditId: number, result: unknown): string => {
  const filename = `${auditId}-${Date.now()}.json`;
  const filePath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");
  return filePath;
};

export const saveAudit = (audit: Omit<AuditResult, "id">): AuditResult => {
  const stmt = db.prepare(`
    INSERT INTO audits (
      url, timestamp, git_commit, git_branch,
      performance_score, accessibility_score, best_practices_score, seo_score,
      lcp, fcp, tbt, cls, speed_index, full_result_path
    ) VALUES (
      @url, @timestamp, @gitCommit, @gitBranch,
      @performanceScore, @accessibilityScore, @bestPracticesScore, @seoScore,
      @lcp, @fcp, @tbt, @cls, @speedIndex, @fullResultPath
    )
  `);

  const result = stmt.run(audit);
  const id = result.lastInsertRowid as number;

  return { id, ...audit };
};

export const getAudit = (id: number): AuditResult => {
  const row = db.prepare("SELECT * FROM audits WHERE id = ?").get(id) as
    | AuditRow
    | undefined;

  if (!row) {
    throw new Error(`Audit with id ${id} not found`);
  }

  return rowToAuditResult(row);
};

export const getLatestAudit = (
  url: string,
  branch?: string,
): AuditResult | null => {
  const row = branch
    ? (db
        .prepare(
          "SELECT * FROM audits WHERE url = ? AND git_branch = ? ORDER BY timestamp DESC LIMIT 1",
        )
        .get(url, branch) as AuditRow | undefined)
    : (db
        .prepare(
          "SELECT * FROM audits WHERE url = ? ORDER BY timestamp DESC LIMIT 1",
        )
        .get(url) as AuditRow | undefined);

  return row ? rowToAuditResult(row) : null;
};

export const getAuditHistory = (
  url: string,
  limit: number,
  branch?: string,
): AuditResult[] => {
  const rows = branch
    ? (db
        .prepare(
          "SELECT * FROM audits WHERE url = ? AND git_branch = ? ORDER BY timestamp DESC LIMIT ?",
        )
        .all(url, branch, limit) as AuditRow[])
    : (db
        .prepare(
          "SELECT * FROM audits WHERE url = ? ORDER BY timestamp DESC LIMIT ?",
        )
        .all(url, limit) as AuditRow[]);

  return rows.map(rowToAuditResult);
};

const computeDelta = (a: number | null, b: number | null): number | null => {
  if (a === null || b === null) return null;
  return b - a;
};

export const compareAudits = (
  auditAId: number,
  auditBId: number,
): AuditComparison => {
  const baseline = getAudit(auditAId);
  const current = getAudit(auditBId);

  return {
    current,
    baseline,
    deltas: {
      performanceScore: computeDelta(
        baseline.performanceScore,
        current.performanceScore,
      ),
      accessibilityScore: computeDelta(
        baseline.accessibilityScore,
        current.accessibilityScore,
      ),
      bestPracticesScore: computeDelta(
        baseline.bestPracticesScore,
        current.bestPracticesScore,
      ),
      lcp: computeDelta(baseline.lcp, current.lcp),
      fcp: computeDelta(baseline.fcp, current.fcp),
      tbt: computeDelta(baseline.tbt, current.tbt),
      cls: computeDelta(baseline.cls, current.cls),
      seoScore: computeDelta(baseline.seoScore, current.seoScore),
      speedIndex: computeDelta(baseline.speedIndex, current.speedIndex),
    },
  };
};
