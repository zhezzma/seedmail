<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { emailApi } from '../services/emailApi';
import type { Email } from '../types/email';
import DOMPurify from 'dompurify';

const props = defineProps<{
  emailId: string
}>();

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const email = ref<Email | null>(null);
const displayMode = ref<'html' | 'text'>('html');

const processedContent = computed(() => {
  if (!email.value) return '';
  if (displayMode.value === 'html' && email.value.html) {
    return DOMPurify.sanitize(email.value.html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class'],
    });
  }
  return email.value.text || '';
});

const fetchEmailDetail = async () => {
  loading.value = true;
  try {
    email.value = await emailApi.getEmail(props.emailId);
  } catch (error) {
    MessagePlugin.error('获取邮件详情失败');
  } finally {
    loading.value = false;
  }
};

const toggleDisplayMode = () => {
  displayMode.value = displayMode.value === 'html' ? 'text' : 'html';
};

const handleReply = () => {
  router.push({
    path: '/compose',
    query: {
      to: email.value?.to?.[0]?.address,
      from: email.value?.from.address,
      subject: `Re: ${email.value?.subject}`,
    }
  });
};

const headerInfo = computed(() => [
  {
    label: '发件人',
    value: email.value?.from.address,
    icon: 'user',
    color: 'text-green-600'
  },
  {
    label: '收件人',
    value: email.value?.to?.[0]?.address,
    icon: 'user-circle',
    color: 'text-blue-600'
  },
  {
    label: '主题',
    value: email.value?.subject,
    icon: 'mail',
    color: 'text-purple-600'
  },
  {
    label: '时间',
    value: email.value ? new Date(email.value.date!).toLocaleString() : '',
    icon: 'time',
    color: 'text-orange-600'
  }
]);

watch(() => props.emailId, fetchEmailDetail);

onMounted(fetchEmailDetail);
</script>

<template>
  <div v-if="loading" class="flex h-full w-full items-center justify-center">
    <t-loading />
  </div>

  <div v-else-if="email" class="flex flex-col gap-4 overflow-hidden p-2">
    <!-- 邮件头部信息 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        <div v-for="item in headerInfo" :key="item.label"
          class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <t-icon :name="item.icon" :class="[item.color, 'text-lg']" />
          <div class="min-w-0">
            <div class="text-xs text-gray-500">{{ item.label }}</div>
            <div class="text-sm font-medium truncate">{{ item.value }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="flex justify-between items-center px-2">
      <div class="flex gap-3">
        <t-button size="small" theme="primary" @click="handleReply">
          <template #icon>
            <t-icon name="chat-bubble" />
          </template>
          回复
        </t-button>
        <!-- <div class="flex items-center space-x-2">
        <t-icon name="file" class="text-blue-600" />
        <span class="text-sm font-medium">邮件正文</span>
      </div> -->
      </div>

      <div class="flex gap-3">
        <t-button size="small" variant="outline" @click="toggleDisplayMode">
          <template #icon>
            <t-icon :name="displayMode === 'html' ? 'code' : 'view-module'" />
          </template>
          {{ displayMode === 'html' ? '纯文本' : 'HTML' }}
        </t-button>

      </div>
    </div>

    <!-- 邮件内容 -->
    <div class="bg-white rounded-lg shadow-sm flex-grow">
      <div :class="[
        'email-content',
        'p-6',
        displayMode === 'text' ? 'bg-gray-50 font-mono text-sm' : ''
      ]">
        <div v-if="displayMode === 'html'" v-html="processedContent" />
        <div v-else class="whitespace-pre-wrap">{{ processedContent }}</div>
      </div>
    </div>

    <!-- 附件区域 -->
    <div v-if="email.attachments?.length" class="bg-white rounded-lg shadow-sm p-4 mt-4">
      <div class="flex items-center space-x-2 mb-3">
        <t-icon name="attachment" class="text-blue-600" />
        <span class="text-sm font-medium">附件</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <t-tag v-for="attachment in email.attachments" :key="attachment" theme="primary" variant="light"
          class="rounded-full">
          <template #icon>
            <t-icon name="file" />
          </template>
          {{ attachment }}
        </t-tag>
      </div>
    </div>
  </div>
</template>

<style scoped>
.email-content {
  @apply transition-all duration-200;
}

.email-content :deep(img) {
  @apply max-w-full h-auto rounded-lg shadow-sm;
}

.email-content :deep(a) {
  @apply text-blue-600 hover:text-blue-800 transition-colors duration-200;
}

.email-content :deep(pre) {
  @apply bg-gray-50 p-4 rounded-lg font-mono text-sm my-4;
}

.email-content :deep(blockquote) {
  @apply border-l-4 border-gray-200 pl-4 my-4 text-gray-600;
}

.email-content :deep(table) {
  @apply w-full border-collapse;
}

.email-content :deep(td),
.email-content :deep(th) {
  @apply border border-gray-200 p-2;
}
</style>
