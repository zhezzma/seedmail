<script setup lang="ts">
import EmailList from '../components/EmailList.vue';
import EmailDetail from '../components/EmailDetail.vue';
import { ref } from 'vue';

const selectedEmailId = ref<string | null>(null);
const showDetail = ref(false);

const handleEmailSelect = (id: string) => {
  selectedEmailId.value = id;
  showDetail.value = true;
};

const handleBack = () => {
  showDetail.value = false;
};
</script>

<template>
  <div class="w-full flex h-full">
    <div class="w-full md:w-1/5 border-r border-gray-200 overflow-auto h-full"
      :class="{ 'hidden md:block': showDetail }">
      <EmailList type="starred" @select-email="handleEmailSelect" :selected-email-id="selectedEmailId" />
    </div>

    <div class="w-full md:w-4/5 overflow-auto h-full" :class="{ 'hidden md:block': !showDetail }">
      <div v-if="selectedEmailId" class="md:hidden p-4 border-b border-gray-200">
        <button class="flex items-center text-gray-600" @click="handleBack">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clip-rule="evenodd" />
          </svg>
          返回
        </button>
      </div>
      <EmailDetail v-if="selectedEmailId" :email-id="selectedEmailId" />
      <div v-else class="h-full flex items-center justify-center text-gray-500">
        <t-empty description="请选择一封邮件查看详情" />
      </div>
    </div>
  </div>
</template>
