import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

// `npm run build:artifact` -> one self-contained HTML file (fonts, data and code
// inlined) that searches a bundled price snapshot. Used for the claude.ai artifact.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const snapshot = env.VITE_SNAPSHOT === '1';
  return {
    plugins: [react(), tailwindcss(), ...(snapshot ? [viteSingleFile()] : [])],
    resolve: {
      alias: { '@matching': fileURLToPath(new URL('../server/src/matching', import.meta.url)) },
    },
    build: snapshot ? { outDir: 'dist-artifact', assetsInlineLimit: 100_000_000 } : {},
    server: {
      proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
      fs: { allow: ['..'] },
    },
  };
});
