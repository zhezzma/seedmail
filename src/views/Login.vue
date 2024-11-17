<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import logo from '../assets/logo.png'
import { userApi } from '../services/userApi'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const handleLogin = async () => {
  if (!username.value || !password.value) {
    MessagePlugin.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const data = await userApi.login(username.value, password.value)
    
    if (data.success) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('isAuthenticated', 'true')
      
      MessagePlugin.success('登录成功')
      router.push('/')
    } else {
      MessagePlugin.error(data.message || '登录失败')
    }
  } catch (error) {
    MessagePlugin.error('网络错误，请稍后重试')
    console.error('Login error:', error)
  } finally {
    loading.value = false
  }
}
</script>


<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    <div class="relative w-full max-w-md">
      <!-- 装饰背景 -->
      <div class="absolute -top-4 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div class="absolute -bottom-8 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div class="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <!-- 登录卡片 -->
      <div class="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 m-4">
        <!-- Logo和标题 -->
        <div class="flex flex-col items-center mb-8">
          <img :src="logo" alt="logo" class="w-16 h-16 mb-4" />
          <h2 class="text-2xl font-bold text-gray-800">SEED MAIL</h2>
          <p class="text-gray-500 mt-2">登录以继续使用</p>
        </div>

        <!-- 登录表单 -->
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div class="space-y-2">
            <t-input
              v-model="username"
              size="large"
              placeholder="请输入用户名"
              :autofocus="true"
              class="w-full"
            >
              <template #prefix-icon>
                <t-icon name="user" />
              </template>
            </t-input>
          </div>

          <div class="space-y-2">
            <t-input
              v-model="password"
              type="password"
              size="large"
              placeholder="请输入密码"
              class="w-full"
            >
              <template #prefix-icon>
                <t-icon name="lock-on" />
              </template>
            </t-input>
          </div>

          <div class="flex items-center justify-between text-sm">
            <t-checkbox>记住我</t-checkbox>
            <a href="#" class="text-blue-600 hover:text-blue-700 transition-colors">
              忘记密码？
            </a>
          </div>

          <t-button
            type="submit"
            theme="primary"
            :loading="loading"
            size="large"
            class="w-full"
            :disabled="loading"
          >
            {{ loading ? '登录中...' : '登录' }}
          </t-button>
        </form>

        <!-- 额外信息 -->
        <div class="mt-6 text-center text-sm text-gray-500">
          测试账号: admin / password
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}
</style>
