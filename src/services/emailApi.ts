import { EmailRecord } from '../types/email';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`
};

export const emailApi = {
  async listEmails(page: number = 1, pageSize: number = 20) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails?page=${page}&pageSize=${pageSize}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch emails');
    return response.json();
  },

  async getEmail(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/emails/${id}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch email');
    return response.json();
  },

  async deleteEmail(id: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails/${id}`,
      { method: 'DELETE', headers }
    );
    if (!response.ok) throw new Error('Failed to delete email');
    return response.json();
  },

  async sendEmail(emailData: Partial<EmailRecord>) {
    const response = await fetch(
      `${API_BASE_URL}/api/send`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(emailData)
      }
    );
    if (!response.ok) throw new Error('Failed to send email');
    return response.json();
  }
};