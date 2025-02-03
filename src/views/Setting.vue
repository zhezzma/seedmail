<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { settingApi } from '../services/settingApi';
import type { SystemSettings } from '../types/setting';

const settings = ref<SystemSettings>({
    feishu: {
        app_id: '',
        app_secret: '',
        receive_id: '',
        verification_token: '',
        encrypt_key: '',
        emails: [] // 修改为空数组
    }
});

const loading = ref(false);

onMounted(async () => {
    try {
        const data = await settingApi.get();
        console.log(data);
        if (data && Object.keys(data).length > 0) {
            settings.value = data as SystemSettings;
        } else {
            MessagePlugin.warning('未找到现有配置，将使用默认值');
        }
    } catch (error) {
        MessagePlugin.error('获取设置失败'+error);
    }
});

const handleSave = async () => {
    loading.value = true;
    try {
        await settingApi.update(settings.value);
        MessagePlugin.success('保存成功');
    } catch (error) {
        MessagePlugin.error('保存失败');
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="setting-container p-2 md:p-5">

        <t-form :data="settings" @submit="handleSave">
            <t-card bordered>
                <t-divider>飞书配置</t-divider>
                <t-form-item label="应用ID" name="feishu.app_id">
                    <t-input v-model="settings.feishu.app_id" placeholder="请输入飞书应用ID" />
                </t-form-item>
                <t-form-item label="应用密钥" name="feishu.app_secret">
                    <t-input v-model="settings.feishu.app_secret" type="password" placeholder="请输入飞书应用密钥" />
                </t-form-item>
                <t-form-item label="验证Token" name="feishu.verification_token">
                    <t-input v-model="settings.feishu.verification_token" placeholder="请输入飞书应用验证Token" />
                </t-form-item>
                <t-form-item label="加密Key" name="feishu.encrypt_key">
                    <t-input v-model="settings.feishu.encrypt_key" placeholder="请输入飞书应用加密Key" />
                </t-form-item>
                <t-form-item label="接收ID" name="feishu.receive_id">
                    <t-input v-model="settings.feishu.receive_id" placeholder="请输入飞书机器人接收ID" />
                </t-form-item>
                <t-form-item label="预警邮箱" name="feishu.emails">
                    <t-tag-input
                        v-model="settings.feishu.emails"
                        placeholder="请输入预警邮箱，回车确认"
                        clearable
                        :tag-props="{ theme: 'primary', variant: 'light' }"
                    />
                </t-form-item>


                <t-form-item class="flex justify-center">
                    <t-button theme="primary" type="submit" :loading="loading">保存设置</t-button>
                </t-form-item>
            </t-card>


        </t-form>
    </div>
</template>

<style scoped></style>
