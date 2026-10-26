// Una sola configuración para todo el monorepo (web, mobile, core y tokens). Se corre desde la raíz: npm run lint
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    '**/dist',
    '**/coverage',
    '**/.expo',
    '**/android',
    '**/ios',
    '**/web-build',
    'svg',
  ]),

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    rules: {
      // Reglas del React Compiler (react-hooks v7): marcan patrones frágiles que hoy funcionan. Quedan como
      // aviso hasta revisarlos uno por uno (sobre todo ChatView y ServerSettingsScreen)
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // Mismo criterio que noUnusedLocals / noUnusedParameters del tsconfig: `_` marca lo que se ignora a propósito
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Web: Vite recarga los módulos en caliente solo si exportan componentes
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactRefresh.configs.vite],
  },

  // Archivos de configuración que corren en Node (metro, vite, vitest)
  {
    files: ['**/*.config.{js,mjs,cjs,ts}', 'apps/mobile/metro.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.cjs', 'apps/mobile/metro.config.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
])
