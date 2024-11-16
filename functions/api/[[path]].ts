import { EventContext } from '@cloudflare/workers-types'
import { Env } from '../../libs/types/email';
import { authMiddleware } from '../../libs/middleware/auth';
import { handleOptions, addCorsHeaders } from '../../libs/utils/cors';
import { handleLogin } from '../../libs/handlers/authHandlers';
import {
    handleStoreEmail,
    handleListEmails,
    handleSendEmail,
    handleListRecipients
} from '../../libs/handlers/emailHandlers';
import * as emailService from '../../libs/services/emailService';
import PostalMime from 'postal-mime';
import { Buffer } from 'node:buffer';
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

        if (url.pathname === '/api/emails' && request.method === 'POST') {
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
            case url.pathname === '/api/emails' && request.method === 'GET':
                response = await handleListEmails(request, env, requestId);
                break;

            case url.pathname === '/api/recipients' && request.method === 'GET':
                response = await handleListRecipients(request, env, requestId);
                break;

            case url.pathname.startsWith('/api/emails/') && request.method === 'GET': {
                const emailId = url.pathname.split('/').pop()!;
                const email = await emailService.getEmailById(env.EMAILS, emailId);

                if (!email) {
                    response = new Response(
                        JSON.stringify({ error: 'Email not found' }),
                        {
                            status: 404,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                } else {
                    // 使用解构赋值和 rest 操作符来分离 rawEmail
                    const { rawEmail} = email;
                    const binaryData = Buffer.from(rawEmail, 'base64');//Uint8Array.from(atob(rawEmail), c => c.charCodeAt(0));
                    const parsed = await PostalMime.parse(binaryData);
                    const result = {id:email.id, ...parsed}
                    response = new Response(
                        JSON.stringify(result),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                }
                break;
            }

            case url.pathname.startsWith('/api/emails/') && request.method === 'DELETE': {
                const emailId = url.pathname.split('/').pop()!;
                await emailService.deleteEmail(env.EMAILS, emailId);
                response = new Response(
                    JSON.stringify({
                        message: 'Email deleted successfully',
                        emailId
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
                break;
            }

            case url.pathname === '/api/send' && request.method === 'POST':
                response = await handleSendEmail(request, env, requestId);
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