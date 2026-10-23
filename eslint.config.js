import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // PKG-02: the battle sim is headless and deterministic. No three.js, React, DOM or components; no wall time and no
  // Math.random (the battle's seeded RNG is the only randomness). HOUSE-RULES rule 3.
  {
    files: ['src/battle/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'three', message: 'The battle sim is headless: no three.js.' },
          { name: 'react', message: 'The battle sim is headless: no React.' },
          { name: 'react-dom', message: 'The battle sim is headless: no React DOM.' },
        ],
        patterns: [
          { group: ['three/*', 'react/*', 'react-dom/*'], message: 'The battle sim is headless.' },
          { regex: '(^|/)components(/|$)', message: 'The battle sim may not import from src/components.' },
        ],
      }],
      'no-restricted-globals': ['error',
        { name: 'window', message: 'No DOM in the battle sim.' },
        { name: 'document', message: 'No DOM in the battle sim.' },
        { name: 'localStorage', message: 'No DOM in the battle sim.' },
        { name: 'requestAnimationFrame', message: 'The sim steps itself: step(battle).' },
        { name: 'performance', message: 'The sim never reads wall time.' },
        { name: 'Date', message: 'The sim never reads wall time.' },
      ],
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random', message: "Draw from the battle's seeded RNG (rng.ts)." },
      ],
    },
  },
)
