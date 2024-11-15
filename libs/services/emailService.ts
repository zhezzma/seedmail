import { KVNamespace } from '@cloudflare/workers-types';
import { EmailRecord, EmailMeta, EmailSendRequest } from '../types/email';
import { CreateEmailResponse, Resend } from 'resend';

// 关键常量定义
const EMAIL_INDEX_KEY = 'email_index';
const RECIPIENTS_KEY = 'all_recipients';
// 新增事务版本号key常量
const EMAIL_INDEX_VERSION = 'email_index_version';

// 工具函数 - 生成 email 存储 key
function getEmailKey(emailId: string): string {
  return `email:${emailId}`;
}

export async function updateEmailIndex(
  kv: KVNamespace,
  emailMeta: EmailMeta,
  requestId: string
): Promise<void> {
  // 验证输入数据
  if (!emailMeta || !emailMeta.id) {
    throw new Error('无效的邮件元数据');
  }

  const maxRetries = 5;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // 获取当前版本号和索引数据
      const [version, currentIndex] = await Promise.all([
        kv.get(EMAIL_INDEX_VERSION),
        kv.get(EMAIL_INDEX_KEY, 'json') as Promise<EmailMeta[]>
      ]);
      
      const currentVersion = version || '0';
      const indexData = Array.isArray(currentIndex) ? currentIndex : [];
      
      // 检查是否已存在相同ID的邮件
      if (indexData.some(item => item.id === emailMeta.id)) {
        console.log(`[${requestId}] 邮件ID已存在，跳过更新: ${emailMeta.id}`);
        return;
      }
      
      // 准备新数据
      const newIndex = [emailMeta, ...indexData];
      const newVersion = (parseInt(currentVersion) + 1).toString();
      
      // 使用事务操作确保原子性
      try {
        // 重新获取版本号验证是否发生变化
        const checkVersion = await kv.get(EMAIL_INDEX_VERSION);
        
        if (checkVersion !== currentVersion) {
          throw new Error('版本号已变化');
        }

        await Promise.all([
          kv.put(EMAIL_INDEX_KEY, JSON.stringify(newIndex)),
          kv.put(EMAIL_INDEX_VERSION, newVersion)
        ]);

        console.log(`[${requestId}] 邮件索引更新成功`);
        return;
      } catch (transactionError) {
        console.log(`[${requestId}] 事务失败，准备重试`);
        throw transactionError; // 抛出错误以触发重试
      }

    } catch (error) {
      retryCount++;
      console.error(`[${requestId}] 更新出错 (${retryCount}/${maxRetries}):`, error);
      
      if (retryCount === maxRetries) {
        throw new Error(`邮件索引更新失败: ${error.message}`);
      }
      
      // 使用指数退避策略
      const delay = Math.min(100 * Math.pow(2, retryCount), 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('邮件索引更新失败: 已达到最大重试次数');
}

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

export async function storeEmail(
  kv: KVNamespace,
  email: EmailRecord,
  requestId: string
): Promise<void> {
  await kv.put(getEmailKey(email.id), JSON.stringify(email));

  const emailMeta: EmailMeta = {
    id: email.id,
    from: email.from,
    to: email.to,
    subject: email.subject,
    receivedAt: email.receivedAt
  };

  // 存储收件人
  await updateRecipientsList(kv, email.to, requestId);
  
  await updateEmailIndex(kv, emailMeta, requestId);
}

export async function getEmailById(
  kv: KVNamespace,
  emailId: string
): Promise<EmailRecord | null> {
  return kv.get(getEmailKey(emailId), 'json');
}

export async function deleteEmail(
  kv: KVNamespace,
  emailId: string
): Promise<void> {
  await kv.delete(getEmailKey(emailId));

  const currentIndex = await kv.get(EMAIL_INDEX_KEY, 'json') as EmailMeta[] || [];
  const newIndex = currentIndex.filter(item => item.id !== emailId);
  await kv.put(EMAIL_INDEX_KEY, JSON.stringify(newIndex));
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
  const index = await kv.get(EMAIL_INDEX_KEY, 'json') as EmailMeta[] || [];

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const emails = index.slice(start, end);

  return {
    emails,
    total: index.length,
    totalPages: Math.ceil(index.length / pageSize)
  };
}

export async function cleanupOldEmails(
  kv: KVNamespace,
  requestId: string,
  maxEmails: number = 500
): Promise<void> {
  const index = await kv.get(EMAIL_INDEX_KEY, 'json') as EmailMeta[] || [];
    
  if (index.length > maxEmails) {
    console.log(`[${requestId}] 邮件索引超过${maxEmails}条，开始清理旧邮件`);
    const newIndex = index.slice(0, maxEmails);
    const emailsToDelete = index.slice(maxEmails).map(email => email.id);
    
    await Promise.all(emailsToDelete.map(async (emailId) => {
      await kv.delete(getEmailKey(emailId));
      console.log(`[${requestId}] 删除旧邮件: ${emailId}`);
    }));

    await kv.put(EMAIL_INDEX_KEY, JSON.stringify(newIndex));
    console.log(`[${requestId}] 邮件索引清理完成，当前数量: ${newIndex.length}`);
  }
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