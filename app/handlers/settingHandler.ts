import { Env } from '../types/email';
import * as settingService from '../services/settingService';

/**
 * 处理获取设置的请求
 */
export async function handleGetSettings(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    try {
        const allSettings: Array<{ key: string, value: string | null }> = await settingService.getAllSettings(env.DB);
        const result: Record<string, any> = {};

        for (const setting of allSettings) {
            try {
                if (setting.value !== null) {
                    result[setting.key] = JSON.parse(setting.value);
                }
            } catch {
                result[setting.key] = setting.value;
            }
        }

        console.log(result)

        return new Response(
            JSON.stringify(result),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error(`[${requestId}] 获取设置失败:`, error);
        throw error;
    }
}

/**
 * 处理更新设置的请求
 */
export async function handleUpdateSettings(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    try {
        const body = await request.json();
        const currentSettings = await settingService.getAllSettings(env.DB);
        const currentKeys = new Set(currentSettings.map(s => s.key));
        
        // 处理新的设置
        for (const [key, value] of Object.entries(body)) {
            const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            await settingService.updateSettings(env.DB, key, settingValue);
            currentKeys.delete(key);
        }

        // 删除不存在于新设置中的旧键
        for (const key of currentKeys) {
            await settingService.deleteSettings(env.DB, key);
        }

        return new Response(
            JSON.stringify({ message: 'Settings updated successfully' }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error(`[${requestId}] 更新设置失败:`, error);
        throw error;
    }
}
