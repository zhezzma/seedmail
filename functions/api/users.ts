import { EventContext } from '@cloudflare/workers-types'

export const onRequest = async (context: EventContext<any, string, Record<string, unknown>>): Promise<Response> => {
    return new Response("Hello from TypeScript Cloudflare Pages Function!");
}