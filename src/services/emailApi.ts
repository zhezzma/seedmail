import { EmailRecord } from '../types/email';
import { router } from '../router';
import { API_BASE_URL, getHeaders, handleResponse } from './util';


export const emailApi = {
  async listEmails(type: "received" | "sent" | "starred", page: number = 1, pageSize: number = 20) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails?type=${type}&page=${page}&pageSize=${pageSize}`,
      { headers: getHeaders() }
    );
    handleResponse(response);
    return await response.json();
  },
  async getEmail(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/email/${id}`,
      { headers: getHeaders() }
    );
    handleResponse(response);
    return await response.json();
  },

  async deleteEmail(id: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/email/${id}`,
      { method: 'DELETE', headers: getHeaders() }
    );
    handleResponse(response);
    return await response.json();
  },

  async deleteEmails(ids: string[]) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails/batch`,
      { 
        method: 'DELETE', 
        headers: getHeaders(),
        body: JSON.stringify({ ids })
      }
    );
    handleResponse(response);
    return await response.json();
  },

  async sendEmail(emailData: Partial<EmailRecord>) {
    const response = await fetch(
      `${API_BASE_URL}/api/email`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(emailData)
      }
    );
    handleResponse(response);
    return await response.json();
  },

  async toggleStar(id: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/email/${id}/star`,
      { 
        method: 'POST',
        headers: getHeaders() 
      }
    );
    handleResponse(response);
    return await response.json();
  }
};