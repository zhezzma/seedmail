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
 * @property {Object.<string, string>} headers - 邮件头信息
 * @property {number} size - 邮件大小(字节)
 * @property {string} rawEmail - 原始邮件内容 base64 编码
 * @property {number} starred - 标记星标
 * @property {string} type - 邮件类型
 * @property {number} readed - 已读
 */

/**
 * 邮件处理主函数
 * 处理传入的邮件消息，包括保存记录和转发功能
 * 解析const binaryData = Uint8Array.from(atob(emailData.rawEmail), c => c.charCodeAt(0));
 * @param {ForwardableEmailMessage} message - Cloudflare Email消息对象
 * @param {Object} env - 环境变量对象
 * @param {KVNamespace} env.EMAILS - Cloudflare KV存储实例
 * @param {ExecutionContext} ctx - Cloudflare Workers执行上下文
 * @returns {Promise<Response>} 处理结果响应
 * @throws {Error} 当邮件处理过程中发生错误时抛出
 */
export async function emailHandler(message, env, ctx) {
  try {
    // 获取原始邮件内容并转换为 base64
    const rawArray = await new Response(message.raw).arrayBuffer();
    const rawBase64 = btoa(
      String.fromCharCode(...new Uint8Array(rawArray))
    );

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
      headers: Object.fromEntries(message.headers.entries()),
      size: message.rawSize,
      rawEmail: rawBase64, // base64 编码的原始邮件内容
      starred: 0,
      type: "received",
      readed: 0
    };


    // 存储邮件数据到 D1,from和to是保留关键字所以加上引号
    await env.DB.prepare(
      `INSERT INTO emails (
        id, "from", "to", subject, received_at, 
        spf_status, dmarc_status, dkim_status, headers, 
        size, raw_email, starred, type, readed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      emailData.id,
      emailData.from,
      emailData.to,
      emailData.subject,
      emailData.receivedAt,
      emailData.spfStatus,
      emailData.dmarcStatus,
      emailData.dkimStatus,
      JSON.stringify(emailData.headers),
      emailData.size,
      emailData.rawEmail,
      emailData.starred,
      emailData.type,
      emailData.readed
    ).run();

    // 检查用户是否存在，不存在则添加
    const user = await env.DB.prepare(
      "SELECT email FROM users WHERE email = ?"
    ).bind(message.to).first();

    if (!user) {
      await env.DB.prepare(
        "INSERT INTO users (email, created_at) VALUES (?, ?)"
      ).bind(message.to, new Date().toISOString()).run();
    }

    // 检查是否配置了通知服务
    if (env.notifyUrl && env.notifyToken) {
      try {
        await fetch(env.notifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.notifyToken}`
          },
          body: JSON.stringify({
            from: message.from,
            to: message.to,
            subject: emailData.subject,
            content: rawBase64
          })
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
        // 通知失败继续执行，不影响主流程
      }
    }

    // 仅在配置了转发地址时转发邮件
    if (env.forwardMail) {
      await forwardMail(env.forwardMail, message);
    }

    return new Response('Email processed successfully', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing email:', error);
    // 发生错误时仅在配置了转发地址时尝试转发邮件
    if (env.forwardMail) {
      await forwardMail(env.forwardMail, message).catch(err =>
        console.error('Forward failed after error:', err)
      );
    }
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
 * @param {string} mail - 转发地址
 * @param {ForwardableEmailMessage} message - Cloudflare Email消息对象
 * @returns {Promise<void>}
 */
async function forwardMail(mail, message) {
  try {
    await message.forward(mail);
  } catch (error) {
    console.error('Failed to forward email:', error);
    throw error;
  }
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