import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function branchToDelete(event, repository) {
  const pr = event.pull_request;
  const defaultBranch = event.repository?.default_branch;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || "")) return null;
  if (event.action !== "closed" || pr?.merged !== true || !defaultBranch) return null;
  if (event.repository?.full_name !== repository || pr.base?.repo?.full_name !== repository || pr.head?.repo?.full_name !== repository) return null;
  if (pr.base.ref !== defaultBranch) return null;
  const branch = pr.head.ref;
  if (typeof branch !== "string" || ["main", "master", defaultBranch].includes(branch)) return null;
  if (!/^[a-f0-9]{40}$/.test(pr.head.sha || "")) return null;
  try { execFileSync("git", ["check-ref-format", `refs/heads/${branch}`], { stdio: "pipe" }); }
  catch { return null; }
  return { branch, sha: pr.head.sha };
}

export function deleteBranchWithLease(remote, { branch, sha }, env = process.env) {
  const cwd = mkdtempSync(path.join(tmpdir(), "finca-branch-cleanup-"));
  const git = (args) => execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    git(["init", "--quiet"]);
    const refs = git(["ls-remote", "--heads", remote, `refs/heads/${branch}`]);
    if (!refs.trim()) return "already-absent";
    if (refs.trim().split(/\s+/)[0] !== sha) return "changed";
    // The lease also rejects a concurrent push between ls-remote and deletion.
    git(["push", `--force-with-lease=refs/heads/${branch}:${sha}`, remote, `:refs/heads/${branch}`]);
    return "deleted";
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function main() {
  if (!process.env.GITHUB_EVENT_PATH) throw new Error("Événement GitHub absent.");
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const candidate = branchToDelete(event, process.env.GITHUB_REPOSITORY);
  if (!candidate) {
    console.log("Aucune branche éligible : suppression ignorée.");
    return;
  }
  if (process.env.GITHUB_SERVER_URL !== "https://github.com") throw new Error("Serveur GitHub non pris en charge.");
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("Jeton de suppression absent.");
  const configIndex = Number(process.env.GIT_CONFIG_COUNT || 0);
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_COUNT: String(configIndex + 1),
    [`GIT_CONFIG_KEY_${configIndex}`]: "http.https://github.com/.extraheader",
    [`GIT_CONFIG_VALUE_${configIndex}`]: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`
  };
  const result = deleteBranchWithLease(`https://github.com/${process.env.GITHUB_REPOSITORY}.git`, candidate, env);
  const messages = {
    deleted: "Branche fusionnée supprimée.",
    changed: "Branche conservée : de nouveaux commits ont été ajoutés depuis la fusion.",
    "already-absent": "Branche déjà supprimée."
  };
  console.log(messages[result]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); }
  catch {
    console.error("Nettoyage interrompu : la branche peut avoir changé ou être protégée. Aucune suppression forcée sans vérification.");
    process.exitCode = 1;
  }
}
