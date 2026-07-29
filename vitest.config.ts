import { defineConfig } from 'vitest/config';

// 租期計算大量依賴日期邊界，固定時區才能在任何機器上得到一致結果。
// 必須在 worker 啟動前設定，因此放在設定檔頂層。
process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
