import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { builtinModules } from "module";
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Renderer process config
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, "src/renderer"),
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/renderer/index.html"),
      },
    },
  },
  // Prevent Vite from bundling Electron and Node.js built-in modules
  ssr: {
    noExternal: true,
    target: 'node',
  },
  // Configure Vite to properly handle the preload script
  optimizeDeps: {
    exclude: ['electron'],
  },
});
