import { seedEmails } from './mock-emails'
import { D1Database } from '@cloudflare/workers-types'

interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      if (request.method === 'GET') {
        await seedEmails(env.DB)
        return new Response('Test data generated successfully', { status: 200 })
      }
      return new Response('Method not allowed', { status: 405 })
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 })
    }
  }
}