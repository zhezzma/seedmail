import { drizzle } from 'drizzle-orm/d1'
import { emails, users } from '../app/db/schema'
import { sql } from 'drizzle-orm'
import { D1Database } from '@cloudflare/workers-types';
import * as crypto from 'node:crypto'


export async function seedEmails(db: D1Database) {
  const d1 = drizzle(db);
  const mockEmails: typeof emails.$inferInsert[] = [
    {
      id: crypto.randomUUID(),
      from: 'sender1@example.com',
      to: 'receiver@seedmail.com',
      subject: '测试邮件 1',
      receivedAt: new Date().toISOString(),
      spfStatus: 'pass',
      dmarcStatus: 'pass',
      dkimStatus: 'pass',
      headers: JSON.stringify({
        'message-id': '<message1@example.com>',
        'date': new Date().toISOString(),
      }),
      size: 1024,
      rawEmail: Buffer.from([
        `From: sender1@example.com`,
        `To: receiver@seedmail.com`,
        `Subject: 测试邮件 1`,
        `Message-ID: ${crypto.randomUUID()}`,
        `Date: ${new Date().toISOString()}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from("你好呀").toString('base64')
      ].join('\r\n')).toString('base64'),
      type: 'received',
      starred: 0
    }
  ]
  try {
    console.log('开始插入测试邮件数据...');

    for (const email of mockEmails) {
      await d1.insert(emails).values(email);
      console.log(`已插入邮件: ${email.subject}`);
    }

    console.log('测试数据插入完成！');
  } catch (error) {
    console.error('插入数据时出错:', error);
    throw error;
  }
}


