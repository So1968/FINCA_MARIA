import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  stat,
  rm,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
const script = path.resolve("scripts/snapshot-meetings-installation.sh");
test("snapshot privé : copies hors dépôt, fichiers locaux intacts et refus des destinations dangereuses", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "finca-snapshot-test-"));
  const repo = path.join(root, "repo");
  const output = path.join(root, "private");
  try {
    await mkdir(path.join(repo, "app/src/components"), { recursive: true });
    const file = path.join(repo, "app/src/components/FincaMeetingsHub.jsx");
    await writeFile(file, "base fictive");
    execFileSync("git", ["init", "-q"], { cwd: repo });
    execFileSync("git", ["add", "."], { cwd: repo });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.test",
        "commit",
        "-qm",
        "Fixture",
      ],
      { cwd: repo },
    );
    await writeFile(file, "modification locale fictive");
    await writeFile(`${file}.bak-demo`, "copie locale fictive");
    await writeFile(
      path.join(repo, "docker-compose.local.yml"),
      "configuration fictive",
    );
    const result = execFileSync("bash", [script, output], {
      cwd: repo,
      encoding: "utf8",
    });
    assert.ok(!result.includes("modification locale fictive"));
    assert.equal(await readFile(file, "utf8"), "modification locale fictive");
    assert.equal(
      await readFile(
        path.join(output, "app/src/components/FincaMeetingsHub.jsx"),
        "utf8",
      ),
      "modification locale fictive",
    );
    assert.equal(
      await readFile(
        path.join(output, "app/src/components/FincaMeetingsHub.jsx.bak-demo"),
        "utf8",
      ),
      "copie locale fictive",
    );
    assert.equal(
      await readFile(path.join(output, "docker-compose.local.yml"), "utf8"),
      "configuration fictive",
    );
    assert.equal((await stat(output)).mode & 0o777, 0o700);
    assert.throws(() =>
      execFileSync("bash", [script, output], { cwd: repo, stdio: "pipe" }),
    );
    assert.throws(() =>
      execFileSync("bash", [script, path.join(repo, "unsafe")], {
        cwd: repo,
        stdio: "pipe",
      }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
