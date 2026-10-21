const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { assertLocalTestEnvironment, loadTestEnvironment } = require("./test-environment.cjs");

loadTestEnvironment();
try {
  assertLocalTestEnvironment();
  const scopes = { all: "__tests__/(rls|integration)/", rls: "__tests__/rls/", integration: "__tests__/integration/" };
  const scope = process.argv[2] || "all";
  if (!Object.hasOwn(scopes, scope)) throw new Error("Escopo de teste inválido: use all, rls ou integration.");
  const result = spawnSync(process.execPath, [resolve(__dirname, "../node_modules/jest/bin/jest.js"), "--runInBand", "--selectProjects", "node", `--testPathPattern=${scopes[scope]}`, "--no-coverage", ...process.argv.slice(3)], {
    cwd: resolve(__dirname, ".."), env: process.env, stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
