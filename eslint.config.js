// Correctness only (docs/adr/0021): what is undefined, unused, unreachable or duplicated, and the rules of hooks.
// No style rules: the code's layout is not this tool's business. Types are checked by tsc (tsconfig.json, tsconfig.js.json).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const unused = {args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none'};

export default [
  {ignores: ['dist/**', 'node_modules/**', '.shots/**', '.claude/**', 'src/data/geo/ward-boundaries.ts']},
  js.configs.recommended,
  {
    // Recommended rules that are about taste, not correctness, or that misfire on patterns this code uses on purpose.
    rules: {
      'no-useless-escape': 'off',
      'no-useless-assignment': 'off', // let x = null; try { x = … } catch { x = null }
      'preserve-caught-error': 'off',
      'no-empty': ['error', {allowEmptyCatch: true}],
      'no-irregular-whitespace': ['error', {skipStrings: true, skipTemplates: true, skipComments: true}], // full-width spaces in printed text
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {ecmaVersion: 2024, sourceType: 'module', globals: globals.browser},
    rules: {'no-unused-vars': ['error', unused]},
  },
  {
    files: ['scripts/**/*.mjs', 'tools/**/*.js', '*.js'],
    languageOptions: {ecmaVersion: 2024, sourceType: 'module', globals: {...globals.node, ...globals.browser}},
    rules: {'no-unused-vars': ['error', unused]},
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {parser: tseslint.parser, parserOptions: {ecmaFeatures: {jsx: true}}, globals: globals.browser},
    plugins: {'@typescript-eslint': tseslint.plugin, 'react-hooks': reactHooks},
    rules: {
      'no-undef': 'off', // tsc does this for TypeScript
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', unused],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // Protected files (AGENTS.md §2, ADR 0003): not edited to satisfy a linter.
    files: ['src/data/index.ts', 'src/data/tags.ts', 'src/data/types.ts', 'src/data/areas.ts', 'src/data/wards.ts', 'src/types.ts'],
    rules: {'@typescript-eslint/no-unused-vars': 'off'},
  },
];
