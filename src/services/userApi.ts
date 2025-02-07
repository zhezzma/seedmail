import { API_BASE_URL, getHeaders, handleResponse } from './util';

export interface LoginResponse {
  success: boolean;
  token: string;
  message?: string;
}

export const userApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    handleResponse(response);
    return await response.json();
  },

  async listUsers(page: number = 1, pageSize: number = 20) {
    const response = await fetch(
      `${API_BASE_URL}/api/users?page=${page}&pageSize=${pageSize}`,
      { headers: getHeaders() }
    );
    handleResponse(response);
    return await response.json();
  },

  async deleteUser(email: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/users/${email}`,
      { 
        method: 'DELETE',
        headers: getHeaders()
      }
    );
    handleResponse(response);
    return await response.json();
  }
};



