module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'playwright-report', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react-refresh', 'import', 'react', 'jsx-a11y'],
  settings: {
    react: {
      version: 'detect',
    },
    linkComponents: [{ name: 'Link', linkAttribute: 'to' }],
  },
  rules: {
    'react/jsx-key': 'error',
    'react/jsx-no-target-blank': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    /** Phase 5.2 — align with PLAN naming table; interfaces / type aliases use PascalCase, no `I` prefix */
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'interface', format: ['PascalCase'] },
      { selector: 'typeAlias', format: ['PascalCase'] },
    ],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'import/order': [
      'warn',
      {
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    // Các pattern UI (slider, overlay, portal) thường dùng div + onClick; bật đủ recommended nhưng tắt cặp rule trùng ý nghĩa gây hàng trăm báo cáo không thực tế.
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    // Backdrop modal / overlay (đóng khi click nền) — không ép role button trên toàn codebase.
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    // Bản thu người dùng / kho lưu trữ — không có file phụ đề VTT; tránh <track> giả.
    'jsx-a11y/media-has-caption': 'off',
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
      rules: {
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': [
          'error',
          { checksVoidReturn: { attributes: false } },
        ],
      },
    },
    {
      files: ['src/api/generated.d.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
    {
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: ['src/App.tsx', 'src/uiToast/**/*'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react-hot-toast',
                message:
                  'Dùng @/uiToast (Toaster chỉ trong App.tsx; toast implementation chỉ trong src/uiToast).',
              },
              {
                name: '@/utils/exploreRecordingsLoad',
                message:
                  'Import from @/features/explore/utils/exploreRecordingsLoad (Phase 6.2 — no thin re-export).',
              },
              {
                name: '@/hooks/useUploadWizard',
                message:
                  'Import from @/features/upload/hooks/useUploadWizard (Phase 6.3 — canonical hook).',
              },
              {
                name: '@/hooks/useKnowledgeGraphData',
                message:
                  'Import from @/features/knowledge-graph/hooks/useKnowledgeGraphData (Phase 6.3 — canonical hook).',
              },
            ],
            patterns: [
              {
                group: ['@/pages/moderation/**'],
                message:
                  'Import from @/features/moderation/... (hooks, types, utils) — Phase 6.2 removed pages/moderation re-exports.',
              },
            ],
          },
        ],
      },
    },
  ],
}