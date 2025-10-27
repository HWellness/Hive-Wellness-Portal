import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      react: react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "warn",
      "prefer-const": "error",
      "no-undef": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-expressions": "error",
    },
  },
  prettierConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.min.js",
      "coverage/**",
      ".vscode/**",
      ".idea/**",
      "*.log",
      ".env*",
      "public/**",
      "attached_assets/**",
      "user_exports/**",
      "migrations/**",
      "wordpress-chatbot-plugin/**",
      "email-templates-preview.html",
      "communication-launch-verification.html",
      "video-test-multi-user.html",
      "hive-wordpress-chatbot-direct.js",
      "email-preview-generator.js",
      "email-test-comprehensive.js",
      "final-verification-report.js",
      "therapist-onboarding-status.js",
      "messaging-test.cjs",
      "stripe-payment-testing.js",
      "test-hubspot-security.cjs",
      "test-hubspot-security-final.cjs",
      "twilio-a2p-campaign-guide.js",
      "twilio-capability-check.js",
      "twilio-messaging-service-fix.js",
      "template-cleanup-verification.ts",
      "scripts/fix-admin-role.ts",
    ],
  },
];
