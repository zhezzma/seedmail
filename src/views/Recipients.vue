<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { MessagePlugin, PaginationProps, TableProps } from 'tdesign-vue-next';
import { emailApi } from '../services/emailApi';
import { useRouter } from 'vue-router';
import { h } from 'vue';
import { Button as TButton, Space as TSpace } from 'tdesign-vue-next';
interface Recipient {
  email: string;
}

const loading = ref(false);
const recipients = ref<Recipient[]>([]);
const pagination = ref({
  total: 0,
  current: 1,
  pageSize: 10
});

const columns = ref([
  { colKey: 'email', title: '邮箱地址', width: 300 },
  {
    colKey: 'operation',
    title: '操作',
    width: 120,
    cell: (d: any, { row }: { row: Recipient }) => {
      return h(TSpace, {}, {
        default: () => [
          h(TButton, {
            theme: 'primary',
            variant: 'text',
            onClick: () => sendMail(row)
          }, {
            default: () => '写信'
          })
        ]
      });
    }
  }
]);
const router = useRouter();
const sendMail = (row: Recipient) => {
  router.push({
    path: '/compose',
    query: {
      to: "",
      from: row.email,
      subject: ``,
    }
  });
};


const fetchRecipients = async (paginationInfo: PaginationProps) => {
  try {
    loading.value = true;
    const { current, pageSize } = paginationInfo;
    const response = await emailApi.listRecipients(current, pageSize);
    recipients.value = response.recipients.map((x: string) => {
      return {
        email: x
      };
    });
    pagination.value.total = response.total;
  } catch (error) {
    MessagePlugin.error('获取邮箱列表失败');
    recipients.value = [];
  } finally {
    loading.value = false;
  }
};

const onPageChange: TableProps['onPageChange'] = async (pageInfo) => {
  pagination.value.current = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;
  await fetchRecipients(pageInfo);
};

onMounted(async () => {
  await fetchRecipients({
    current: pagination.value.current,
    pageSize: pagination.value.pageSize,
  });
});
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
        邮箱列表
      </h1>
    </div>

    <t-card class="shadow-md rounded-xl overflow-hidden">
      <t-table :data="recipients" :columns="columns" :loading="loading" :pagination="pagination" row-key="email" hover
        stripe lazy-load @page-change="onPageChange" class="recipients-table">
        <template #empty>
          <div class="flex flex-col items-center justify-center py-12 text-gray-500">
            <t-icon name="user-circle" size="48px" class="mb-4 text-gray-300" />
            <p>暂无邮箱记录</p>
          </div>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<style scoped>
.recipients-table {
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
