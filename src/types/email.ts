export interface EmailRecord {
    id: string;
    from: string;
    to: string;
    subject: string;
    receivedAt: string;
    spfStatus?: string;
    dmarcStatus?: string;
    dkimStatus?: string;
    sendStatus: 'pending' | 'sent' | 'failed';
    content?: string;
    headers?: Record<string, string>;Email?: string;
    attachments?: string[];
  }
  
  export interface PaginationResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }