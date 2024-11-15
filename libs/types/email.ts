import { KVNamespace } from '@cloudflare/workers-types'

export interface EmailRecord {
    id: string;
    from: string;
    to: string;
    subject: string;
    receivedAt: string;
    spfStatus: string;
    dmarcStatus: string;
    dkimStatus: string;
    sendStatus: 'pending' | 'sent' | 'failed';
    content: string;
    headers: Record<string, string>;
    size: number;
    rawEmail: string;
    attachments: string[];
  }

  
  export interface EmailMeta {
    id: string;
    from: string;
    to: string;
    subject: string;
    receivedAt: string;
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }
  


  // 添加新的接口
export interface EmailSendRequest {
  from: string;
  to: string;
  subject: string;
  content: string;
}

// 在 Env 接口中添加 RESEND_KEY
export interface Env {
  EMAILS: KVNamespace;
  API_TOKEN: string;
  JWT_SECRET: string;
  RESEND_KEY: string;  // 新增
  USER_NAME:string;
  PASSWORD:string;
}