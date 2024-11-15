import { KVNamespace } from '@cloudflare/workers-types';
import { EmailRecord, EmailMeta, EmailSendRequest } from '../types/email';
import { CreateEmailResponse, Resend } from 'resend';

/**
 * 关键常量定义
 * EMAIL_INDEX_KEY: 存储所有邮件索引的键
 * RECIPIENTS_KEY: 存储所有收件人列表的键
 * EMAIL_INDEX_VERSION: 邮件索引版本号的键，用于并发控制
 */
const EMAIL_INDEX_KEY = 'email_index';
const RECIPIENTS_KEY = 'all_recipients';
const EMAIL_INDEX_VERSION = 'email_index_version';

/**
 * 生成邮件存储的键名
 * @param emailId 邮件ID
 * @returns 格式化的键名
 */
function getEmailKey(emailId: string): string {
  return `email:${emailId}`;
}

/**
 * 更新邮件索引
 * 使用乐观锁机制确保并发安全
 * @param kv KV存储实例
 * @param emailMeta 邮件元数据
 * @param requestId 请求ID，用于日志追踪
 */
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
        // 重新获取版本��验证是否发生变化
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
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`[${requestId}] 更新出错 (${retryCount}/${maxRetries}):`, errorMessage);
      
      if (retryCount === maxRetries) {
        throw new Error(`邮件索引更新失败: ${errorMessage}`);
      }
      
      // 使用指数退避策略
      const delay = Math.min(100 * Math.pow(2, retryCount), 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('邮件索引更新失败: 已达到最大重试次数');
}

/**
 * 更新收件人列表
 * 如果收件人不存在则添加到列表中
 * @param kv KV存储实例
 * @param email 收件人邮箱
 * @param requestId 请求ID
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
 * 包括存储完整邮件内容、更新索引和收件人列表
 * @param kv KV存储实例
 * @param email 完整的邮件记录
 * @param requestId 请求ID
 */
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

/**
 * 根据ID获取邮件内容
 * @param kv KV存储实例
 * @param emailId 邮件ID
 * @returns 邮件记录或null
 */
export async function getEmailById(
  kv: KVNamespace,
  emailId: string
): Promise<EmailRecord | null> {
  return kv.get(getEmailKey(emailId), 'json');
}

/**
 * 删除指定邮件
 * 同时更新邮件索引
 * @param kv KV存储实例
 * @param emailId 要删除的邮件ID
 */
export async function deleteEmail(
  kv: KVNamespace,
  emailId: string
): Promise<void> {
  await kv.delete(getEmailKey(emailId));

  const currentIndex = await kv.get(EMAIL_INDEX_KEY, 'json') as EmailMeta[] || [];
  const newIndex = currentIndex.filter(item => item.id !== emailId);
  await kv.put(EMAIL_INDEX_KEY, JSON.stringify(newIndex));
}

/**
 * 分页获取邮件列表
 * @param kv KV存储实例
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 分页后的邮件列表及分页信息
 */
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

/**
 * 清理过期邮件
 * 当邮件数量超过限制时，删除最旧的邮件
 * @param kv KV存储实例
 * @param requestId 请求ID
 * @param maxEmails 最大保留邮件数，默认500
 */
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