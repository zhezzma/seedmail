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
    <t-aside class="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
      <t-menu :value="route.path" theme="dark" class="bg-transparent">
        <template #logo>
          <div class="flex items-center gap-3 ">
            <img :src="logo" alt="logo" class="w-10 h-10" />
            <h1 class="text-xl font-bold text-white">SEED MAIL</h1>
          </div>
        </template>
        <t-menu-item v-for="item in menu" :key="item.path" :value="item.path" :to="item.path"
          class="menu-item mx-2 my-1 rounded-lg">
          <template #icon>
            <t-icon :name="item.icon" />
          </template>
          {{ item.name }}
        </t-menu-item>
      </t-menu>
    </t-aside>

    <t-layout>
      <!-- 头部 -->
      <t-header class="backdrop-blur-sm bg-white/80 border-b">
        <div class="flex items-center justify-between h-16 px-6">
          <h1 class="text-xl font-semibold text-gray-800">邮件管理系统</h1>
          <t-button theme="danger" variant="text" @click="logout">退出登录</t-button>
        </div>
      </t-header>

      <!-- 内容区 -->
      <t-content class="bg-gray-50 flex-1 overflow-y-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </t-content>

      <!-- 页脚 -->
      <t-footer class="bg-white/80 py-3 text-center text-sm text-gray-600">
        © 2024 邮件管理系统
      </t-footer>
    </t-layout>
  </t-layout>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.menu-item {
  @apply transition-colors duration-200 hover:bg-white/10;
}

:deep(::-webkit-scrollbar) {
  @apply w-1.5;
}

:deep(::-webkit-scrollbar-thumb) {
  @apply bg-gray-400/50 rounded-full;
}
</style>
