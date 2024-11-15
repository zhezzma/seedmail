import { createApp } from 'vue'
import App from './App.vue'
import 'tdesign-vue-next/es/style/index.css';
import './assets/style.css'
import { router } from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');
