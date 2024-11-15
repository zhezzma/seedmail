<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import logo from './assets/logo.png'
const router = useRouter();
const route = useRoute();
const menu = [
  {
    name: '邮件列表',
    path: '/emails',
    icon: 'mail'
  },
  {
    name: '写邮件',
    path: '/compose',
    icon: 'edit'
  }
];

const logout = () => {
  window.localStorage.removeItem('isAuthenticated');
  router.push('/login');
};
</script>

<template>
  <template v-if="route.path === '/login'">
    <router-view />
  </template>
  <t-layout v-else class="h-screen">
    <!-- 侧边栏 -->
    <t-aside class="sidebar backdrop-blur-lg">
      <t-menu :value="route.path" theme="dark" class="bg-transparent">
        <template #logo>
          <router-link to="/" class="flex items-center gap-2">
            <img :src="logo" alt="logo" class="w-10 h-10 transition-transform hover:scale-110" />
            <h1 class="text-2xl font-bold text-white tracking-wider">SEED MAIL</h1>
          </router-link>
        </template>
        <t-menu-item v-for="item in menu" :key="item.path" :value="item.path" :to="item.path"
          class="menu-item mx-4 my-2 rounded-xl">
          <template #icon>
            <t-icon :name="item.icon" class="text-xl" />
          </template>
          <span class="font-medium">{{ item.name }}</span>
        </t-menu-item>
      </t-menu>
    </t-aside>

    <t-layout>
      <!-- 头部 -->
      <t-header class="header backdrop-blur-xl border-b border-gray-100">
        <div class="flex items-center justify-between h-16 px-8">
          <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            邮件管理系统
          </h1>
          <t-button theme="danger" variant="text" hover-animation class="logout-btn" @click="logout">
            <t-icon name="logout" class="mr-2" />退出登录
          </t-button>
        </div>
      </t-header>

      <!-- 内容区 -->
      <t-content class="content bg-gray-50/30 flex-1 overflow-y-auto p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </t-content>

      <!-- 页脚 -->
      <t-footer class="footer backdrop-blur-sm py-4 text-center text-sm text-gray-600">
        <span class="opacity-75">© 2024 邮件管理系统</span>
      </t-footer>
    </t-layout>
  </t-layout>
</template>

<style scoped>
.sidebar {
  @apply bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.header {
  @apply bg-white/80 sticky top-0 z-10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.menu-item {
  @apply transition-all duration-300 hover:bg-white/15 active:scale-95;
  @apply flex items-center gap-3 px-4 py-3;
}

.logout-btn {
  @apply transition-transform hover:scale-105 active:scale-95;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* :deep(.t-default-menu.t-menu--dark){
  @apply bg-transparent;
} */

:deep(::-webkit-scrollbar) {
  @apply w-2;
}

:deep(::-webkit-scrollbar-thumb) {
  @apply bg-gray-400/30 rounded-full transition-colors hover:bg-gray-400/50;
}

:deep(::-webkit-scrollbar-track) {
  @apply bg-transparent;
}

.content {
  background-image: radial-gradient(circle at 50% 50%,
      rgba(255, 255, 255, 0.8) 0%,
      rgba(240, 240, 250, 0.6) 100%);
}

.footer {
  @apply bg-white/60;
}
</style>
