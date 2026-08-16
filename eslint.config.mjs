import type { Linter } from "eslint";

const config: Linter.Config[] = [
  {
    extends: ["next/core-web-vitals", "next/typescript"],
  } as unknown as Linter.Config,
];

export default config;
