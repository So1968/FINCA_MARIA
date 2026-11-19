import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const name = `finca-archive-test-${process.pid}`;
const baul = await mkdtemp(path.join(tmpdir(), "finca-archive-api-"));
let server;
let logs = "";
try {
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "--name",
      name,
      "--tmpfs",
      "/var/lib/postgresql/data",
      "-p",
      "127.0.0.1::5432",
      "-e",
      "POSTGRES_PASSWORD=fictitious_archive_test",
      "postgres:16-alpine",
    ],
    { stdio: "pipe" },
  );
  const port = execFileSync("docker", ["port", name, "5432/tcp"], {
    encoding: "utf8",
  })
    .trim()
    .split(":")
    .at(-1);
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      execFileSync(
        "docker",
        ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
        { stdio: "pipe" },
      );
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  const base = "http://127.0.0.1:18533";
  server = spawn(process.execPath, ["server/src/server.js"], {
    env: {
      ...process.env,
      PORT: "18533",
      DATABASE_URL: `postgres://postgres:fictitious_archive_test@127.0.0.1:${port}/postgres`,
      APP_ORIGIN: base,
      COOKIE_SECURE: "false",
      BAUL_ROOT: baul,
      FINCA_BOOTSTRAP_ADMIN_EMAIL: "archive-test@example.test",
      FINCA_BOOTSTRAP_ADMIN_PASSWORD: "Fictitious_archive_test_123456789!",
      FINCA_BOOTSTRAP_ADMIN_NAME: "Test fictif",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      ready = (await fetch(`${base}/healthz`)).ok;
    } catch {}
    if (ready) break;
    if (server.exitCode !== null) throw new Error(logs);
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) throw new Error(`API de test indisponible : ${logs}`);
  const child = spawn(
    process.execPath,
    ["tests/integration/meeting-archives.mjs"],
    {
      env: { ...process.env, FINCA_TEST_URL: base, APP_ORIGIN: base },
      stdio: "inherit",
    },
  );
  const code = await new Promise((r) => child.on("exit", r));
  if (code) throw new Error(`Test API en échec (${code})`);
} finally {
  server?.kill("SIGTERM");
  try {
    execFileSync("docker", ["rm", "-f", name], { stdio: "pipe" });
  } catch {}
  await rm(baul, { recursive: true, force: true });
}
