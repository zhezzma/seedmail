/**
 * @typedef {Object} EmailRecord
 * @property {string} id - 唯一邮件ID
 * @property {string} from - 发件人
 * @property {string} to - 收件人
 * @property {string} subject - 邮件主题
 * @property {string} receivedAt - 接收时间
 * @property {string} spfStatus - SPF验证状态
 * @property {string} dmarcStatus - DMARC验证状态
 * @property {string} dkimStatus - DKIM验证状态
 * @property {'pending'|'sent'|'failed'} sendStatus - 发送状态
 * @property {string} content - 邮件内容
 * @property {Object.<string, string>} headers - 邮件头信息
 * @property {number} size - 邮件大小(字节)
 * @property {string} rawEmail - 原始邮件内容
 * @property {string[]} attachments - 附件列表
 */

/**
 * 邮件处理主函数
 * 处理传入的邮件消息，包括保存记录和转发功能
 * 
 * @param {ForwardableEmailMessage} message - Cloudflare Email消息对象
 * @param {Object} env - 环境变量对象
 * @param {KVNamespace} env.EMAILS - Cloudflare KV存储实例
 * @param {ExecutionContext} ctx - Cloudflare Workers执行上下文
 * @returns {Promise<Response>} 处理结果响应
 * @throws {Error} 当邮件处理过程中发生错误时抛出
 */
export async function emailHandler(message, env, ctx) {
  try {
    // 获取原始邮件内容
    const content = await new Response(message.raw).text();
    
    // 生成唯一ID和时间戳
    const emailId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // 构建完整的 EmailRecord 对象
    /** @type {EmailRecord} */
    const emailData = {
      id: emailId,
      from: message.from,
      to: message.to,
      subject: message.headers.get('subject') || '(无主题)',
      receivedAt: timestamp,
      spfStatus: message.headers.get('authentication-results-spf') || 'unknown',
      dmarcStatus: message.headers.get('authentication-results-dmarc') || 'unknown',
      dkimStatus: message.headers.get('authentication-results-dkim') || 'unknown',
      sendStatus: 'pending',
      content: content,
      headers: Object.fromEntries(message.headers.entries()),
      size: message.rawSize,
      rawEmail: content,
      attachments: await extractAttachments(message)
    };

    // 存储邮件数据到 KV
    await env.EMAILS.put(`email:${emailId}`, JSON.stringify(emailData));

    // 转发邮件
    await forwardMail(message);

    return new Response('Email processed successfully', { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing email:', error);
    // 发生错误时仍尝试转发邮件
    await forwardMail(message).catch(err => 
      console.error('Forward failed after error:', err)
    );
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 转发邮件到指定地址
 * @param {ForwardableEmailMessage} message - Cloudflare Email消息对象
 * @returns {Promise<void>}
 */
async function forwardMail(message) {
  try {
    await message.forward("zhepama@igiven.com");
  } catch (error) {
    console.error('Failed to forward email:', error);
    throw error;
  }
}

/**
 * 从邮件消息中提取附件信息
 * @param {ForwardableEmailMessage} message - Cloudflare Email消息对象
 * @returns {Promise<string[]>} 附件名称列表
 */
async function extractAttachments(message) {
  const attachments = [];
  // TODO: 实现附件提取逻辑
  return attachments;
}

/**
 * HTTP 请求处理函数
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function fetchHandler(request, env, ctx) {
  return new Response("Email service is running", {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}

/**
 * Worker 导出配置
 * @type {{email: typeof emailHandler, fetch: typeof fetchHandler}}
 */
export default {
  email: emailHandler,
  fetch: fetchHandler
};