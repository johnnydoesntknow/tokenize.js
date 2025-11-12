import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging (optional)
    sourcemap: false,
    
    // Optimize bundle size
    minify: 'terser',
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ethers-vendor': ['ethers'],
          'ui-vendor': ['lucide-react']
        }
      }
    },
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  
  // Define global constants
  define: {
    'process.env': {}
  },
  
  // Preview server configuration
  preview: {
    port: 3000,
    host: true
  }
})