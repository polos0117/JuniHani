import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./github-pages/", import.meta.url)),
  base: "/JuniHani/",
  publicDir: fileURLToPath(new URL("./public/", import.meta.url)),
  plugins: [react()],
  resolve: { alias: { "@": projectRoot } },
  build: { outDir: fileURLToPath(new URL("./dist-pages/", import.meta.url)), emptyOutDir: true },
});
