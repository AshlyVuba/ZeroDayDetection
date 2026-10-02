export default [
  {
    files: [
      "eslint.config.js",
      "vite.config.js",
      "src/main.jsx",
      "src/pwa.js",
      "src/storage/StorageAccess.jsx",
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
      "no-unused-vars": "error",
    },
  },
];
