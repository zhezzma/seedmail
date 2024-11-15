<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { emailApi } from '../services/emailApi';
import type { EmailRecord } from '../types/email';
import DOMPurify from 'dompurify';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const email = ref<EmailRecord | null>(null);
const displayMode = ref<'html' | 'text'>('html');

// 处理邮件内容显示
const processedContent = computed(() => {
  if (!email.value?.content) return '';

  const content = email.value.content;

  // 处理 quoted-printable 和 UTF-8 编码
  const decodeQuotedPrintable = (text: string) => {
    // 移除换行符和等号
    const cleaned = text.replace(/=\r?\n/g, '');

    // 收集所有字节
    const bytes: number[] = [];
    let i = 0;

    while (i < cleaned.length) {
      if (cleaned[i] === '=' && i + 2 < cleaned.length) {
        // 处理十六进制编码
        const hex = cleaned.substr(i + 1, 2);
        bytes.push(parseInt(hex, 16));
        i += 3;
      } else {
        // 处理普通字符
        bytes.push(cleaned.charCodeAt(i));
        i += 1;
      }
    }

    // 使用 TextDecoder 进行 UTF-8 解码
    const decoder = new TextDecoder('utf-8');
    const decodedText = decoder.decode(new Uint8Array(bytes));

    // 处理 HTML 实体
    return decodedText
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/&/g, '&');
  };

  // 查找 quoted-printable 编码的内容
  const quotedPrintableMatch = content.match(/Content-Type: text\/html;[\s\S]*?quoted-printable\s*([\s\S]*?)(?=-{2}|$)/);

  if (quotedPrintableMatch && quotedPrintableMatch[1]) {
    const decodedText = decodeQuotedPrintable(quotedPrintableMatch[1].trim());

    if (displayMode.value === 'html') {
      return DOMPurify.sanitize(decodedText, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class'],
      });
    }

    return decodedText.replace(/<[^>]*>/g, '');
  }

  return content;
});

const fetchEmailDetail = async () => {
  const id = route.params.id as string;
  loading.value = true;
  try {
    email.value = await emailApi.getEmail(id);
  } catch (error) {
    MessagePlugin.error('获取邮件详情失败');
  } finally {
    loading.value = false;
  }
};

const toggleDisplayMode = () => {
  displayMode.value = displayMode.value === 'html' ? 'text' : 'html';
};

const handleBack = () => {
  router.back();
};

const handleReply = () => {
  router.push({
    path: '/compose',
    query: {
      to: email.value?.from,
      from: email.value?.to,
      subject: ``,
    }
  });
};

const headerInfo = computed(() => [
  {
    label: '发件人',
    value: email.value?.from,
    icon: 'user'
  },
  {
    label: '收件人',
    value: email.value?.to,
    icon: 'user-circle'
  },
  {
    label: '主题',
    value: email.value?.subject,
    icon: 'mail'
  },
  {
    label: '接收时间',
    value: email.value ? new Date(email.value.receivedAt).toLocaleString() : '',
    icon: 'time'
  }
]);

onMounted(fetchEmailDetail);
</script>
<template>
  <div class=" p-6">
    <!-- 头部导航 -->
    <div class="flex items-center mb-8">
      <t-button theme="default" variant="outline" @click="handleBack" class="hover:bg-gray-50">
        <template #icon>
          <t-icon name="arrow-left" />
        </template>
        返回列表
      </t-button>

      <h1 class="text-2xl font-bold ml-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
        邮件详情
      </h1>
    </div>

    <!-- 主要内容卡片 -->
    <t-card :loading="loading" class="shadow-lg rounded-xl overflow-hidden">
      <template v-if="email">
        <div class="space-y-8">
          <!-- 邮件信息网格 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
            <div v-for="item in headerInfo" :key="item.label" class="flex items-start space-x-3">
              <t-icon :name="item.icon" class="text-blue-600 mt-1" />
              <div>
                <div class="text-sm text-gray-500 mb-1">{{ item.label }}</div>
                <div class="font-medium">{{ item.value }}</div>
              </div>
            </div>
          </div>

          <!-- 显示模式切换 -->
          <div class="flex justify-end">
            <t-button size="small" variant="outline" @click="toggleDisplayMode" class="hover:bg-blue-50">
              <template #icon>
                <t-icon :name="displayMode === 'html' ? 'code' : 'view-module'" />
              </template>
              切换到{{ displayMode === 'html' ? '纯文本' : 'HTML' }}模式
            </t-button>
          </div>

          <!-- 邮件内容 -->
          <div class="email-content-wrapper">
            <div class="flex items-center space-x-2 mb-3">
              <t-icon name="file" class="text-blue-600" />
              <div class="text-gray-600 font-medium">邮件正文</div>
            </div>
            <div :class="[
              'email-content',
              'rounded-lg',
              'border',
              displayMode === 'html' ? 'p-6' : 'p-4 bg-gray-50 font-mono text-sm'
            ]">
              <div v-if="displayMode === 'html'" v-html="processedContent" />
              <div v-else>{{ processedContent }}</div>
            </div>
          </div>

          <!-- 附件区域 -->
          <div v-if="email.attachments?.length" class="border-t pt-6">
            <div class="flex items-center space-x-2 mb-4">
              <t-icon name="attachment" class="text-blue-600" />
              <div class="text-gray-600 font-medium">附件</div>
            </div>
            <t-space>
              <t-tag v-for="attachment in email.attachments" :key="attachment" theme="primary" variant="light"
                class="px-4 py-2 rounded-full">
                <template #icon>
                  <t-icon name="file" />
                </template>
                {{ attachment }}
              </t-tag>
            </t-space>
          </div>

          <div class="flex justify-end">
            <t-button theme="primary" @click="handleReply" class="ml-4">
              <template #icon>
                <t-icon name="reply" />
              </template>
              回复
            </t-button>
          </div>
        </div>
      </template>
    </t-card>
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

:deep(.t-loading__parent) {
  @apply min-h-[200px];
}
</style>