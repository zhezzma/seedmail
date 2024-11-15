/**
 * CORS 相关的响应头配置
 */
export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',  // 允许所有来源
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',  // 允许的HTTP方法
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',  // 允许的请求头
    'Access-Control-Max-Age': '86400',  // 预检请求的有效期
};

/**
 * 处理 OPTIONS 预检请求
 */
export function handleOptions(): Response {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

/**
 * 为响应添加 CORS 头
 * @param response 原始响应对象
 * @returns 添加了 CORS 头的新响应对象
 */
export function addCorsHeaders(response: Response): Response {
    const newHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        newHeaders.set(key, value);
    });

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}