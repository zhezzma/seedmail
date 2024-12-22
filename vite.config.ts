import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { TDesignResolver } from 'unplugin-vue-components/resolvers';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [TDesignResolver({
        library: 'vue-next'
      })],
    }),
    Components({
      resolvers: [TDesignResolver({
        library: 'vue-next'
      })],
    }),
  ],
  server: {
    proxy: {
      '/api': {
        //Vite 的开发服务器接收到请求，发现请求路径以 /api 开头时，Vite 的开发服务器就会自动转发到 http://localhost:8788
        //这样就可以在开发时，通过 /api 来访问后端服务
        target: "http://127.0.0.1:8788",//https://seedmail.igiven.com",//'http://127.0.0.1:8788',
        changeOrigin: true
      }
    }
  }
})
