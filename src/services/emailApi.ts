import { EmailRecord } from '../types/email';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';


function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  };
}

export const emailApi = {
  async listEmails(page: number = 1, pageSize: number = 20) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails?page=${page}&pageSize=${pageSize}`,
      { headers: getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch emails');
    return response.json();
  },

  async getEmail(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/emails/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch email');
    return response.json();
  },

  async deleteEmail(id: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails/${id}`,
      { method: 'DELETE', headers: getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to delete email');
    return response.json();
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
    if (!response.ok) throw new Error('Failed to send email');
    return response.json();
  }
};