import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base は GitHub Pages のサブパス公開向け．
// 例: https://<user>.github.io/sparta-typing/ で公開する場合は "/sparta-typing/"．
// CI では VITE_BASE をリポジトリ名から設定する（.github/workflows/deploy.yml 参照）．
const base = process.env.VITE_BASE ?? "/sparta-typing/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // ベンダーを分離してメインバンドルを軽量化・キャッシュ効率を改善する．
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "charts", test: /node_modules[\\/](recharts|d3-|victory|internmap|decimal)/ },
            { name: "db", test: /node_modules[\\/]dexie[\\/]/ },
          ],
        },
      },
    },
  },
});
