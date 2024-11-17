import { EmailRecord, EmailSendRequest, EmailType, Env } from '../types/email';
import * as emailService from '../services/emailService';
import PostalMime from 'postal-mime';
import { Buffer } from 'node:buffer';

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
 * @param type 邮件类型，默认为接收的邮件
 * @returns HTTP响应，包含分页的邮件列表
 */
export async function handleListEmails(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {

  const url = new URL(request.url);
  const type = url.searchParams.get('type') as EmailType || EmailType.NONE;
  if (type === EmailType.NONE) {
    throw new Error('type不能为空');
  }
  // 解析分页参数
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

  try {
    await emailService.cleanupOldEmails(env.EMAILS, requestId, type);
    const result = await emailService.listEmails(env.EMAILS, page, pageSize, type);

    return new Response(
      JSON.stringify({
        emails: result.emails.map((email) => {
          return {
            id: email.id,
            from: email.from,
            to: email.to,
            subject: email.subject,
            receivedAt: email.receivedAt,
            spfStatus: email.spfStatus,
            dmarcStatus: email.dmarcStatus,
            dkimStatus: email.dkimStatus,
          };
        }),
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
      env.EMAILS,
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
 * 处理获取邮件详情的请求
 * @param request HTTP请求对象
 * @param env 环境变量
 * @param requestId 请求ID，用于日志追踪
 * @returns HTTP响应，包含邮件详情
 */
export async function handleGetEmail(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const emailId = url.pathname.split('/').pop()!;
  const type = url.searchParams.get('type') as EmailType || EmailType.NONE;

  try {
    const email = await emailService.getEmailById(env.EMAILS, emailId, type);

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { rawEmail } = email;
    const binaryData = Buffer.from(rawEmail, 'base64');
    const parsed = await PostalMime.parse(binaryData);
    const result = { id: email.id, ...parsed };

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] 获取邮件详情失败:`, error);
    throw error;
  }
}

/**
 * 处理删除用户的请求
 */
export async function handleDeleteEmail(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {

  const url = new URL(request.url);
  const kv = env.EMAILS;
  const emailId = url.pathname.split('/').pop()!;
  const type = url.searchParams.get('type') as EmailType || EmailType.NONE;

  if (!emailId) {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    await emailService.deleteEmail(env.EMAILS, emailId, type);
    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(`[${requestId}] 删除邮件失败:`, error);
    throw error;
  }
}
