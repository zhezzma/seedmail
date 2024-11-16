<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FormInstanceFunctions, FormProps, MessagePlugin } from 'tdesign-vue-next';
import { emailApi } from '../services/emailApi';

const router = useRouter();
const loading = ref(false);
const form = ref<FormInstanceFunctions>();
  const route = useRoute();
const formData = reactive({
  from: route.query.from as string || '',
  to: route.query.to as string || '',
  subject:  '',
  content: ''
});

// 邮箱验证正则
const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

const rules = {
  from: [
    { required: true, message: '请输入发件人邮箱', trigger: 'blur' },
    { pattern: emailPattern, message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  to: [
    { required: true, message: '请输入收件人邮箱', trigger: 'blur' },
    { pattern: emailPattern, message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  subject: [{ required: true, message: '请输入主题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
};

const handleSubmit: FormProps['onSubmit'] =async ({ validateResult, firstError }) => {
  if (!validateResult) {
    MessagePlugin.warning(firstError!);
    return;
  }

  loading.value = true;
  try {
    await emailApi.sendEmail(formData);
    MessagePlugin.success('发送成功');
    router.push('/emails');
  } catch (error) {
    MessagePlugin.error('发送失败');
  } finally {
    loading.value = false;
  }
};

const handleBack = () => {
  router.back();
};

// 添加富文本编辑器的占位文本
const placeholderText = `
亲爱的收件人：

请在此处输入您的邮件内容...

此致
敬礼
`;
</script>
<template>
  <div class="p-6">
    <!-- 头部导航 -->
    <div class="flex items-center justify-between mb-8">

      <h1 class="text-2xl font-bold ml-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
        写邮件
      </h1>
      <t-button theme="default" variant="outline" @click="handleBack" class="hover:bg-gray-50">
        <template #icon>
          <t-icon name="arrow-left" />
        </template>
        返回
      </t-button>
    </div>

    <!-- 邮件表单卡片 -->
    <t-card class="shadow-lg rounded-xl">
      <t-form
        ref="form"
        :data="formData"
        :rules="rules"
        :colon="true"
        label-align="top"
        @submit="handleSubmit"
      >
        <!-- 发件人输入框 -->
        <t-form-item label="发件人" name="from">
          <t-input
            v-model="formData.from"
            placeholder="请输入发件人邮箱"
            class="hover:border-blue-300 focus:border-blue-500 transition-colors"
          >
            <template #prefix-icon>
              <t-icon name="user" />
            </template>
          </t-input>
        </t-form-item>

        <!-- 收件人输入框 -->
        <t-form-item label="收件人" name="to">
          <t-input
            v-model="formData.to"
            placeholder="请输入收件人邮箱"
            class="hover:border-blue-300 focus:border-blue-500 transition-colors"
          >
            <template #prefix-icon>
              <t-icon name="user-circle" />
            </template>
          </t-input>
        </t-form-item>

        <!-- 主题输入框 -->
        <t-form-item label="主题" name="subject">
          <t-input
            v-model="formData.subject"
            placeholder="请输入邮件主题"
            class="hover:border-blue-300 focus:border-blue-500 transition-colors"
          >
            <template #prefix-icon>
              <t-icon name="edit" />
            </template>
          </t-input>
        </t-form-item>

        <!-- 内容编辑区 -->
        <t-form-item label="内容" name="content">
          <t-textarea
            v-model="formData.content"
            :placeholder="placeholderText"
            :autosize="{ minRows: 8 }"
            class="email-content-editor hover:border-blue-300 focus:border-blue-500 transition-colors"
          />
        </t-form-item>

        <!-- 操作按钮 -->
        <t-form-item class="flex justify-end">
          <t-space size="large">
            <t-button 
              theme="default" 
              variant="outline" 
              @click="handleBack"
              class="min-w-[120px] hover:bg-gray-50"
            >
              取消
            </t-button>
            <t-button
              theme="primary"
              type="submit"
              :loading="loading"
              class="min-w-[120px] shadow-md hover:shadow-lg transition-shadow"
            >
              <template #icon>
                <t-icon name="send" />
              </template>
              发送
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>
  </div>
</template>

<style scoped>
.email-content-editor {
  @apply rounded-lg font-normal;
}

.email-content-editor:deep(.t-textarea__inner) {
  @apply p-4 leading-relaxed;
}

:deep(.t-form__label) {
  @apply text-gray-600 font-medium;
}

:deep(.t-input),
:deep(.t-textarea) {
  @apply rounded-lg;
}





</style>