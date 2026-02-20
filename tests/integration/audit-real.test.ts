import { describe, it, expect } from "vitest";
import { runAudit } from "../../src/lighthouse/runner.js";

const TEST_URL = process.env.TEST_URL ?? "https://telfar.net";

describe("runAudit — real website", () => {
  it(`audits ${TEST_URL} with real Chrome`, async () => {
    const result = await runAudit({
      url: TEST_URL,
      categories: ["performance"],
    });

    expect(result.scores.performance).not.toBeNull();
    expect(result.scores.performance).toBeGreaterThan(0);
    expect(result.scores.performance).toBeLessThanOrEqual(100);

    expect(result.metrics.lcp).not.toBeNull();
    expect(result.metrics.fcp).not.toBeNull();
    expect(result.rawLhr).toBeDefined();
  }, 120_000);
});
