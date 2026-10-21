const { assertLocalTestEnvironment } = require("../scripts/test-environment.cjs");

// Runs before importing the suite, including when Jest is invoked directly.
if (/[\\/]__tests__[\\/](rls|integration)[\\/]/.test(expect.getState().testPath || "")) {
  assertLocalTestEnvironment();
}
