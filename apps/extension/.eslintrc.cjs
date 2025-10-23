module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json"
  },
  plugins: ["@typescript-eslint", "import", "unicorn"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:unicorn/recommended",
    "prettier"
  ],
  rules: {
    "unicorn/prevent-abbreviations": "off",
    "unicorn/no-array-for-each": "off",
    "@typescript-eslint/no-explicit-any": "off"
  },
  settings: {
    "import/resolver": {
      typescript: {
        project: "./tsconfig.json"
      }
    }
  }
};
