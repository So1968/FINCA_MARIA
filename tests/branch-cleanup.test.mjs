import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { branchToDelete, deleteBranchWithLease } from "../scripts/cleanup-merged-branch.mjs";

const repo = "So1968/FINCA_MARIA";
function event() {
  return {
    action: "closed", repository: { full_name: repo, default_branch: "main" },
    pull_request: { merged: true, base: { ref: "main", repo: { full_name: repo } }, head: { ref: "fix/example", sha: "a".repeat(40), repo: { full_name: repo } } }
  };
}

test("seule une branche interne fusionnée dans la branche par défaut est éligible", () => {
  assert.deepEqual(branchToDelete(event(), repo), { branch: "fix/example", sha: "a".repeat(40) });
  for (const change of [
    (e) => { e.action = "opened"; },
    (e) => { e.pull_request.merged = false; },
    (e) => { e.pull_request.head.repo.full_name = "fork/FINCA_MARIA"; },
    (e) => { e.pull_request.head.repo = null; },
    (e) => { e.pull_request.base.repo.full_name = "other/repo"; },
    (e) => { e.pull_request.base.ref = "integration"; },
    (e) => { e.pull_request.head.ref = "main"; },
    (e) => { e.pull_request.head.ref = "master"; },
    (e) => { e.pull_request.head.ref = "invalid..ref"; },
    (e) => { e.pull_request.head.sha = "invalid"; }
  ]) {
    const e = event(); change(e);
    assert.equal(branchToDelete(e, repo), null);
  }
  const custom = event();
  custom.repository.default_branch = "production";
  custom.pull_request.base.ref = "production";
  custom.pull_request.head.ref = "production";
  assert.equal(branchToDelete(custom, repo), null);
});

test("suppression Git réelle : branche fusionnée supprimée, branche modifiée et main conservées", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "finca-cleanup-test-"));
  const git = (args) => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    git(["init", "--bare", "remote.git"]);
    git(["init", "--initial-branch=main", "work"]);
    const work = (...args) => git(["-C", "work", ...args]);
    work("-c", "user.name=Test", "-c", "user.email=test@example.test", "commit", "--allow-empty", "-m", "initial");
    const first = work("rev-parse", "HEAD");
    work("branch", "fix/merged");
    work("branch", "fix/new-work");
    work("push", "../remote.git", "main", "fix/merged", "fix/new-work");
    const remote = path.join(dir, "remote.git");
    assert.equal(deleteBranchWithLease(remote, { branch: "fix/merged", sha: first }), "deleted");
    assert.equal(deleteBranchWithLease(remote, { branch: "fix/merged", sha: first }), "already-absent");
    work("switch", "fix/new-work");
    work("-c", "user.name=Test", "-c", "user.email=test@example.test", "commit", "--allow-empty", "-m", "new work");
    work("push", "../remote.git", "fix/new-work");
    assert.equal(deleteBranchWithLease(remote, { branch: "fix/new-work", sha: first }), "changed");
    const refs = git(["ls-remote", "--heads", remote]);
    assert.ok(refs.includes("refs/heads/main"));
    assert.ok(refs.includes("refs/heads/fix/new-work"));
    assert.ok(!refs.includes("refs/heads/fix/merged"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
