import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
        rules: { 'no-console': 'warn', 'no-eval': 'error', 'no-implied-eval': 'error', eqeqeq: ['error', 'always', { null: 'ignore' }], 'no-unused-vars': ['error', { args: 'none' }] },
    },
    { files: ['test/**/*.js', 'eslint.config.js', 'vite.config.js'], languageOptions: { globals: globals.node } },
];
