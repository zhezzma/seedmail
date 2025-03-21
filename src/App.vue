<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { ref } from 'vue';
import logo from './assets/logo.png'

const router = useRouter();
const route = useRoute();
const menuVisible = ref(false);
const menu = [
  {
    name: '收件箱',
    path: '/inbox',
    icon: 'mail'
  },
  {
    name: '已发邮件',
    path: '/sent',
    icon: 'send'
  },
  {
    name: '星标邮件',
    path: '/starred',
    icon: 'star'
  },
  {
    name: '用户列表',
    path: '/users',
    icon: 'user-circle'
  },
  {
    name: '邮箱设置',
    path: '/setting',
    icon: 'setting'
  }
];

const logout = () => {
  window.localStorage.removeItem('isAuthenticated');
  router.push('/login');
};

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};



//解析token
const parseToken = () => {
  try {
    const token = localStorage.getItem('token') as string;
    const [, payload] = token.split('.');
    const data = JSON.parse(atob(payload));
    return data;
  } catch (error) {
    return null;
  }
};
const jwtToken = parseToken();


const handleCompose = () => {
  router.push('/compose');
};
</script>

<template>
  <template v-if="route.path === '/login'">
    <router-view />
  </template>
  <t-layout v-else class="h-screen">
    <!-- 移动端抽屉菜单 -->
    <t-drawer v-model:visible="menuVisible" placement="left" size="232" :footer="false" :header="false"
      :close-on-overlay-click="true" class="lg:hidden">
      <t-menu :value="route.path" theme="dark" class="h-full bg-transparent ">
        <template #logo>
          <router-link to="/" class="flex items-center gap-2 p-4">
            <img :src="logo" alt="logo" class="w-8 h-8" />
            <h1 class="text-xl font-bold text-white">SEED MAIL</h1>
          </router-link>
        </template>
        <t-menu-item v-for="item in menu" :key="item.path" :value="item.path" :to="item.path"
          @click="menuVisible = false" class="menu-item mx-4 my-2 rounded-xl">
          <template #icon>
            <t-icon :name="item.icon" />
          </template>
          {{ item.name }}
        </t-menu-item>
      </t-menu>
    </t-drawer>

    <!-- 桌面端侧边栏 -->
    <t-aside class="sidebar backdrop-blur-lg hidden lg:block">
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

    <t-layout class="w-full">
      <t-header class="header backdrop-blur-xl border-b border-gray-100">
        <div class="flex items-center justify-between h-full px-2 sm:px-4 lg:px-8">
          <!-- 移动端菜单按钮和标题 -->
          <div class="flex items-center gap-2 sm:gap-4">
            <t-button theme="default" variant="text" class="lg:hidden min-w-[40px]" @click="toggleMenu">
              <t-icon name="menu" size="20px" sm:size="24px" />
            </t-button>
            <h1 class="text-base sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-full">
              {{ jwtToken?.sub }}的邮箱
            </h1>
          </div>
          <div class="flex items-center gap-2 sm:gap-4">
            <t-button theme="primary" @click="handleCompose" class="shadow-md hover:shadow-lg transition-shadow text-sm sm:text-base py-1 px-2 sm:px-4">
              <template #icon>
                <t-icon name="edit" class="text-sm sm:text-base" />
              </template>
              <span>写邮件</span>
            </t-button>
            <t-button theme="danger" @click="logout" class="logout-btn text-sm sm:text-base py-1 px-2 sm:px-4">
              <template #icon>
                <t-icon name="logout" class="text-sm sm:text-base" />
              </template>
              <span>退出</span>
            </t-button>
          </div>
        </div>
      </t-header>

      <!-- 内容区域 -->
      <t-content class="content bg-gray-50/30 flex-1  overflow-y-auto w-full">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </t-content>

      <!-- 页脚 -->
      <t-footer class="footer backdrop-blur-sm py-4 text-center text-sm text-gray-600">
        <span class="opacity-75">© SEED MAIL 邮件管理系统</span>
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

:deep(.t-drawer__body) {
  @apply p-0;
}

:deep(.t-drawer__body) {
  @apply p-0;
}

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

/* 添加移动端响应式样式 */
@media (max-width: 1024px) {
  .sidebar {
    display: none;
  }
}

.drawer-menu {
  @apply bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800;
}



</style>
