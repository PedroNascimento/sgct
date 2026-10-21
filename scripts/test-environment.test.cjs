const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assertLocalTestEnvironment } = require("./test-environment.cjs");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const local = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-fixture",
  SUPABASE_SERVICE_ROLE_KEY: "local-service-fixture",
};

test("accepts explicitly configured local database origins", () => {
  for (const origin of ["http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:54321"]) {
    assert.equal(assertLocalTestEnvironment({ ...local, NEXT_PUBLIC_SUPABASE_URL: origin }), origin);
  }
});

test("rejects remote origins and misleading localhost names before clients are created", () => {
  for (const origin of ["https://example.supabase.co", "http://localhost.evil.test:54321", "http://127.0.0.1.evil.test", "http://localhost@remote.test", "file:///localhost", "http://localhost:54321?target=remote", "http://localhost:54321/redirect", "http://127.0.0.2:54321"]) {
    assert.throws(() => assertLocalTestEnvironment({ ...local, NEXT_PUBLIC_SUPABASE_URL: origin }), /bloqueados/);
  }
});

test("rejects missing URL or credentials without echoing secrets", () => {
  for (const key of Object.keys(local)) {
    const env = { ...local, [key]: "" };
    assert.throws(() => assertLocalTestEnvironment(env), (error) => {
      assert.match(error.message, /bloqueados/);
      assert.ok(!error.message.includes(local.SUPABASE_SERVICE_ROLE_KEY));
      return true;
    });
  }
});

test("database runner rejects remote target before invoking the suite", () => {
  const result = spawnSync(process.execPath, [resolve(__dirname, "run-database-tests.cjs"), "all"], {
    env: { ...process.env, ...local, NEXT_PUBLIC_SUPABASE_URL: "https://blocked.invalid" }, encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /somente uma origem loopback/);
});

test("direct Jest invocation also rejects remote target before importing integration tests", () => {
  // This integration suite is entirely mocked, so a regression cannot reach a real database.
  const result = spawnSync(process.execPath, [resolve(__dirname, "../node_modules/jest/bin/jest.js"), "--runInBand", "--selectProjects", "node", "--runTestsByPath", resolve(__dirname, "../src/__tests__/integration/middleware.test.ts"), "--silent"], {
    cwd: resolve(__dirname, ".."), env: { ...process.env, ...local, NEXT_PUBLIC_SUPABASE_URL: "https://blocked.invalid" }, encoding: "utf8", timeout: 30000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /somente uma origem loopback/);
});
