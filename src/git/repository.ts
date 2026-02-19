import { simpleGit } from "simple-git";

// types
import { GitContext } from "./types.js";

const BASE_BRANCH_CANDIDATES = ["main", "master", "develop", "staging"];

const git = () => simpleGit(process.cwd());

export const isGitRepository = async (): Promise<boolean> => {
  try {
    return await git().checkIsRepo();
  } catch {
    return false;
  }
};

export const getCurrentBranch = async (): Promise<string> => {
  const summary = await git().branchLocal();

  if (summary.current) {
    return summary.current;
  }

  try {
    const sha = await git().revparse(["--short", "HEAD"]);
    return sha.trim();
  } catch {
    return "(detached)";
  }
};

export const getCurrentCommit = async (): Promise<string> => {
  try {
    const sha = await git().revparse(["HEAD"]);
    return sha.trim();
  } catch {
    return "(no commits)";
  }
};

export const getCommitMessage = async (commit: string): Promise<string> => {
  try {
    const log = await git().log(["-1", commit]);
    return log.latest?.message ?? "(unknown)";
  } catch {
    return "(unknown)";
  }
};

export const getBaseBranch = async (): Promise<string> => {
  try {
    const summary = await git().branchLocal();
    const found = BASE_BRANCH_CANDIDATES.find((b) => summary.all.includes(b));

    return found ?? "unknown";
  } catch {
    return "unknown";
  }
};

export const getGitContext = async (): Promise<GitContext | null> => {
  const isRepo = await isGitRepository();

  if (!isRepo) {
    return null;
  }

  const [branch, commit, baseBranch] = await Promise.all([
    getCurrentBranch(),
    getCurrentCommit(),
    getBaseBranch(),
  ]);

  const commitMessage = await getCommitMessage(commit);

  return {
    branch,
    commit,
    baseBranch,
    commitMessage,
  };
};
