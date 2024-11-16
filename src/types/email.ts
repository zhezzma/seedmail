export interface EmailRecord {
    id: string;
    from: string;
    to: string;
    subject: string;
    receivedAt: string;
    spfStatus?: string;
    dmarcStatus?: string;
    dkimStatus?: string;
    headers?: Record<string, string>;Email?: string;
    html:string;
    text:string;
    attachments?:any[];
}

export interface PaginationResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}