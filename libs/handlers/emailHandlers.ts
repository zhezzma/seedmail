import { EmailRecord, EmailSendRequest, Env } from '../types/email';
import * as emailService from '../services/emailService';

/**
 * 处理存储邮件的请求
 * @param request HTTP请求对象
 * @param env 环境变量
 * @param requestId 请求ID，用于日志追踪
 * @returns HTTP响应
 */
export async function handleStoreEmail(
  request: Request, 
  env: Env, 
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 开始处理存储邮件请求`);

  // 验证API令牌
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

/**
 * 处理获取邮件列表的请求
 * @param request HTTP请求对象
 * @param env 环境变量
 * @param requestId 请求ID，用于日志追踪
 * @returns HTTP响应，包含分页的邮件列表
 */
export async function handleListEmails(
  request: Request, 
  env: Env, 
  requestId: string
): Promise<Response> {
  // 解析分页参数
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

  try {
    // 检查并清理过期邮件
    await emailService.cleanupOldEmails(env.EMAILS, requestId);

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

/**
 * 处理发送邮件的请求
 * @param request HTTP请求对象
 * @param env 环境变量
 * @param requestId 请��ID，用于日志追踪
 * @returns HTTP响应，包含发送结果
 */
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

/**
 * 处理获取收件人列表的请求
 * @param request HTTP请求对象
 * @param env 环境变量
 * @param requestId 请求ID，用于日志追踪
 * @returns HTTP响应，包含分页的收件人列表
 */
export async function handleListRecipients(
  request: Request, 
  env: Env, 
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

  try {
    const result = await emailService.listRecipients(env.EMAILS, page, pageSize);
    
    return new Response(
      JSON.stringify({
        recipients: result.recipients,
        total: result.total,
        page,
        pageSize,
        totalPages: result.totalPages
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] 获取收件人列表失败:`, error);
    throw error;
  }
}