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



  const email = await request.json() as EmailRecord;
  try {
    await emailService.storeEmail(env.DB, email, requestId);

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
  const type = url.searchParams.get('type') as EmailType | 'starred';

  if (!type || (type !== EmailType.RECEIVED && type !== EmailType.SENT && type !== 'starred')) {
    return new Response(
      JSON.stringify({ error: 'Invalid type parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 解析分页参数
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

  try {
    const result = await emailService.listEmails(env.DB, page, pageSize, type);
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
 * @param requestId 请求ID，用于日志追踪
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
      env.DB,
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


  try {
    const email = await emailService.getEmailById(env.DB, emailId);

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
  const emailId = url.pathname.split('/').pop()!;

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
    await emailService.deleteEmail(env.DB, emailId);
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

/**
 * 处理标星/取消标星邮件的请求
 */
export async function handleToggleStar(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const emailId = url.pathname.split('/').slice(-2)[0]; // 获取邮件ID

  try {
    const isStarred = await emailService.toggleStarEmail(env.DB, emailId, requestId);

    return new Response(
      JSON.stringify({
        message: isStarred ? 'Email starred successfully' : 'Email unstarred successfully',
        starred: isStarred
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(`[${requestId}] 标星/取消标星邮件失败:`, error);
    throw error;
  }
}

/**
 * 处理批量删除邮件的请求
 */
export async function handleBatchDeleteEmails(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  try {
    const { ids } = await request.json() as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid email ids' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    await emailService.batchDeleteEmails(env.DB, ids);

    return new Response(
      JSON.stringify({ message: 'Emails deleted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(`[${requestId}] 批量删除邮件失败:`, error);
    throw error;
  }
}

/**
 * 获取指定条件的最新邮件
 */
export async function handleGetLatestEmail(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const to = url.searchParams.get('to');
  const from = url.searchParams.get('from');
  const timestamp = url.searchParams.get('timestamp');  //秒级的时间戳..

  if (!to || !from || !timestamp) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const email = await emailService.getLatestEmailByCondition(
      env.DB,
      to,
      from,
      parseInt(timestamp)
    ); 

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
    console.error(`[${requestId}] 获取指定邮件失败:`, error);
    throw error;
  }
}
