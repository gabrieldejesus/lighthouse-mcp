import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

// types
import { AuditRow, AuditComparison, AuditResult } from "./types.js";

const LIGHTHOUSE_DIR = path.join(os.homedir(), ".lighthouse-mcp");
const RESULTS_DIR = path.join(LIGHTHOUSE_DIR, "results");
const DB_PATH = path.join(LIGHTHOUSE_DIR, "audits.db");

const SCHEMA = `
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
`;

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

const computeDelta = (a: number | null, b: number | null): number | null => {
  if (a === null || b === null) return null;
  return b - a;
};

export const createDatabase = (dbPath = DB_PATH, resultsDir = RESULTS_DIR) => {
  const isMemory = dbPath === ":memory:";

  if (!isMemory) {
    fs.mkdirSync(LIGHTHOUSE_DIR, { recursive: true });
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.exec(SCHEMA);

  const updateFullResultPath = (id: number, fullResultPath: string): void => {
    db.prepare("UPDATE audits SET full_result_path = ? WHERE id = ?").run(
      fullResultPath,
      id,
    );
  };

  const saveFullResult = (auditId: number, result: unknown): string => {
    if (isMemory) return `<memory:${auditId}>`;
    const filename = `${auditId}-${Date.now()}.json`;
    const filePath = path.join(resultsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");
    return filePath;
  };

  const saveAudit = (audit: Omit<AuditResult, "id">): AuditResult => {
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

  const getAudit = (id: number): AuditResult => {
    const row = db.prepare("SELECT * FROM audits WHERE id = ?").get(id) as
      | AuditRow
      | undefined;

    if (!row) throw new Error(`Audit with id ${id} not found`);
    return rowToAuditResult(row);
  };

  const getLatestAudit = (url: string, branch?: string): AuditResult | null => {
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

  const getAuditHistory = (
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

  const compareAudits = (
    auditAId: number,
    auditBId: number,
  ): AuditComparison => {
    const baseline = getAudit(auditAId);
    const current = getAudit(auditBId);

    return {
      current,
      baseline,
      deltas: {
        lcp: computeDelta(baseline.lcp, current.lcp),
        fcp: computeDelta(baseline.fcp, current.fcp),
        tbt: computeDelta(baseline.tbt, current.tbt),
        cls: computeDelta(baseline.cls, current.cls),
        seoScore: computeDelta(baseline.seoScore, current.seoScore),
        speedIndex: computeDelta(baseline.speedIndex, current.speedIndex),
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
      },
    };
  };

  return {
    getAudit,
    saveAudit,
    compareAudits,
    saveFullResult,
    getLatestAudit,
    getAuditHistory,
    updateFullResultPath,
  };
};

const defaultDb = createDatabase();

export const {
  saveAudit,
  getAudit,
  compareAudits,
  saveFullResult,
  getLatestAudit,
  getAuditHistory,
  updateFullResultPath,
} = defaultDb;
