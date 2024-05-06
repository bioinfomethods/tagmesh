import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  define: {
      global: {},
  },
  
  build: {
    minify: false,

    lib: {
      entry: 'index.js', // E.g., src/index.js
      name: 'tagmesh-vue3',
      fileName: (format) => `tagmesh-vue3.${format}.js`
    },

    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue'
        }
      }
    }
  } ,
  
  server: {
    proxy: {
      // Using "^/db" to match all requests starting with "/db"
      '^/tagmesh_': {
        target: 'http://localhost:5173', // Proxy target
        changeOrigin: true,
        rewrite: path => path.replace(/^\/db/, '') // Rewrite the path to remove "/db"
      }
    }
  }  
});

