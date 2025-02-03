import { SystemSettings } from '../../src/types/setting';
import { getSettings } from '../services/settingService';
import { getTenantAccessToken, sendFeishuMessageText } from '../services/feishuService';
import { EmailRecord, EmailSendRequest, EmailType, Env } from '../types/email';
import PostalMime from 'postal-mime';


export async function handleEmailEvent(request: Request, env: Env, requestId: string): Promise<Response> {
    try {
        const emailData = await request.json() as EmailSendRequest;

        // 获取飞书配置
        const settingsStr = await getSettings(env.DB, 'feishu');
        if (!settingsStr) {
            return new Response('Feishu settings not found', { status: 404 });
        }

        const feishu = JSON.parse(settingsStr) as SystemSettings['feishu'];

        // 检查邮件接收者是否在配置的列表中
        if (!feishu.emails.includes(emailData.to)) {
            return new Response('Email not in notification list', { status: 403 });
        }
        const binaryData = Buffer.from(emailData.content, 'base64');
        const parsed = await PostalMime.parse(binaryData);
        // 构造通知消息
        const notificationMessage = `你的${emailData.to}收到新邮件通知\n标题：${emailData.subject}\n发送者：${emailData.from}\n时间：${parsed.date || new Date().toISOString()}\n内容：${parsed.text || parsed.html || '无'}`;

        // 发送通知
        try {
            const tenantResult = await getTenantAccessToken(feishu.app_id, feishu.app_secret);
            await sendFeishuMessageText(
                tenantResult.tenant_access_token,
                feishu.receive_id,
                notificationMessage
            );
            return new Response('Notification sent successfully', { status: 200 });
        } catch (error) {
            console.error('发送通知失败:', error);
            return new Response('Failed to send notification', { status: 500 });
        }
    } catch (error) {
        console.error('处理请求失败:', error);
        return new Response('Internal server error', { status: 500 });
    }
}
