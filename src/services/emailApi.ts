import { EmailRecord } from '../types/email';
import { router } from '../router';
import { API_BASE_URL, getHeaders, handleResponse } from './util';


export const emailApi = {
  async listEmails(type: "RECEIVED"|"SENT", page: number = 1, pageSize: number = 20) {
    const response = await fetch(
      `${API_BASE_URL}/api/emails?type=${type}&page=${page}&pageSize=${pageSize}`,
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
  }
};