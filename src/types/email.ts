export interface EmailRecord {
    id: string;
    from: string;
    to: string;
    subject: string;
    receivedAt: string;
    spfStatus?: string;
    dmarcStatus?: string;
    dkimStatus?: string;
    starred?: boolean; // 添加标星状态字段
    readed: boolean; // 添加已读状态字段
}

export interface PaginationResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}




export type Header = Record<string, string>;

export type Address = {
    name: string;
    address?: string;
    group?: Address[]
};

export type Attachment = {
    filename: string | null;
    mimeType: string;
    disposition: "attachment" | "inline" | null;
    related?: boolean;
    description?: string;
    contentId?: string;
    method?: string;
    content: ArrayBuffer;
};

export type Email = {
    id:string;
    headers: Header[];
    from: Address;
    sender?: Address;
    replyTo?: Address[];
    deliveredTo?: string;
    returnPath?: string;
    to?: Address[];
    cc?: Address[];
    bcc?: Address[];
    subject?: string;
    messageId: string;
    inReplyTo?: string;
    references?: string;
    date?: string;
    html?: string;
    text?: string;
    attachments: Attachment[];
};
