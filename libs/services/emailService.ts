import { KVNamespace } from '@cloudflare/workers-types';
import { EmailRecord, EmailMeta, EmailSendRequest } from '../types/email';
import { CreateEmailResponse, Resend } from 'resend';


const LOCK_TTL = 5000; // 锁定时间 5 秒

async function acquireLock(
  kv: KVNamespace,
  lockKey: string,
  requestId: string
): Promise<boolean> {
  const now = Date.now();
  const lockValue = JSON.stringify({ requestId, timestamp: now });

  try {
    await kv.put(lockKey, lockValue, { expirationTtl: LOCK_TTL / 1000 });
    return true;
  } catch {
    return false;
  }
}

async function releaseLock(
  kv: KVNamespace,
  lockKey: string
): Promise<void> {
  await kv.delete(lockKey);
}

export async function updateEmailIndex(
  kv: KVNamespace,
  emailMeta: EmailMeta,
  requestId: string
): Promise<void> {
  const indexKey = 'email_index';
  const lockKey = 'email_index_lock';
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // 尝试获取锁
      const locked = await acquireLock(kv, lockKey, requestId);
      if (!locked) {
        throw new Error('Failed to acquire lock');
      }

      try {
        // 获取并更新索引
        const currentIndex = await kv.get(indexKey, 'json') as EmailMeta[] || [];
        const newIndex = [emailMeta, ...currentIndex];
        await kv.put(indexKey, JSON.stringify(newIndex));

        console.log(`[${requestId}] 邮件索引更新成功`);
        return;
      } finally {
        // 确保释放锁
        await releaseLock(kv, lockKey);
      }
    } catch (error) {
      retryCount++;
      if (retryCount === maxRetries) {
        console.error(`[${requestId}] 邮件索引更新失败，已达到最大重试次数`);
        throw new Error('Failed to update email index after maximum retries');
      }
      console.log(`[${requestId}] 邮件索引更新冲突，准备重试 (${retryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    }
  }
}

export async function storeEmail(
  kv: KVNamespace,
  email: EmailRecord,
  requestId: string
): Promise<void> {
  await kv.put(`email:${email.id}`, JSON.stringify(email));

  const emailMeta: EmailMeta = {
    id: email.id,
    from: email.from,
    to: email.to,
    subject: email.subject,
    receivedAt: email.receivedAt
  };

  await updateEmailIndex(kv, emailMeta, requestId);
}

export async function getEmailById(
  kv: KVNamespace,
  emailId: string
): Promise<EmailRecord | null> {
  return kv.get(`email:${emailId}`, 'json');
}

export async function deleteEmail(
  kv: KVNamespace,
  emailId: string
): Promise<void> {
  await kv.delete(`email:${emailId}`);

  const indexKey = 'email_index';
  const currentIndex = await kv.get(indexKey, 'json') as EmailMeta[] || [];
  const newIndex = currentIndex.filter(item => item.id !== emailId);
  await kv.put(indexKey, JSON.stringify(newIndex));
}

export async function listEmails(
  kv: KVNamespace,
  page: number,
  pageSize: number
): Promise<{
  emails: EmailMeta[];
  total: number;
  totalPages: number;
}> {
  const indexKey = 'email_index';
  const index = await kv.get(indexKey, 'json') as EmailMeta[] || [];

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const emails = index.slice(start, end);

  return {
    emails,
    total: index.length,
    totalPages: Math.ceil(index.length / pageSize)
  };
}


// 添加发送邮件的服务方法
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