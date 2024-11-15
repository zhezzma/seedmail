import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/emails'
  },
  {
    path: '/emails',
    name: 'EmailList',
    component: () => import('../views/EmailList.vue')
  },
  {
    path: '/emails/:id',
    name: 'EmailDetail',
    component: () => import('../views/EmailDetail.vue')
  },
  {
    path: '/compose',
    name: 'ComposeEmail',
    component: () => import('../views/ComposeEmail.vue')
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});