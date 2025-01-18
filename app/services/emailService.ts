import { D1Database } from '@cloudflare/workers-types';
import { EmailRecord, EmailSendRequest, EmailType } from '../types/email';
import { CreateEmailResponse, Resend } from 'resend';
import { Buffer } from 'node:buffer';
import { emails } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { updateUsersList } from './userService';
import * as crypto from 'node:crypto'
/**
 * 存储收到的邮件记录
 */
export async function storeEmail(
  db: D1Database,
  email: EmailRecord,
  requestId: string
): Promise<void> {
  const d1 = drizzle(db);
  await d1.insert(emails).values({
    ...email,
    headers: JSON.stringify(email.headers),
    type: EmailType.RECEIVED,
    starred: 0,
    readed: 0,
  });
  await updateUsersList(db, email.to, requestId);
}

/**
 * 根据ID获取邮件内容
 */
export async function getEmailById(
  db: D1Database,
  emailId: string
): Promise<EmailRecord | null> {
  const d1 = drizzle(db);
  const result = await d1.select().from(emails).where(eq(emails.id, emailId)).get();
  if (!result) return null;
  //已读邮件
  await d1.update(emails)
    .set({ readed: 1 })
    .where(eq(emails.id, emailId));
  return {
    ...result,
    headers: JSON.parse(result.headers)
  } as EmailRecord;
}

/**
 * 删除指定邮件
 */
export async function deleteEmail(
  db: D1Database,
  emailId: string
): Promise<void> {
  const d1 = drizzle(db);
  await d1.delete(emails).where(eq(emails.id, emailId));
}

/**
 * 批量删除邮件
 */
export async function batchDeleteEmails(
  db: D1Database,
  emailIds: string[]
): Promise<void> {
  const d1 = drizzle(db);
  
  if (emailIds.length === 0) return;
  
  // 使用问号占位符构建 IN 查询
  await d1.delete(emails).where(
    sql`id IN (${sql.join(emailIds, sql`, `)})`
  );
}

/**
 * 分页获取邮件列表
 */
export async function listEmails(
  db: D1Database,
  page: number,
  pageSize: number,
  type: EmailType | 'starred'
): Promise<{
  emails: (EmailRecord)[];
  total: number;
  totalPages: number;
}> {
  const d1 = drizzle(db);
  const offset = (page - 1) * pageSize;
  
  let query;
  if (type === 'starred') {
    query = eq(emails.starred, 1);
  } else {
    query = eq(emails.type, type);
  }
  
  const [emailResults, countResult] = await Promise.all([
    d1.select()
      .from(emails)
      .where(query)
      .orderBy(desc(emails.receivedAt))
      .limit(pageSize)
      .offset(offset),
    d1.select({ count: sql`count(*)` })
      .from(emails)
      .where(query)
      .get()
  ]);

  const total = Number(countResult?.count || 0);

  return {
    emails: emailResults.map(e => ({
      ...e,
      headers: JSON.parse(e.headers)
    })) as EmailRecord[],
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}

/**
 * 发送邮件并存储记录
 */
export async function sendEmail(
  db: D1Database,
  resendKey: string,
  emailData: EmailSendRequest,
  requestId: string
): Promise<CreateEmailResponse> {
  const resend = new Resend(resendKey);
  const response = await resend.emails.send({
    from: emailData.from,
    to: [emailData.to],
    subject: emailData.subject,
    html: emailData.content,
  });

  const date = new Date().toUTCString();
  const messageId = `<${response.data?.id || crypto.randomUUID()}@seedmail.com>`;
  const rawEmail = [
    `From: ${emailData.from}`,
    `To: ${emailData.to}`,
    `Subject: ${emailData.subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${date}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(emailData.content).toString('base64')
  ].join('\r\n');

  const emailRecord: EmailRecord = {
    id: response.data?.id || crypto.randomUUID(),
    from: emailData.from,
    to: emailData.to,
    type: EmailType.SENT,
    subject: emailData.subject,
    receivedAt: new Date().toISOString(),
    spfStatus: 'pass',
    dmarcStatus: 'pass',
    dkimStatus: 'pass',
    headers: {
      'message-id': messageId,
      'date': date
    },
    size: rawEmail.length,
    rawEmail: Buffer.from(rawEmail).toString('base64'),
    starred:0,
    readed:1
  };

  const d1 = drizzle(db);
  await d1.insert(emails).values({
    ...emailRecord,
    headers: JSON.stringify(emailRecord.headers),
  });
  await updateUsersList(db, emailData.from, requestId);
  return response;
}



/**
 * 标星/取消标星邮件
 */
export async function toggleStarEmail(
  db: D1Database,
  emailId: string,
  requestId: string
): Promise<boolean> {
  const d1 = drizzle(db);
  const email = await d1.select().from(emails).where(eq(emails.id, emailId)).get();
  
  if (!email) {
    throw new Error('Email not found');
  }

  const newStarred = email.starred === 0 ? 1 : 0;
  await d1.update(emails)
    .set({ starred: newStarred })
    .where(eq(emails.id, emailId));

  return newStarred === 1;
}

/**
 * 根据发件人、收件人和时间戳获取最新的邮件
 */
export async function getLatestEmailByCondition(
  db: D1Database,
  to: string,
  from: string,
  timestamp: number
): Promise<EmailRecord | null> {
  const d1 = drizzle(db);
  
  const result = await d1.select()
    .from(emails)
    .where(and(
      eq(emails.to, to),
      eq(emails.from, from),
      // 将 receivedAt 转换为时间戳进行比较
      sql`CAST(strftime('%s', ${emails.receivedAt}) AS INTEGER) >= ${timestamp}`
    ))
    .orderBy(desc(emails.receivedAt))
    .limit(1)
    .get();

  if (!result) return null;

  return {
    ...result,
    headers: JSON.parse(result.headers)
  } as EmailRecord;
}