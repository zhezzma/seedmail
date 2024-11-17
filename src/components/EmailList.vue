<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MessagePlugin, PaginationProps, TableProps } from 'tdesign-vue-next';
import { emailApi } from '../services/emailApi';
import type { EmailRecord } from '../types/email';
import { h } from 'vue';
import { Button as TButton, Space as TSpace } from 'tdesign-vue-next';

// 定义组件属性
const props = defineProps<{
  type: 'received' | 'sent'
}>();

const router = useRouter();
const loading = ref(false);
const emails = ref<EmailRecord[]>([]);
const pagination = ref({
  total: 100,
  current: 1,
  pageSize: 10
});

const columns = ref([
  { colKey: 'from', title: '发件人', width: 150 },
  { colKey: 'to', title: '收件人', width: 150 },
  { colKey: 'subject', title: '主题', width: 300 },
  {
    colKey: 'receivedAt',
    title: '接收时间',
    width: 120,
    cell: (h: any, { row }: { row: EmailRecord }) => {
      return new Date(row.receivedAt).toLocaleString();
    }
  },
  {
    colKey: 'operation',
    title: '操作',
    width: 120,
    cell: (d: any, { row }: { row: EmailRecord }) => {
      return h(TSpace, {}, {
        default: () => [
          h(TButton, {
            theme: 'primary',
            variant: 'text',
            onClick: () => handleView(row.id)
          }, {
            default: () => '查看'
          }),
          h(TButton, {
            theme: 'danger',
            variant: 'text',
            onClick: () => handleDelete(row.id)
          }, {
            default: () => '删除'
          })
        ]
      });
    }
  }
]);

const fetchEmails = async (paginationInfo: PaginationProps) => {
  try {
    loading.value = true;
    const { current, pageSize } = paginationInfo;
    const response = await emailApi.listEmails(props.type, current, pageSize);
    emails.value = response.emails;
    pagination.value.total = response.total;
  } catch (error) {
    MessagePlugin.error('获取邮件列表失败');
    emails.value = []
  } finally {
    loading.value = false;
  }
};

// ...其余方法保持不变...
const handleView = (id: string) => {
  router.push(`/emails/${id}`);
};

const handleDelete = async (id: string) => {
  try {
    await emailApi.deleteEmail(id);
    MessagePlugin.success('删除成功');
    
    const newTotal = pagination.value.total - 1;
    const maxPage = Math.ceil(newTotal / pagination.value.pageSize);
    
    if (pagination.value.current > maxPage) {
      pagination.value.current = Math.max(1, pagination.value.current - 1);
    }
    
    await fetchEmails({
      current: pagination.value.current,
      pageSize: pagination.value.pageSize,
    });
  } catch (error) {
    MessagePlugin.error('删除失败');
  }
};

const onPageChange: TableProps['onPageChange'] = async (pageInfo) => {
  pagination.value.current = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;
  await fetchEmails(pageInfo);
};

const handleCompose = () => {
  router.push('/compose');
};

onMounted(async () => {
  await fetchEmails({
    current: pagination.value.current,
    pageSize: pagination.value.pageSize,
  });
});
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
        {{ type === 'received' ? '收件箱' : '已发送' }}
      </h1>
      <t-button theme="primary" @click="handleCompose" class="shadow-md hover:shadow-lg transition-shadow">
        <template #icon>
          <t-icon name="edit" />
        </template>
        写邮件
      </t-button>
    </div>

    <t-card class="shadow-md rounded-xl overflow-hidden">
      <t-table :data="emails" :columns="columns" :loading="loading" :pagination="pagination" row-key="id" hover stripe
        lazy-load @page-change="onPageChange" class="email-table">
        <template #empty>
          <div class="flex flex-col items-center justify-center py-12 text-gray-500">
            <t-icon name="mail" size="48px" class="mb-4 text-gray-300" />
            <p>暂无邮件</p>
          </div>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<style scoped>
.email-table {
  :deep(.t-table__header) {
    @apply bg-gray-50;
  }

  :deep(.t-table__row) {
    @apply transition-colors duration-200;
  }

  :deep(.t-table__row:hover) {
    @apply bg-blue-50;
  }

  :deep(.t-table__cell) {
    @apply py-4;
  }

  :deep(.t-button) {
    @apply transition-colors duration-200;
  }
}

:deep(.t-pagination) {
  @apply mt-4;
}

:deep(.t-pagination .t-button) {
  @apply hover:bg-blue-50;
}

:deep(.t-pagination .t-is-active) {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}
</style>
