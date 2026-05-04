import path from 'node:path';
import { fileURLToPath } from 'node:url';

import strip from '@rollup/plugin-strip';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (
    /[/\\]node_modules[/\\](?:react|react-dom|scheduler)[/\\]/.test(id) ||
    /[/\\]node_modules[/\\]react-router(?:-dom)?[/\\]/.test(id)
  ) {
    return 'vendor-react';
  }
  if (/[/\\]node_modules[/\\]recharts[/\\]/.test(id)) {
    return 'vendor-charts';
  }
  if (
    /[/\\]node_modules[/\\]@tiptap[/\\]/.test(id) ||
    /[/\\]node_modules[/\\]prosemirror-/.test(id)
  ) {
    return 'vendor-editor';
  }
  if (/[/\\]node_modules[/\\]xlsx[/\\]/.test(id)) {
    return 'vendor-xlsx';
  }
  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const enableBundleReport = mode === 'analyze' || process.env.BUNDLE_ANALYZE === 'true';
  const stripDebugConsole = command === 'build';

  return {
    plugins: [
      react(),
      ...(enableBundleReport
        ? [
            visualizer({
              filename: 'dist/bundle-report.html',
              open: false,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        plugins: stripDebugConsole
          ? [
              strip({
                debugger: true,
                functions: ['console.log', 'console.info', 'console.debug'],
                include: ['**/*'],
                exclude: [/[/\\]node_modules[/\\]/, /[/\\]\.vite[/\\]/],
              }),
            ]
          : [],
        output: {
          manualChunks,
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'https://viettunearchiveapi-fufkgcayeydnhdeq.japanwest-01.azurewebsites.net',
          changeOrigin: true,
        },
      },
    },
  };
});