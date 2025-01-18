import { KVNamespace,D1Database } from '@cloudflare/workers-types'

/**
 * 邮件记录的完整信息
 */
export interface EmailRecord {
    id: string;            // 邮件唯一标识符
    from: string;          // 发件人
    to: string;           // 收件人
    subject: string;      // 邮件主题
    receivedAt: string;   // 接收时间   //2023-01-01T00:00:00Z  ISO 8601格式
    spfStatus: string;    // SPF 验证状态
    dmarcStatus: string;  // DMARC 验证状态
    dkimStatus: string;   // DKIM 验证状态
    headers: Record<string, string>;  // 邮件头信息
    size: number;         // 邮件大小
    rawEmail: string;     // 原始邮件内容,
    starred: number;      // 是否标星
    type: EmailType;      // 邮件类型
    readed: number;       // 是否已读
}

/**
 * 邮件类型枚举
 */
export enum EmailType {
  RECEIVED = 'received',
  SENT = 'sent'
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/**
 * 发送邮件请求接口
 */
export interface EmailSendRequest {
    from: string;
    to: string;
    subject: string;
    content: string;
}

/**
 * 环境变量配置接口
 */
export interface Env {
    API_TOKEN: string;    // API 访问令牌
    JWT_SECRET: string;   // JWT 密钥
    RESEND_KEY: string;   // Resend API 密钥
    USER_NAME: string;    // 用户名
    PASSWORD: string;     // 密码
    DB:D1Database;  //D1
}