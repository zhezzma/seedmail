export async function generateToken(username: string, secret: string): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: username,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000)
    };
  
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = await createHmacSignature(
      `${encodedHeader}.${encodedPayload}`,
      secret
    );
  
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  export async function verifyToken(request: Request, secret: string): Promise<boolean> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }
  
    const token = authHeader.split(' ')[1];
    try {
      const [headerB64, payloadB64, signatureB64] = token.split('.');
      const expectedSignature = await createHmacSignature(
        `${headerB64}.${payloadB64}`,
        secret
      );
  
      if (signatureB64 !== expectedSignature) {
        return false;
      }
  
      const payload = JSON.parse(atob(payloadB64));
      const now = Math.floor(Date.now() / 1000);
  
      return payload.exp > now;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }
  
  async function createHmacSignature(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
  
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );
  
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }