import { EmailMeta, EmailRecord, EmailSendRequest, Env } from '../types/email';
import * as emailService from '../services/emailService';

export async function handleStoreEmail(
  request: Request, 
  env: Env, 
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 开始处理存储邮件请求`);

  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${env.API_TOKEN}`) {
    console.warn(`[${requestId}] API Token验证失败`);
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const email = await request.json() as EmailRecord;
  try {
    await emailService.storeEmail(env.EMAILS, email, requestId);

    return new Response(
      JSON.stringify({
        message: 'Email stored successfully',
        emailId: email.id
      }), 
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(`[${requestId}] 存储邮件失败:`, error);
    throw error;
  }
}

export async function handleListEmails(
  request: Request, 
  env: Env, 
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

  try {
    // 检查并清理过期邮件
    const indexKey = 'email_index';
    const index = await env.EMAILS.get(indexKey, 'json') as EmailMeta[] || [];
    
    if (index.length > 500) {
      console.log(`[${requestId}] 邮件索引超过500条，开始清理旧邮件`);
      // 保留最新的500条记录
      const newIndex = index.slice(0, 500);
      // 需要删除的邮件ID
      const emailsToDelete = index.slice(500).map(email => email.id);
      
      // 批量删除旧邮件
      await Promise.all(emailsToDelete.map(async (emailId) => {
        await env.EMAILS.delete(`email:${emailId}`);
        console.log(`[${requestId}] 删除旧邮件: ${emailId}`);
      }));

      // 更新索引
      await env.EMAILS.put(indexKey, JSON.stringify(newIndex));
      console.log(`[${requestId}] 邮件索引清理完成，当前数量: ${newIndex.length}`);
    }

    const result = await emailService.listEmails(env.EMAILS, page, pageSize);
    
    return new Response(
      JSON.stringify({
        emails: result.emails,
        total: result.total,
        page,
        pageSize,
        totalPages: result.totalPages
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] 获取邮件列表失败:`, error);
    throw error;
  }
}

// 添加新的处理函数
export async function handleSendEmail(
    request: Request,
    env: Env,
    requestId: string
  ): Promise<Response> {
    console.log(`[${requestId}] 处理发送邮件请求`);
  
    try {
      const emailData = await request.json() as EmailSendRequest;
      
      // 基本验证
      if (!emailData.from || !emailData.to || !emailData.subject) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields',
            details: 'from, to, and subject are required' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
  
      const result = await emailService.sendEmail(
        env.RESEND_KEY,
        emailData,
        requestId
      );
  
      return new Response(
        JSON.stringify({
          message: 'Email sent successfully',
          ...result
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error(`[${requestId}] 发送邮件失败:`, error);
      
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }