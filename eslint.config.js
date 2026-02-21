import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['coverage/**', 'dev-dist/**', 'dist/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    files: ['**/*.{js,ts}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      curly: ['error', 'multi-line'],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          message: 'Use el() helper and replaceChildren() instead.',
          property: 'innerHTML',
        },
      ],
    },
  },

  // Test files use dynamic imports with vi.resetModules(), which requires
  // typeof import() type annotations that the default rule forbids.
  {
    files: ['src/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { disallowTypeAnnotations: false, prefer: 'type-imports' },
      ],
    },
  },

  // Block direct imports of db.ts from UI code; entries.ts is the mediator.
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          message: 'Import db through src/entries.ts instead.',
          name: '../db',
        },
        {
          message: 'Import db through src/entries.ts instead.',
          name: './db',
        },
      ],
    },
  },
)
