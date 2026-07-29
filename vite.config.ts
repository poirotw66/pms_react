import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    return {
      // GitHub Pages 部署在 /pms_react/ 之下；
      // router 的 basename 會由 import.meta.env.BASE_URL 推導，不需另外設定。
      base: mode === 'production' ? '/pms_react/' : '/',
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false
      }
    };
});
