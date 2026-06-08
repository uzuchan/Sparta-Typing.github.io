import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This app is published at https://uzuchan.github.io/.
// Keep the default base at root so built assets resolve on the live site.
const base = process.env.VITE_BASE ?? "/";

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
