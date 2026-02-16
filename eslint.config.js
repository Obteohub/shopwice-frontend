const globals = require('globals');
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');

module.exports = [
  ...nextCoreWebVitals,
  {
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        JSX: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      '@next/next/no-img-element': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-unused-vars': 1,
    },
  },
];
