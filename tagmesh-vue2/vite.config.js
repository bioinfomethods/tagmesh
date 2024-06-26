
import vuePlugin from '@vitejs/plugin-vue2';

export default {

  plugins: [vuePlugin(/* options */)],

  define: {
      global: {},
  },
  
  build: {
    minify: false,

    lib: {
      entry: 'index.js', // E.g., src/index.js
      name: 'tagmesh-vue2',
      fileName: (format) => `tagmesh-vue2.${format}.js`
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
};

