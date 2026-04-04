module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
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
                name: '@/stores/notificationStore',
                importNames: ['notify'],
                message:
                  'Dùng @/uiToast. Giữ store cho NotificationProvider / useNotificationStore nếu cần dialog stack.',
              },
            ],
          },
        ],
      },
    },
  ],
}