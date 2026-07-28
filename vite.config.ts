import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Keep the browser client pinned to the same port instead of silently
      // reconnecting to an older Vite instance on 3001.
      hmr: process.env.DISABLE_HMR !== 'true' ? { clientPort: 3000 } : false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // The physics runtime includes Rapier's WebAssembly bridge. Its raw
      // module is large, but the release budget is based on compressed
      // transfer size and it is loaded only with the 3D world.
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react-vendor';
            }
            if (id.includes('/@react-three/rapier/') || id.includes('/@dimforge/rapier3d-compat/')) {
              return 'physics-runtime';
            }
            if (id.includes('/@react-three/fiber/') || id.includes('/@react-three/drei/')) {
              return 'three-react';
            }
            if (id.includes('/three/')) return 'three-runtime';
            if (id.includes('/motion/') || id.includes('/framer-motion/')) {
              return 'motion-runtime';
            }
            if (id.includes('/leva/')) return 'debug-tools';
            return undefined;
          },
        },
      },
    },
  };
});
