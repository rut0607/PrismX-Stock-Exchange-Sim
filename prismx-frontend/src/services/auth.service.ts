import { apiClient } from './api';
import type { User } from '../types/index';

interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export const authService = {
  async signup(email: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/signup', { email, password });
    return data.data;
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data.data;
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },
};