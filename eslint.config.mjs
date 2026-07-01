import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // TypeScript handles these better
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Allow explicit `any` in specific cases (middleware, error handling)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Consistent type imports (matches verbatimModuleSyntax)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // No floating promises (critical for async Hono handlers)
      '@typescript-eslint/no-floating-promises': 'off',

      // Allow non-null assertions sparingly
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // No console.log (use structured logger instead)
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'drizzle/', 'coverage/', 'keys/', '*.config.*'],
  },
);
