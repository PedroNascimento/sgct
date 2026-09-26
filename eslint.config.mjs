import nextConfig from "eslint-config-next";

const config = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "dist/**"],
  },
  ...nextConfig,
];

export default config;
