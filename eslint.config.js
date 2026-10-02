export default [
  {
    files: [
      "eslint.config.js",
      "vite.config.js",
      "src/main.jsx",
      "src/pwa.js",
      "src/ui/Home.jsx",
      "src/ui/LanguageSelector.jsx",
      "src/i18n/index.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        document: "readonly",
        navigator: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^React$" }],
    },
  },
];
