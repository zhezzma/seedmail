import { EventContext } from '@cloudflare/workers-types'

export const onRequest = async (context: EventContext<any, string, Record<string, unknown>>): Promise<Response> => {
    //返回请求路径
    return new Response(context.request.url);
}