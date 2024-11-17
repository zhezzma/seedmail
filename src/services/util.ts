import { router } from "../router";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    };
  }
  

  export async function handleResponse(response: Response) {
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