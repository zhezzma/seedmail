import { KVNamespace } from '@cloudflare/workers-types';
import { EmailRecord, EmailSendRequest } from '../types/email';
import { CreateEmailResponse, Resend } from 'resend';

// 常量定义
const RECIPIENTS_KEY = 'all_recipients';
const EMAIL_PREFIX = 'email:';

/**
 * 生成邮件存储的键名
 */
function getEmailKey(emailId: string): string {
  return `${EMAIL_PREFIX}${emailId}`;
}

/**
 * 更新收件人列表
 */
async function updateRecipientsList(
  kv: KVNamespace,
  email: string,
  requestId: string
): Promise<void> {
  const recipients = await kv.get(RECIPIENTS_KEY, 'json') as string[] || [];
  if (!recipients.includes(email)) {
    recipients.push(email);
    await kv.put(RECIPIENTS_KEY, JSON.stringify(recipients));
    console.log(`[${requestId}] 新收件人已添加: ${email}`);
  }
}

/**
 * 存储邮件记录
 */
export async function storeEmail(
  kv: KVNamespace,
  email: EmailRecord,
  requestId: string
): Promise<void> {
  await kv.put(getEmailKey(email.id), JSON.stringify(email));
  await updateRecipientsList(kv, email.to, requestId);
}

/**
 * 根据ID获取邮件内容
 */
export async function getEmailById(
  kv: KVNamespace,
  emailId: string
): Promise<EmailRecord | null> {
  return kv.get(getEmailKey(emailId), 'json');
}

/**
 * 删除指定邮件
 */
export async function deleteEmail(
  kv: KVNamespace,
  emailId: string
): Promise<void> {
  await kv.delete(getEmailKey(emailId));
}

/**
 * 分页获取邮件列表
 */
export async function listEmails(
  kv: KVNamespace,
  page: number,
  pageSize: number
): Promise<{
  emails: EmailRecord[];
  total: number;
  totalPages: number;
}> {
  const list = await kv.list({ prefix: EMAIL_PREFIX });
  
  // 获取所有邮件并过滤掉null值
  const allEmails = (await Promise.all(
    list.keys.map(key => kv.get(key.name, 'json'))
  )).filter((email): email is EmailRecord => email !== null);

  // 更新total为实际存在的邮件数量
  const total = allEmails.length;

  // 按接收时间降序排序
  allEmails.sort((a, b) => {
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });
  
  // 分页处理
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const emails = allEmails.slice(start, end);

  return {
    emails,
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}

/**
 * 清理过期邮件
 * 按照邮件接收时间排序，保留最新的邮件
 */
export async function cleanupOldEmails(
  kv: KVNamespace,
  requestId: string,
  maxEmails: number = 500
): Promise<void> {
  console.log(`[${requestId}] 开始检查邮件数量`);
  const list = await kv.list({ prefix: EMAIL_PREFIX });
  
  if (list.keys.length > maxEmails) {
    console.log(`[${requestId}] 邮件超过${maxEmails}条，开始清理旧邮件`);
    
    // 获取所有邮件并按时间排序
    const emails = await Promise.all(
      list.keys.map(async (key) => {
        const email = await kv.get(key.name, 'json') as EmailRecord;
        return { key: key.name, email };
      })
    );
    
    // 按接收时间降序排序
    emails.sort((a, b) => {
      return new Date(b.email.receivedAt).getTime() - new Date(a.email.receivedAt).getTime();
    });
    
    // 获取需要删除的邮件（保留最新的 maxEmails 条）
    const keysToDelete = emails.slice(maxEmails).map(item => item.key);
    
    // 删除旧邮件
    await Promise.all(keysToDelete.map(async (key) => {
      await kv.delete(key);
      console.log(`[${requestId}] 删除旧邮件: ${key}`);
    }));

    console.log(`[${requestId}] 邮件清理完成，已删除 ${keysToDelete.length} 条邮件`);
  }
}

/**
 * 发送邮件
 * 使用Resend服务发送邮件
 * @param resendKey Resend API密钥
 * @param emailData 要发送的邮件数据
 * @param requestId 请求ID
 * @returns 发送响应结果
 */
export async function sendEmail(
  resendKey: string,
  emailData: EmailSendRequest,
  requestId: string
): Promise<CreateEmailResponse> {
  console.log(`[${requestId}] 开始发送邮件`);

  try {
    const resend = new Resend(resendKey);

    const response = await resend.emails.send({
      from: emailData.from,
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.content,
    });

    console.log(`[${requestId}] 邮件发送成功:`, response);

    return response;
  } catch (error) {
    console.error(`[${requestId}] 邮件发送失败:`, error);
    throw error;
  }
}

/**
 * 分页获取收件人列表
 * @param kv KV存储实例
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 分页后的收件人列表及分页信息
 */
export async function listRecipients(
  kv: KVNamespace,
  page: number,
  pageSize: number
): Promise<{
  recipients: string[];
  total: number;
  totalPages: number;
}> {
  const recipients = await kv.get(RECIPIENTS_KEY, 'json') as string[] || [];

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedRecipients = recipients.slice(start, end);

  return {
    recipients: paginatedRecipients,
    total: recipients.length,
    totalPages: Math.ceil(recipients.length / pageSize)
  };
}