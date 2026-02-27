import tseslint from "typescript-eslint"
import nextPlugin from "@next/eslint-plugin-next"
import reactHooksPlugin from "eslint-plugin-react-hooks"
import eslintConfigPrettier from "eslint-config-prettier"

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "components/ui/**"],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  eslintConfigPrettier,
  {
    files: ["hooks/**/*.ts"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
)
