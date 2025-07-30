// eslint.config.mjs
// @ts-check

import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import path from 'path';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },

  // Use recommended JS + TS configs
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Prettier plugin
  eslintPluginPrettierRecommended,

  // Language options
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.resolve(),
      },
    },
  },

  // Custom rules to relax strict TS/ESLint checks
  {
    rules: {
      // Allow use of `any` in special cases
      '@typescript-eslint/no-explicit-any': 'off',

      // Reduce severity of some strict TS rules
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-useless-escape': 'warn',

      // Unused variables
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Prettier
      'prettier/prettier': ['warn', { endOfLine: 'auto' }],

      // You can fine-tune more rules as needed
    },
  },
);
