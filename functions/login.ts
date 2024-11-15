interface LoginRequest {
    username: string;
    password: string;
  }
  
  interface LoginResponse {
    success: boolean;
    token?: string;
    message?: string;
  }
  
  // 模拟用户数据库
  const USERS:any  = {
    'admin': {
      password: 'password', // 实际应用中应该使用加密密码
      role: 'admin'
    }
  };
  
  // JWT密钥 (实际应用中应该使用环境变量)
  const JWT_SECRET = 'your-secret-key';
  
  export async function onRequest(context: any) {
    // 处理CORS
    if (context.request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
  
    // 只允许POST请求
    if (context.request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  
    try {
      const request: LoginRequest = await context.request.json();
      const { username, password } = request;
  
      // 验证用户名和密码
      if (!username || !password) {
        return new Response(JSON.stringify({
          success: false,
          message: '用户名和密码不能为空'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
  
      // 检查用户是否存在
      const user = USERS[username];
      if (!user || user.password !== password) {
        return new Response(JSON.stringify({
          success: false,
          message: '用户名或密码错误'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
  
      // 生成简单的token (实际应用中应该使用proper JWT)
      const token = btoa(JSON.stringify({
        username,
        role: user.role,
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24小时过期
      }));
  
      return new Response(JSON.stringify({
        success: true,
        token,
        message: '登录成功'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
  
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '服务器错误'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
  