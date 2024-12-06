<script setup lang="ts">

import EmailDetail from '../components/EmailDetail.vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
const selectedEmailId = ref<string | null>(null);


selectedEmailId.value = route.params.id.toString();

const handleBack = () => {
  router.back();
};

</script>

<template>
    <div class="h-full w-full">
        <!-- 头部导航 -->
        <div class="flex items-center  justify-between mb-8">

            <h1
                class="text-2xl font-bold ml-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                邮件详情
            </h1>

            <t-button theme="default" variant="outline" @click="handleBack" class="hover:bg-gray-50">
                <template #icon>
                    <t-icon name="arrow-left" />
                </template>
                返回
            </t-button>
        </div>
        <EmailDetail v-if="selectedEmailId" :email-id="selectedEmailId" />
        <div v-else class="h-full flex items-center justify-center text-gray-500">
            <t-empty description="请选择一封邮件查看详情" />
        </div>
    </div>
</template>

<style scoped></style>
