import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const root = path.resolve(import.meta.dirname, "../..");
const appRequire = createRequire(path.join(root, "app/package.json"));
const { createServer } = await import(pathToFileURL(appRequire.resolve("vite")));
const { default: react } = await import(pathToFileURL(appRequire.resolve("@vitejs/plugin-react")));
const name = `finca-integration-test-${process.pid}`;
const baul = await mkdtemp(path.join(tmpdir(), "finca-integration-api-"));
const origin = "http://127.0.0.1:18535", api = "http://127.0.0.1:18534";
let server, web, logs = "";
try {
  execFileSync("docker", ["run", "--rm", "-d", "--name", name, "--tmpfs", "/var/lib/postgresql/data", "-p", "127.0.0.1::5432", "-e", "POSTGRES_PASSWORD=fictitious_integration_test", "postgres:16-alpine"], { stdio: "pipe" });
  const port = execFileSync("docker", ["port", name, "5432/tcp"], { encoding: "utf8" }).trim().split(":").at(-1);
  let ready = false;
  for (let i = 0; i < 100; i++) { try { execFileSync("docker", ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { stdio: "pipe" }); ready = true; break; } catch { await new Promise(r => setTimeout(r, 200)); } }
  assert.ok(ready);
  const testEnv = { ...process.env, FINCA_RUNTIME_TEST: "1", FINCA_TEST_URL: origin, APP_ORIGIN: origin, FINCA_BOOTSTRAP_ADMIN_EMAIL: "integration-test@example.test", FINCA_BOOTSTRAP_ADMIN_PASSWORD: "Fictitious_integration_test_123456789!", FINCA_BOOTSTRAP_ADMIN_NAME: "Intégration fictive" };
  server = spawn(process.execPath, ["server/src/server.js"], { cwd: root, env: { ...testEnv, PORT: "18534", DATABASE_URL: `postgres://postgres:fictitious_integration_test@127.0.0.1:${port}/postgres`, COOKIE_SECURE: "false", BAUL_ROOT: baul }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", d => { logs += d; }); server.stderr.on("data", d => { logs += d; });
  ready = false;
  for (let i = 0; i < 100; i++) { try { ready = (await fetch(`${api}/healthz`)).ok; } catch {} if (ready) break; if (server.exitCode !== null) throw new Error(logs); await new Promise(r => setTimeout(r, 200)); }
  assert.ok(ready, logs);
  web = await createServer({ configFile: false, root: path.join(root, "app"), plugins: [react()], define: { "import.meta.env.VITE_FINCA_SERVER_MODE": '"1"' }, server: { host: "127.0.0.1", port: 18535, strictPort: true, proxy: { "/api": api } } });
  await web.listen();
  const login = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ email: testEnv.FINCA_BOOTSTRAP_ADMIN_EMAIL, password: testEnv.FINCA_BOOTSTRAP_ADMIN_PASSWORD }) });
  assert.equal(login.status, 200); testEnv.FINCA_TEST_COOKIE = login.headers.get("set-cookie").split(";")[0];
  for (const file of ["tests/integration/reservations-concurrency.mjs", "tests/browser/earth-server.mjs"]) {
    const child = spawn(process.execPath, [file], { cwd: root, env: testEnv, stdio: "inherit" });
    assert.equal(await new Promise(resolve => child.on("exit", resolve)), 0, file);
  }
} finally {
  await web?.close(); server?.kill("SIGTERM");
  try { execFileSync("docker", ["rm", "-f", name], { stdio: "pipe" }); } catch {}
  await rm(baul, { recursive: true, force: true });
}
