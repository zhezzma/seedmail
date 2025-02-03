import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

// 响应数据的接口定义
interface TenantAccessTokenResponse {
    code: number;
    expire: number;
    msg: string;
    tenant_access_token: string;
}

interface EventHeader {
    event_id: string;
    token: string;
    create_time: string;
    event_type: string;
    tenant_key: string;
    app_id: string;
}

interface SenderId {
    open_id: string;
    union_id: string;
    user_id: string;
}

interface Sender {
    sender_id: SenderId;
    sender_type: string;
    tenant_key: string;
}

interface Message {
    chat_id: string;
    chat_type: string;
    content: string;
    create_time: string;
    message_id: string;
    message_type: string;
    update_time: string;
    user_agent: string;
}

interface EventBody {
    message: Message;
    sender: Sender;
}

export interface EventMessage {
    schema: string;
    header: EventHeader;
    event: EventBody;
}

/**
 * 获取飞书租户访问令牌
 * @param appId 应用 ID
 * @param appSecret 应用密钥
 * @returns Promise<TenantAccessTokenResponse>
 */
export async function getTenantAccessToken(appId: string, appSecret: string): Promise<TenantAccessTokenResponse> {
    const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            app_id: appId,
            app_secret: appSecret,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json() as TenantAccessTokenResponse
}






//https://open.feishu.cn/document/server-docs/event-subscription-guide/event-subscription-configure-/encrypt-key-encryption-configuration-case
export class AESCipher {
    private decryptKey: Buffer;
    private encryptKey: string;
    constructor(key: string) {
        this.encryptKey = key;
        const hash = crypto.createHash('sha256');
        hash.update(key);
        this.decryptKey = hash.digest();
    }

    async decrypt(encrypt: string): Promise<string> {
        // 将 base64 字符串转换为 Uint8Array
        const encryptBuffer = Uint8Array.from(atob(encrypt), c => c.charCodeAt(0));

        // 提取 IV (前16字节)
        const iv = encryptBuffer.slice(0, 16);
        // 提取加密数据
        const data = encryptBuffer.slice(16);

        // 从密钥字符串创建 CryptoKey
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            this.decryptKey,
            { name: 'AES-CBC' },
            false,
            ['decrypt']
        );

        // 解密
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: 'AES-CBC',
                iv: iv
            },
            cryptoKey,
            data
        );

        // 转换为字符串
        return new TextDecoder().decode(decryptedBuffer);
    }

    calculateSignature(
        timestamp: string,
        nonce: string,
        body: string
    ): string {
        const content = timestamp + nonce + this.encryptKey + body;
        const sign = crypto.createHash('sha256').update(content).digest('hex');
        return sign;
    }
}




export async function handleAuth(request: Request,verificationToken:string,encryptKey:string ): Promise<Response | EventMessage> {

    const { headers } = request
    const contentType = headers.get('content-type') || ''
    if (request.method !== 'POST' || !contentType.includes('application/json')) {
        return new Response('Invalid request', { status: 400 })
    }
    const body: string = await request.text()
    const cipher = new AESCipher(encryptKey)
    let data = JSON.parse(body)
    // 如果是加密事件，进行解密
    if (data.encrypt) {
        data = JSON.parse(await cipher.decrypt(data.encrypt))
    }
    const signature = headers.get('X-Lark-Signature');
    //绑定的时候没有signature,所以得判断下
    if (signature) {
        const timestamp = headers.get('X-Lark-Request-Timestamp')!;
        const nonce = headers.get('X-Lark-Request-Nonce')!;
        const sign = cipher.calculateSignature(timestamp, nonce, body)

        if (sign !== signature) {
            return new Response('Invalid request', { status: 400 })
        }
    }

    // 如果校验通过，返回 challenge 值
    if (data.type && data.type === 'url_verification') {
        return new Response(JSON.stringify({ challenge: data.challenge }), {
            headers: { 'Content-Type': 'application/json' },
        })
    }

    if (data.header.token != verificationToken) {
        return new Response('Invalid request', { status: 400 })
    }

    return data;
}


// 定义响应接口
interface MessageResponse {
    code: number;
    msg: string;
    data: {
        body: {
            content: string;
        };
        chat_id: string;
        create_time: string;
        deleted: boolean;
        message_id: string;
        msg_type: string;
        sender: {
            id: string;
            id_type: string;
            sender_type: string;
            tenant_key: string;
        };
        update_time: string;
        updated: boolean;
    };
}

// 定义请求参数接口
interface MessageRequest {
    content: string;
    msg_type: string;
    receive_id: string;
    uuid: string;
}

// 发送消息函数
//https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/create
export async function sendFeishuMessageText(token: string, receive_id: string, content: string): Promise<MessageResponse> {
    const url = 'https://open.feishu.cn/open-apis/im/v1/messages';
    try {
        const response = await fetch(`${url}?receive_id_type=open_id`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                msg_type: "text",
                content: JSON.stringify({ text: content }),
                receive_id: receive_id, // 需要配置接收者ID
                uuid: uuidv4()
            } as MessageRequest)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, ${await response.text()}`);
        }
        const data: MessageResponse = await response.json();

        return data;
    } catch (error) {
        console.error('发送消息失败:', error);
        throw error;
    }
}




interface LarkCardRequest {
    type: string;
    data: string;
}
interface LarkCardResponse {
    code: number;
    data: {
        card_id: string;
    };
    msg: string;
}

//第一步创建卡片
//https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/streaming-updates-openapi-overview#5ac65a50
export async function sendFeishuCreateCard(token: string, title: string, content: string, element_id: string = "markdown_content"): Promise<LarkCardResponse> {

    const url = 'https://open.feishu.cn/open-apis/cardkit/v1/cards';
    const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
    };

    const requestBody: LarkCardRequest = {
        type: "card_json",
        data: JSON.stringify({
            schema: "2.0",
            header: {
                title: {
                    content: title,
                    tag: "plain_text"
                }
            },
            config: {
                streaming_mode: true,
                summary: {
                    content: ""
                }
            },
            body: {
                elements: [
                    {
                        tag: "markdown",
                        content: content,
                        element_id: element_id
                    }
                ]
            }
        })
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as LarkCardResponse;
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}

//第二部发送消息
export async function sendFeishuMessageCard(token: string, card_id: string, receive_id: string): Promise<MessageResponse> {
    const url = 'https://open.feishu.cn/open-apis/im/v1/messages';
    try {
        const response = await fetch(`${url}?receive_id_type=open_id`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                msg_type: "interactive",
                content: JSON.stringify({
                    type: "card", data: {
                        "card_id": card_id
                    }
                }),
                receive_id: receive_id, // 需要配置接收者ID
                uuid: uuidv4()
            } as MessageRequest)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, ${await response.text()}`);
        }
        const data: MessageResponse = await response.json();
        return data;
    } catch (error) {
        console.error('发送消息失败:', error);
        throw error;
    }
}

//第三部更新卡片
interface UpdateCardParams {
    token: string;
    card_id: string;
    element_id: string;
    sequence: number;
    content: string;
}

interface UpdateCardResponse {
    code: number;
    data: Record<string, unknown>;
    msg: string;
}

export async function updateMarkdownCard({
    token,
    card_id,
    element_id,
    sequence,
    content
}: UpdateCardParams): Promise<UpdateCardResponse> {
    const url = `https://open.feishu.cn/open-apis/cardkit/v1/cards/${card_id}/elements/${element_id}/content`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    const body = JSON.stringify({
        content,
        sequence,
        uuid: uuidv4()
    });

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: UpdateCardResponse = await response.json();
        if (result.code !== 0) {
            throw new Error(`API error: ${result.msg}`);
        }

        return result;
    } catch (error) {
        console.error('Update failed:', error);
        throw error;
    }
}


