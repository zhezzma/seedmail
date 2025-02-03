/**
 * 系统设置接口
 */
export interface SystemSettings {
    /** 飞书配置 */
    feishu: {
        /** 飞书应用ID */
        app_id: string;
        /** 飞书应用密钥 */
        app_secret: string;
        /** 飞书应用验证Token */
        verification_token: string;
        /** 飞书应用加密Key */
        encrypt_key: string;
        /** 飞书机器人接收ID */
        receive_id: string;
        /** 预警邮箱列表 */
        emails: string[];
    }
}

