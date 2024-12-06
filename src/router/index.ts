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
    redirect: '/inbox',
    meta: { requiresAuth: true }
  },
  {
    path: '/inbox',
    name: 'Inbox',
    component: () => import('../views/Inbox.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/sent',
    name: 'Sent',
    component: () => import('../views/Sent.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/email/:id',
    name: 'Email',
    component: () => import('../views/Email.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/compose',
    name: 'ComposeEmail',
    component: () => import('../views/ComposeEmail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/Users.vue'),
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
    next('/')
  } else {
    next()
  }
})
