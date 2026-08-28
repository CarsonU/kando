import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind 0.0.0.0 so the container's port is reachable from the host
    port: 5173,
    strictPort: true,
    watch: {
      // Polling is needed for reliable file-change detection inside Docker on macOS.
      usePolling: true,
      interval: 100,
    },
  },
});
