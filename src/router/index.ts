import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/emails',
    meta: { requiresAuth: true }
  },
  {
    path: '/emails',
    name: 'EmailList',
    component: () => import('../views/EmailList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/emails/:id',
    name: 'EmailDetail',
    component: () => import('../views/EmailDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/compose',
    name: 'ComposeEmail',
    component: () => import('../views/ComposeEmail.vue'),
    meta: { requiresAuth: true }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

// 添加路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next('/emails')
  } else {
    next()
  }
})
