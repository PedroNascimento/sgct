/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: "node",
      testEnvironment: "node",
      // Carrega .env.local para os testes RLS que precisam das credenciais do banco
      setupFiles: ["<rootDir>/src/jest.setup.global.js"],
      testMatch: [
        "<rootDir>/src/**/__tests__/rls/**/*.test.ts",
        "<rootDir>/src/**/__tests__/integration/**/*.test.ts",
        "<rootDir>/src/use-cases/**/*.test.ts",
        "<rootDir>/src/domain/**/*.test.ts",
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
      setupFilesAfterFramework: ["<rootDir>/src/jest.setup.ts"],
    },
  ],
  collectCoverageFrom: [
    "src/use-cases/**/*.ts",
    "src/domain/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.d.ts",
  ],
};

module.exports = config;
