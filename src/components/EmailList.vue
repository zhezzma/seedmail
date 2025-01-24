<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
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

// 添加多选状态管理
const selectedEmails = ref<Set<string>>(new Set());
const isSelecting = ref(false);

// 添加全选状态管理
const selectState = ref<'none' | 'all' | 'partial'>('none');

// 添加对话框相关的状态
const showDeleteConfirm = ref(false);
const selectedStarredCount = ref(0);

// 添加提示音文件
const audio = new Audio('/notification.wav');

// 添加一个变量保存最新邮件的时间戳
const latestEmailTime = ref<string>('');

// 获取标题
const getTitle = () => {
  switch (props.type) {
    case 'received':
      return '收件箱';
    case 'sent':
      return '已发邮件';
    case 'starred':
      return '星标邮件';
  }
};

// 修改 toggleSelectAll 方法
const toggleSelectAll = () => {
  if (!isSelecting.value) {
    // 进入选择模式
    isSelecting.value = true;
    selectState.value = 'all';
    selectedEmails.value = new Set(emails.value.map(email => email.id));
    return;
  }

  // 当前是选择模式时
  if (selectState.value === 'all' || selectState.value === 'partial') {
    // 退出选择模式
    selectedEmails.value.clear();
    selectState.value = 'none';
    isSelecting.value = false; // 关闭选择模式
  } else {
    // 全选
    selectedEmails.value = new Set(emails.value.map(email => email.id));
    selectState.value = 'all';
  }
};

// 更新选择状态图标
const getSelectIcon = () => {
  if (!isSelecting.value) return 'rectangle';
  switch (selectState.value) {
    case 'all':
      return 'check-rectangle';
    case 'partial':
      return 'minus-rectangle';
    default:
      return 'rectangle';
  }
};

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

// 修改 fetchEmails 方法
const fetchEmails = async (page: number = 1) => {
  if (loading.value || (!hasMore.value && page > 1)) return;

  try {
    loading.value = true;
    const response = await emailApi.listEmails(
      props.type,
      page,
      pageSize.value
    );

    // 检查是否有新邮件 (仅在收件箱和第一页时检查)
    if (props.type === 'received' && page === 1 && response.emails.length > 0) {
      const newLatestEmail = response.emails[0];
      
      // 如果有最新邮件记录，且新获取的邮件比已记录的更新，则播放提示音
      if (latestEmailTime.value && new Date(newLatestEmail.receivedAt) > new Date(latestEmailTime.value)) {
        audio.play();
      }
      
      // 更新最新邮件时间
      latestEmailTime.value = newLatestEmail.receivedAt;
    }

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
  email.readed = true;
};

// 添加标星功能
const toggleStar = async (email: EmailRecord, event: Event) => {
  event.stopPropagation();
  try {
    await emailApi.toggleStar(email.id);
    email.starred = !email.starred;
    fetchEmails(1);
    if (email.starred) {
      MessagePlugin.success('收藏成功');
    }
    else {
      MessagePlugin.success('取消收藏');
    }
  } catch (error) {
    MessagePlugin.error('收藏失败');
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

const handleDelete = async (id: string) => {
  try {
    await emailApi.deleteEmail(id);
    MessagePlugin.success('删除成功');
    // 删除成功后刷新数据
    fetchEmails(1);
  } catch (error) {
    MessagePlugin.error('删除失败');
  }
};

// 修改批量删除方法
const handleBatchDelete = async () => {
  if (selectedEmails.value.size === 0) return;

  // 检查是否包含星标邮件
  const starredEmails = emails.value.filter(
    email => selectedEmails.value.has(email.id) && email.starred
  );
  
  if (starredEmails.length > 0) {
    selectedStarredCount.value = starredEmails.length;
    showDeleteConfirm.value = true;
    return;
  }

  await executeDelete();
};

// 添加实际执行删除的方法
const executeDelete = async () => {
  try {
    await emailApi.deleteEmails(Array.from(selectedEmails.value));
    MessagePlugin.success('批量删除成功');
    selectedEmails.value.clear();
    isSelecting.value = false;
    showDeleteConfirm.value = false;
    fetchEmails(1);
  } catch (error) {
    MessagePlugin.error('批量删除失败');
  }
};

// 修改 toggleSelect 方法
const toggleSelect = (email: EmailRecord, event?: Event) => {
  if (event) {
    event.stopPropagation();
  }
  if (selectedEmails.value.has(email.id)) {
    selectedEmails.value.delete(email.id);
  } else {
    selectedEmails.value.add(email.id);
  }

  // 更新选择状态
  if (selectedEmails.value.size === 0) {
    selectState.value = 'none';
  } else if (selectedEmails.value.size === emails.value.length) {
    selectState.value = 'all';
  } else {
    selectState.value = 'partial';
  }
};

// 添加刷新方法
const handleRefresh = () => {
  selectedEmails.value.clear();
  selectState.value = 'none';
  isSelecting.value = false;
  fetchEmails(1);
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

// 监听type属性变化
let refreshInterval: NodeJS.Timeout | null = null;
watch(() => props.type, (newType) => {
  if (newType === 'received') {
    // 启动自动刷新
    refreshInterval = setInterval(() => fetchEmails(1), 15000); // 每30秒刷新一次
  } else {
    // 清除自动刷新
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  }
}, { immediate: true });

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 工具栏 -->
    <div class="p-2 border-b border-gray-200 flex items-center bg-white shadow-sm transition-all duration-300"
      :class="{ 'translate-y-0 opacity-100': true, 'border-b-2 border-primary': isSelecting }">
      <!-- 选择按钮 -->
      <t-button @click="toggleSelectAll" :theme="isSelecting ? 'default' : 'primary'" variant="text" shape="circle">
        <template #icon>
          <t-icon :name="getSelectIcon()" />
        </template>
      </t-button>

      <!-- 标题 -->
      <h2 class="text-lg font-medium flex-1">{{ getTitle() }}</h2>

      <!-- 右侧工具按钮 -->
      <div class="flex items-center space-x-4">
        <t-button v-show="isSelecting" @click="handleBatchDelete" theme="danger" variant="text" shape="circle"
          :disabled="selectedEmails.size === 0" class="transition-all duration-300">
          <template #icon>
            <t-icon name="delete" />
          </template>
        </t-button>

        <t-button theme="primary" variant="text" shape="circle" @click="handleRefresh">
          <template #icon>
            <t-icon name="refresh" />
          </template>
        </t-button>
      </div>
    </div>

    <!-- 邮件列表 -->
    <t-list class="flex-1 overflow-y-auto">
      <t-list-item v-for="email in emails" :key="email.id"
        @click="isSelecting ? toggleSelect(email, $event) : handleEmailClick(email)"
        class="cursor-pointer transition-all duration-200 p-4 border-b border-gray-200 relative group" :class="{
          'bg-primary-50': isSelecting && selectedEmails.has(email.id),
          'bg-gray-50': !isSelecting && props.selectedEmailId === email.id,
          'hover:bg-gray-50': !isSelecting && props.selectedEmailId !== email.id,
          'hover:bg-primary-100': isSelecting
        }">
        <!-- 复选框 -->
        <div v-if="isSelecting" class="absolute left-4 top-1/2 transform -translate-y-1/2" @click.stop>
          <t-checkbox 
            :checked="selectedEmails.has(email.id)" 
            @change="toggleSelect(email)"
          />
        </div>

        <div class="w-full space-y-2" :class="{ 'pl-8': isSelecting }">
          <!-- 第一行：发件人 -->
          <div class="font-medium truncate relative" :title="props.type === 'sent' ? email.to : email.from">
            {{ props.type === "sent" ? email.to : email.from }}
            <!-- 添加未读标记 -->
            <div v-if="!email.readed" 
                 class="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500">
            </div>
          </div>
          <!-- 第二行：主题 -->
          <div class="font-medium text-gray-900 truncate" :title="email.subject">{{ email.subject }}</div>
          <!-- 第三行：时间和删除和标行按钮 -->
          <div class="flex justify-between items-center text-sm text-gray-500">
            <div>
              {{ new Date(email.receivedAt).toLocaleString() }}
            </div>
            <div class="flex items-center space-x-2">
              <button @click.stop="handleDelete(email.id)"
                class="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <t-icon size="large" name="delete" />
              </button>
              <button @click="toggleStar(email, $event)"
                :class="{ 'text-yellow-400 hover:text-yellow-500': email.starred, 'text-gray-400 hover:text-gray-500': !email.starred }">
                <t-icon size="large" :name="email.starred ? 'star-filled' : 'star'" />
              </button>
            </div>
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

    <!-- 添加确认对话框 -->
    <t-dialog
      header="确认删除"
      :visible="showDeleteConfirm"
      @confirm="executeDelete"
      @close="showDeleteConfirm = false"
    >
      <p>选中的邮件中包含 {{ selectedStarredCount }} 个星标邮件，是否确认删除？</p>
    </t-dialog>
  </div>
</template>

<style scoped>
:deep(.t-list-item) {
  padding: 16px;
}

:deep(.group:hover .group-hover\:opacity-100) {
  opacity: 1;
}

/* 添加新的样式 */
.border-primary {
  border-color: var(--td-brand-color);
}

.bg-primary-50 {
  background-color: var(--td-brand-color-1);
}

.bg-primary-100 {
  background-color: var(--td-brand-color-2);
}

/* 添加未读标记样式 */
.rounded-full {
  border-radius: 9999px;
}

.bg-blue-500 {
  background-color: #3b82f6;
}
</style>