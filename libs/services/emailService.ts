import { KVNamespace } from '@cloudflare/workers-types';
import { EmailRecord, EmailSendRequest, EmailType } from '../types/email';
import { CreateEmailResponse, Resend } from 'resend';
import { Buffer } from 'node:buffer';
import { updateUsersList } from './userService';
// 常量定义
const RECEIVED_EMAIL_PREFIX = 'received:';
const SENT_EMAIL_PREFIX = 'sent:';

/**
 * 生成邮件存储的键名
 */
function getEmailKey(emailId: string, type: EmailType): string {
  if (type === EmailType.NONE) {
    throw new Error('邮件类型不能为空');
  }
  const prefix = type === EmailType.SENT ? SENT_EMAIL_PREFIX : RECEIVED_EMAIL_PREFIX;
  return `${prefix}${emailId}`;
}

/**
 * 存储邮件记录
 */
export async function storeEmail(
  kv: KVNamespace,
  email: EmailRecord,
  requestId: string
): Promise<void> {
  await kv.put(getEmailKey(email.id, EmailType.RECEIVED), JSON.stringify(email));
  await updateUsersList(kv, email.to, requestId);
}

/**
 * 根据ID获取邮件内容
 */
export async function getEmailById(
  kv: KVNamespace,
  emailId: string,
  type: EmailType,
): Promise<EmailRecord | null> {
  if (type === EmailType.NONE) {
    // 分别查找已发送和已接收的邮件
    const receivedEmail = await kv.get(getEmailKey(emailId, EmailType.RECEIVED), 'json');
    if (receivedEmail) return receivedEmail as EmailRecord;

    const sentEmail = await kv.get(getEmailKey(emailId, EmailType.SENT), 'json');
    if (sentEmail) return sentEmail as EmailRecord;

    return null;
  }
  return kv.get(getEmailKey(emailId, type), 'json');
}

/**
 * 删除指定邮件
 */
export async function deleteEmail(
  kv: KVNamespace,
  emailId: string,
  type: EmailType,
): Promise<void> {
  if (type === EmailType.NONE) {
    // 尝试删除两种类型的邮件
    await kv.delete(getEmailKey(emailId, EmailType.RECEIVED));
    await kv.delete(getEmailKey(emailId, EmailType.SENT));
    return;
  }
  await kv.delete(getEmailKey(emailId, type));
}

/**
 * 分页获取邮件列表
 */
export async function listEmails(
  kv: KVNamespace,
  page: number,
  pageSize: number,
  type: EmailType
): Promise<{
  emails: EmailRecord[];
  total: number;
  totalPages: number;
}> {
  const prefix = type === EmailType.SENT ? SENT_EMAIL_PREFIX : RECEIVED_EMAIL_PREFIX;
  const list = await kv.list({ prefix });

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
  type: EmailType,
  maxEmails: number = 500
): Promise<void> {
  console.log(`[${requestId}] 开始检查邮件数量`);
  const prefix = type === EmailType.SENT ? SENT_EMAIL_PREFIX : RECEIVED_EMAIL_PREFIX;
  const list = await kv.list({ prefix: prefix });

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
 * 发送邮件并存储记录
 */
export async function sendEmail(
  kv: KVNamespace,
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

    // 存储发送的邮件记录
    const emailRecord: EmailRecord = {
      id: response.data?.id || crypto.randomUUID(),
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      receivedAt: new Date().toISOString(),
      spfStatus: 'pass',
      dmarcStatus: 'pass',
      dkimStatus: 'pass',
      headers: {},
      size: emailData.content.length,
      rawEmail: Buffer.from(emailData.content).toString('base64')
    };

    await kv.put(getEmailKey(emailRecord.id, EmailType.SENT), JSON.stringify(emailRecord));
    await updateUsersList(kv, emailData.from, requestId);
    console.log(`[${requestId}] 邮件发送成功并已存储:`, response);

    return response;
  } catch (error) {
    console.error(`[${requestId}] 邮件发送失败:`, error);
    throw error;
  }
}