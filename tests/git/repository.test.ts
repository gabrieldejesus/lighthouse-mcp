import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("simple-git", () => ({
  simpleGit: vi.fn(() => mockGit),
}));

const mockGit = {
  log: vi.fn(),
  revparse: vi.fn(),
  branchLocal: vi.fn(),
  checkIsRepo: vi.fn(),
};

const {
  getBaseBranch,
  getGitContext,
  isGitRepository,
  getCurrentBranch,
  getCurrentCommit,
  getCommitMessage,
} = await import("../../src/git/repository.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isGitRepository", () => {
  it("returns true when inside a git repo", async () => {
    mockGit.checkIsRepo.mockResolvedValue(true);
    expect(await isGitRepository()).toBe(true);
  });

  it("returns false when not a git repo", async () => {
    mockGit.checkIsRepo.mockRejectedValue(new Error("not a repo"));
    expect(await isGitRepository()).toBe(false);
  });
});

describe("getCurrentBranch", () => {
  it("returns the current branch name", async () => {
    mockGit.branchLocal.mockResolvedValue({ current: "main", all: ["main"] });
    expect(await getCurrentBranch()).toBe("main");
  });

  it("falls back to short SHA on detached HEAD", async () => {
    mockGit.branchLocal.mockResolvedValue({ current: "", all: [] });
    mockGit.revparse.mockResolvedValue("abc1234\n");
    expect(await getCurrentBranch()).toBe("abc1234");
  });

  it("returns (detached) when revparse also fails", async () => {
    mockGit.branchLocal.mockResolvedValue({ current: "", all: [] });
    mockGit.revparse.mockRejectedValue(new Error("no HEAD"));
    expect(await getCurrentBranch()).toBe("(detached)");
  });
});

describe("getCurrentCommit", () => {
  it("returns the full commit SHA", async () => {
    mockGit.revparse.mockResolvedValue("abc1234567890abcdef\n");
    expect(await getCurrentCommit()).toBe("abc1234567890abcdef");
  });

  it("returns (no commits) when repo has no commits", async () => {
    mockGit.revparse.mockRejectedValue(new Error("no commits"));
    expect(await getCurrentCommit()).toBe("(no commits)");
  });
});

describe("getCommitMessage", () => {
  it("returns the commit message", async () => {
    mockGit.log.mockResolvedValue({
      latest: { message: "feat: add new feature" },
    });
    expect(await getCommitMessage("abc1234")).toBe("feat: add new feature");
  });

  it("returns (unknown) when log fails", async () => {
    mockGit.log.mockRejectedValue(new Error("bad commit"));
    expect(await getCommitMessage("bad")).toBe("(unknown)");
  });

  it("returns (unknown) when latest is null", async () => {
    mockGit.log.mockResolvedValue({ latest: null });
    expect(await getCommitMessage("abc")).toBe("(unknown)");
  });
});

describe("getBaseBranch", () => {
  it("returns main when it exists", async () => {
    mockGit.branchLocal.mockResolvedValue({ all: ["main", "feature"] });
    expect(await getBaseBranch()).toBe("main");
  });

  it("returns master when main is absent", async () => {
    mockGit.branchLocal.mockResolvedValue({ all: ["master", "feature"] });
    expect(await getBaseBranch()).toBe("master");
  });

  it("returns unknown when no known base branch found", async () => {
    mockGit.branchLocal.mockResolvedValue({ all: ["feature", "hotfix"] });
    expect(await getBaseBranch()).toBe("unknown");
  });

  it("returns unknown when branchLocal throws", async () => {
    mockGit.branchLocal.mockRejectedValue(new Error("git error"));
    expect(await getBaseBranch()).toBe("unknown");
  });
});

describe("getGitContext", () => {
  it("returns null when not a git repo", async () => {
    mockGit.checkIsRepo.mockResolvedValue(false);
    expect(await getGitContext()).toBeNull();
  });

  it("returns full context when inside a git repo", async () => {
    mockGit.checkIsRepo.mockResolvedValue(true);
    mockGit.branchLocal.mockResolvedValue({
      current: "feature/test",
      all: ["main", "feature/test"],
    });
    mockGit.revparse.mockResolvedValue("abc1234567890\n");
    mockGit.log.mockResolvedValue({ latest: { message: "fix: something" } });

    const ctx = await getGitContext();
    expect(ctx).not.toBeNull();
    expect(ctx?.branch).toBe("feature/test");
    expect(ctx?.commit).toBe("abc1234567890");
    expect(ctx?.baseBranch).toBe("main");
    expect(ctx?.commitMessage).toBe("fix: something");
  });
});
