<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { emailApi } from '../services/emailApi';
import type { EmailRecord } from '../types/email';

interface Props {
  type: 'received' | 'sent' | 'starred';
  selectedEmailId?: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'selectEmail', id: string): void;
}>();

// 状态管理
const loading = ref(false);
const hasMore = ref(true);
const emails = ref<EmailRecord[]>([]);
const currentPage = ref(1);
const pageSize = ref(15);
const total = ref(0);
let observer: IntersectionObserver | null = null;

// 防抖函数
function debounce(fn: Function, delay: number) {
  let timer: NodeJS.Timeout;
  return function (...args: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(null, args);
    }, delay);
  };
}

// 获取邮件列表
const fetchEmails = async (page: number = 1) => {
  if (loading.value || (!hasMore.value && page > 1)) return;

  try {
    loading.value = true;
    const response = await emailApi.listEmails(
      props.type,
      page,
      pageSize.value
    );

    if (page === 1) {
      emails.value = response.emails;
    } else {
      emails.value = [...emails.value, ...response.emails];
    }

    total.value = response.total;
    currentPage.value = page;
    hasMore.value = emails.value.length < total.value;
  } catch (error) {
    MessagePlugin.error(page === 1 ? '获取邮件列表失败' : '加载更多邮件失败');
  } finally {
    loading.value = false;
  }
};

// 加载更多数据
const loadMore = debounce(() => {
  if (hasMore.value && !loading.value) {
    fetchEmails(currentPage.value + 1);
  }
}, 200);

// 处理邮件点击
const handleEmailClick = (email: EmailRecord) => {
  emit('selectEmail', email.id);
};

// 添加标星功能
const toggleStar = async (email: EmailRecord, event: Event) => {
  event.stopPropagation();
  try {
    await emailApi.toggleStar(email.id);
    email.starred = !email.starred;
  } catch (error) {
    MessagePlugin.error('操作失败');
  }
};

// 设置观察器
const setupObserver = () => {
  const options = {
    root: null,
    rootMargin: '20px',
    threshold: 0.5,
  };

  observer = new IntersectionObserver((entries) => {
    const target = entries[0];
    if (target.isIntersecting) {
      loadMore();
    }
  }, options);

  // 观察加载更多的元素
  const loadingElement = document.querySelector('.loading-more');
  if (loadingElement) {
    observer.observe(loadingElement);
  }
};

// 生命周期钩子
onMounted(() => {
  fetchEmails();
  setupObserver();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<template>
  <t-list class="h-full overflow-y-auto">
    <t-list-item v-for="email in emails" :key="email.id" @click="handleEmailClick(email)"
      class="cursor-pointer transition-colors duration-200 p-4 border-b border-gray-200" :class="{
        'bg-gray-50 hover:bg-gray-100': props.selectedEmailId === email.id,
        'hover:bg-gray-50': props.selectedEmailId !== email.id
      }">
      <div class="w-full space-y-2">
        <!-- 第一行：发件人和标星按钮 -->
        <div class="font-medium truncate" title="{{ email.from }}"> {{ email.from }} </div>
        <!-- 第二行：主题 -->
        <div class="font-medium text-gray-900 truncate" title="{{ email.subject }}">{{ email.subject }}</div>
        <!-- 第三行：时间 -->
        <div class="flex justify-between items-center text-sm text-gray-500">
          <div>
            {{ new Date(email.receivedAt).toLocaleString() }}
          </div>
          <button @click="toggleStar(email, $event)" class="text-yellow-400 hover:text-yellow-500">
            <t-icon :name="email.starred ? 'star-filled' : 'star'" />
          </button>
        </div>
      </div>
    </t-list-item>

    <!-- 加载状态和提示 -->
    <div v-if="loading || hasMore" class="loading-more py-4 text-center text-gray-500">
      <template v-if="loading">加载中...</template>
      <template v-else>上拉加载更多</template>
    </div>

    <!-- 无更多数据提示 -->
    <div v-if="!hasMore && emails.length > 0" class="py-4 text-center text-gray-500">
      没有更多数据了
    </div>

    <!-- 空状态提示 -->
    <div v-if="!loading && emails.length === 0" class="py-4 text-center text-gray-500">
      暂无数据
    </div>
  </t-list>
</template>

<style scoped>
:deep(.t-list-item) {
  padding: 16px;
}


</style>