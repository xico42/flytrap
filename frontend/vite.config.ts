import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxy = env.VITE_API_PROXY ?? "http://localhost:8080";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: apiProxy,
          changeOrigin: false,
        },
      },
    },
    build: { outDir: "dist", emptyOutDir: true },
  };
});
