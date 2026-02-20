import { describe, it, expect, vi, beforeEach } from "vitest";

// utils
import { mockLhr } from "../fixtures/mock-lhr.js";

vi.mock("chrome-launcher", () => ({
  launch: vi.fn().mockResolvedValue({
    port: 9222,
    kill: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("lighthouse", () => ({
  default: vi.fn().mockResolvedValue({ lhr: mockLhr }),
}));

const { runAudit } = await import("../../src/lighthouse/runner.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAudit", () => {
  it("returns expected scores from mock LHR", async () => {
    const result = await runAudit({ url: "https://example.com" });
    expect(result.scores.performance).toBe(78);
    expect(result.scores.accessibility).toBe(95);
    expect(result.scores.bestPractices).toBe(83);
    expect(result.scores.seo).toBe(92);
  });

  it("returns expected metrics from mock LHR", async () => {
    const result = await runAudit({ url: "https://example.com" });
    expect(result.metrics.lcp).toBe(2450);
    expect(result.metrics.fcp).toBe(890);
    expect(result.metrics.tbt).toBe(310);
    expect(result.metrics.cls).toBe(0.08);
    expect(result.metrics.speedIndex).toBe(3100);
  });

  it("exposes rawLhr", async () => {
    const result = await runAudit({ url: "https://example.com" });
    expect(result.rawLhr).toBeDefined();
  });

  it("kills Chrome even when lighthouse throws", async () => {
    const { default: lighthouse } = await import("lighthouse");
    const { launch } = await import("chrome-launcher");
    const kill = vi.fn().mockResolvedValue(undefined);
    vi.mocked(launch).mockResolvedValueOnce({ port: 9222, kill } as never);
    vi.mocked(lighthouse).mockRejectedValueOnce(new Error("network error"));

    await expect(runAudit({ url: "https://example.com" })).rejects.toThrow(
      "network error",
    );
    expect(kill).toHaveBeenCalledOnce();
  });

  it("throws a readable error when Chrome fails to launch", async () => {
    const { launch } = await import("chrome-launcher");
    vi.mocked(launch).mockRejectedValueOnce(new Error("Chrome not found"));

    await expect(runAudit({ url: "https://example.com" })).rejects.toThrow(
      "Chrome could not be launched",
    );
  });

  it("throws when lighthouse returns a runtimeError", async () => {
    const { default: lighthouse } = await import("lighthouse");
    vi.mocked(lighthouse).mockResolvedValueOnce({
      lhr: {
        ...mockLhr,
        runtimeError: { code: "NO_FCP", message: "Page failed to load" },
      },
    } as never);

    await expect(runAudit({ url: "https://example.com" })).rejects.toThrow(
      "Lighthouse runtime error (NO_FCP)",
    );
  });
});

