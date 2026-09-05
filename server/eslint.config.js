// ESLint flat config for the PCMS Express server.
// Application source lives under src/ (added from Phase 2 onward); this config
// lints Node JS there and defers all formatting concerns to Prettier.
import js from '@eslint/js'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default [
  { ignores: ['node_modules', 'coverage', 'dist'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Disable stylistic rules that would conflict with Prettier. Keep last.
  prettier,
]
