import { describe, it, expect, beforeEach } from "vitest";

// utils
import { createDatabase } from "../../src/storage/database.js";
import { mockAuditBase, mockAuditImproved } from "../fixtures/mock-audit.js";

const makeDb = () => createDatabase(":memory:");

describe("saveAudit", () => {
  it("returns the saved audit with a generated id", () => {
    const db = makeDb();
    const result = db.saveAudit(mockAuditBase);

    expect(result.id).toBe(1);
    expect(result.url).toBe(mockAuditBase.url);
    expect(result.performanceScore).toBe(78);
  });

  it("auto-increments id on each save", () => {
    const db = makeDb();
    const a = db.saveAudit(mockAuditBase);
    const b = db.saveAudit(mockAuditBase);

    expect(b.id).toBe(a.id + 1);
  });
});

describe("getAudit", () => {
  it("returns the saved audit by id", () => {
    const db = makeDb();
    const saved = db.saveAudit(mockAuditBase);
    const retrieved = db.getAudit(saved.id);

    expect(retrieved.url).toBe(mockAuditBase.url);
    expect(retrieved.performanceScore).toBe(78);
    expect(retrieved.lcp).toBe(2450);
  });

  it("throws for a non-existent id", () => {
    const db = makeDb();
    expect(() => db.getAudit(999)).toThrow("Audit with id 999 not found");
  });
});

describe("getLatestAudit", () => {
  it("returns null when no audits exist for the URL", () => {
    const db = makeDb();
    expect(db.getLatestAudit("https://example.com")).toBeNull();
  });

  it("returns the most recent audit for a URL", () => {
    const db = makeDb();
    db.saveAudit({ ...mockAuditBase, timestamp: 1000 });
    db.saveAudit({ ...mockAuditBase, timestamp: 3000 });
    db.saveAudit({ ...mockAuditBase, timestamp: 2000 });
    const latest = db.getLatestAudit("https://example.com");
    expect(latest?.timestamp).toBe(3000);
  });

  it("filters by branch when provided", () => {
    const db = makeDb();
    db.saveAudit({ ...mockAuditBase, gitBranch: "main", timestamp: 1000 });
    db.saveAudit({ ...mockAuditBase, gitBranch: "feature", timestamp: 2000 });
    const latest = db.getLatestAudit("https://example.com", "main");
    expect(latest?.gitBranch).toBe("main");
    expect(latest?.timestamp).toBe(1000);
  });

  it("returns null when no audit matches the branch", () => {
    const db = makeDb();
    db.saveAudit({ ...mockAuditBase, gitBranch: "main" });
    expect(db.getLatestAudit("https://example.com", "feature")).toBeNull();
  });
});

describe("getAuditHistory", () => {
  it("returns empty array when no audits", () => {
    const db = makeDb();
    expect(db.getAuditHistory("https://example.com", 10)).toEqual([]);
  });

  it("returns audits ordered by timestamp DESC", () => {
    const db = makeDb();
    db.saveAudit({ ...mockAuditBase, timestamp: 1000 });
    db.saveAudit({ ...mockAuditBase, timestamp: 3000 });
    db.saveAudit({ ...mockAuditBase, timestamp: 2000 });
    const history = db.getAuditHistory("https://example.com", 10);
    expect(history[0].timestamp).toBe(3000);
    expect(history[1].timestamp).toBe(2000);
    expect(history[2].timestamp).toBe(1000);
  });

  it("respects the limit", () => {
    const db = makeDb();
    for (let i = 0; i < 5; i++) {
      db.saveAudit({ ...mockAuditBase, timestamp: i * 1000 });
    }
    expect(db.getAuditHistory("https://example.com", 3)).toHaveLength(3);
  });

  it("filters by branch", () => {
    const db = makeDb();
    db.saveAudit({ ...mockAuditBase, gitBranch: "main" });
    db.saveAudit({ ...mockAuditBase, gitBranch: "main" });
    db.saveAudit({ ...mockAuditBase, gitBranch: "feature" });
    const history = db.getAuditHistory("https://example.com", 10, "main");
    expect(history).toHaveLength(2);
    expect(history.every((a) => a.gitBranch === "main")).toBe(true);
  });
});

describe("compareAudits", () => {
  it("returns correct deltas between two audits", () => {
    const db = makeDb();
    const baseline = db.saveAudit(mockAuditBase);
    const current = db.saveAudit(mockAuditImproved);
    const comparison = db.compareAudits(baseline.id, current.id);

    expect(comparison.baseline.id).toBe(baseline.id);
    expect(comparison.current.id).toBe(current.id);
    expect(comparison.deltas.performanceScore).toBe(10);
    expect(comparison.deltas.lcp).toBe(1800 - 2450);
    expect(comparison.deltas.tbt).toBe(150 - 310);
  });

  it("returns null delta when either value is null", () => {
    const db = makeDb();
    const a = db.saveAudit({ ...mockAuditBase, performanceScore: null });
    const b = db.saveAudit({ ...mockAuditBase, performanceScore: 80 });
    const comparison = db.compareAudits(a.id, b.id);

    expect(comparison.deltas.performanceScore).toBeNull();
  });

  it("throws when a referenced audit does not exist", () => {
    const db = makeDb();
    const saved = db.saveAudit(mockAuditBase);

    expect(() => db.compareAudits(saved.id, 999)).toThrow();
  });
});

describe("updateFullResultPath", () => {
  it("updates the fullResultPath of a saved audit", () => {
    const db = makeDb();
    const saved = db.saveAudit(mockAuditBase);
    expect(saved.fullResultPath).toBeNull();
    db.updateFullResultPath(saved.id, "/tmp/result.json");
    const updated = db.getAudit(saved.id);
    expect(updated.fullResultPath).toBe("/tmp/result.json");
  });
});
