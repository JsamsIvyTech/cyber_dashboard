import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import wasm from "vite-plugin-wasm";
// @ts-ignore
import topLevelAwait from "vite-plugin-top-level-await";
// @ts-ignore
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait()
  ],
  // If not using the plugin, you can also use:
  // worker: {
  //   format: "es",
  //   plugins: [wasm()]
  // }
})
