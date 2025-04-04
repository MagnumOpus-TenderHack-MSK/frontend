import { AxiosError } from 'axios';
import { ApiService } from './api-service';
import { LoginRequest, LoginResponse, SignupRequest, SignupResponse, User } from './types';

export class AuthApi {
    static async login(loginData: LoginRequest): Promise<LoginResponse> {
        try {
            const response = await ApiService.post<LoginResponse>('/auth/login', loginData);

            // Store token in localStorage
            if (response.access_token) {
                localStorage.setItem('jwt_token', response.access_token);
            }

            return response;
        } catch (error) {
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 401) {
                throw new Error('Invalid username or password');
            }
            throw error;
        }
    }

    static async signup(signupData: SignupRequest): Promise<SignupResponse> {
        try {
            const response = await ApiService.post<SignupResponse>('/auth/register', signupData);

            // Store token in localStorage
            if (response.access_token) {
                localStorage.setItem('jwt_token', response.access_token);
            }

            return response;
        } catch (error) {
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 400) {
                // Extract error message
                const data = axiosError.response.data as any;
                if (data.detail) {
                    throw new Error(data.detail);
                }
            }
            throw error;
        }
    }

    static async getCurrentUser(): Promise<User> {
        try {
            return await ApiService.get<User>('/auth/me');
        } catch (error) {
            throw error;
        }
    }

    static logout(): void {
        localStorage.removeItem('jwt_token');
    }

    static isAuthenticated(): boolean {
        return !!localStorage.getItem('jwt_token');
    }
}

export default AuthApi;