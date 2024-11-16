import { EmailRecord } from '../types/email';
import { router } from '../router';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  };
}

async function handleResponse(response: Response) {
  if (response.status === 401) {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    router.push('/login');
    throw new Error('认证失败，请重新登录');
  }
  if (!response.ok) {
    throw new Error('请求失败');
  }
  return response.json();
}

export const emailApi = {
  async listEmails(page: number = 1, pageSize: number = 20) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails?page=${page}&pageSize=${pageSize}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async getEmail(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/emails/${id}`, 
      { headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async deleteEmail(id: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails/${id}`,
      { method: 'DELETE', headers: getHeaders() }
    );
    return handleResponse(response);
  },

  async sendEmail(emailData: Partial<EmailRecord>) {
    const response = await fetch(
      `${API_BASE_URL}/api/send`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(emailData)
      }
    );
    return handleResponse(response);
  },

  async listRecipients(page: number = 1, pageSize: number = 20) {
    const response = await fetch(
      `${API_BASE_URL}/api/recipients?page=${page}&pageSize=${pageSize}`,
      { headers: getHeaders() }
    );
    return handleResponse(response);
  }
};