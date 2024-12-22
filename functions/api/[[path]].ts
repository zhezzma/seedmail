import { EventContext } from '@cloudflare/workers-types'
import { Env } from '../../app/types/email';
import { authMiddleware } from '../../app/middleware/auth';
import { handleOptions, addCorsHeaders } from '../../app/utils/cors';
import { handleLogin } from '../../app/handlers/authHandlers';
import {
    handleStoreEmail,
    handleListEmails,
    handleSendEmail,
    handleDeleteEmail,
    handleGetEmail,
    handleToggleStar,
    handleBatchDeleteEmails
} from '../../app/handlers/emailHandlers';
import { handleListUsers, handleDeleteUser } from '../../app/handlers/userHandler';
export const onRequest = async (context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> => {

    const request = context.request;
    const env = context.env as Env;

    console.log('环境变量:', env);

    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] 开始处理请求: ${request.method} ${request.url}`);

    if (request.method === 'OPTIONS') {
        return handleOptions();
    }

    try {
        const url = new URL(request.url);
        console.log(`[${requestId}] 请求路径: ${url.pathname}`);

        // 处理不需要验证的路由
        if (url.pathname === '/api/login' && request.method === 'POST') {
            const response = await handleLogin(request, env, requestId);
            return addCorsHeaders(response);
        }

        //接收邮件
        if (url.pathname === '/api/received' && request.method === 'POST') {
            const response = await handleStoreEmail(request, env, requestId);
            return addCorsHeaders(response);
        }

        // 验证权限
        const authResponse = await authMiddleware(request, env, requestId);
        if (authResponse) {
            return addCorsHeaders(authResponse);
        }

        // 路由处理
        let response: Response;
        switch (true) {
            //获取邮件列表
            case url.pathname === '/api/emails' && request.method === 'GET':
                response = await handleListEmails(request, env, requestId);
                break;
            //标星邮件
            case url.pathname.match(/^\/api\/email\/[\w-]+\/star$/) && request.method === 'POST':
                response = await handleToggleStar(request, env, requestId);
                break;
            //获取邮件详情
            case url.pathname.startsWith('/api/email/') && request.method === 'GET':
                response = await handleGetEmail(request, env, requestId);
                break;
            //删除邮件
            case url.pathname.startsWith('/api/email/') && request.method === 'DELETE':
                response = await handleDeleteEmail(request, env, requestId);
                break;
            //发送邮件
            case url.pathname === '/api/email' && request.method === 'POST':
                response = await handleSendEmail(request, env, requestId);
                break;
            //批量删除邮件
            case url.pathname === '/api/emails/batch' && request.method === 'DELETE':
                response = await handleBatchDeleteEmails(request, env, requestId);
                break;
            //获取邮箱列表
            case url.pathname === '/api/users' && request.method === 'GET':
                response = await handleListUsers(request, env, requestId);
                break;
            //删除用户
            case url.pathname.startsWith('/api/users/') && request.method === 'DELETE':
                response = await handleDeleteUser(request, env, requestId);
                break;
            default:
                console.log(`[${requestId}] 未找到匹配的路由`);
                response = new Response(
                    JSON.stringify({ error: 'Not Found' }),
                    {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
        }

        return addCorsHeaders(response);

    } catch (error) {
        console.error(`[${requestId}] 处理请求时发生错误:`, error);
        const errorResponse = new Response(
            JSON.stringify({
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );

        return addCorsHeaders(errorResponse);
    }

}