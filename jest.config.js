/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: "node",
      testEnvironment: "node",
      // Carrega .env.local para os testes RLS que precisam das credenciais do banco
      setupFiles: ["<rootDir>/src/jest.setup.global.js"],
      setupFilesAfterEnv: ["<rootDir>/src/jest.integration-guard.js"],
      testMatch: [
        "<rootDir>/src/**/__tests__/rls/**/*.test.ts",
        "<rootDir>/src/**/__tests__/integration/**/*.test.ts",
        "<rootDir>/src/**/__tests__/unit/**/*.test.ts",
        "<rootDir>/src/use-cases/**/*.test.ts",
        "<rootDir>/src/domain/**/*.test.ts",
        "<rootDir>/src/infrastructure/**/*.test.ts",
      ],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.jest.json" }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
    {
      displayName: "jsdom",
      testEnvironment: "jsdom",
      testMatch: [
        "<rootDir>/src/**/__tests__/components/**/*.test.tsx",
      ],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.jest.json" }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFilesAfterEnv: ["<rootDir>/src/jest.setup.ts"],
    },
  ],
  collectCoverageFrom: [
    "src/use-cases/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
    "./src/use-cases/": {
      statements: 90,
      branches: 70,
      functions: 90,
      lines: 90,
    },
  },
};

module.exports = config;
