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
            // Properly handle error responses
            if (error instanceof AxiosError && error.response) {
                if (error.response.status === 401) {
                    throw new Error('Неверное имя пользователя или пароль');
                } else if (error.response.data && error.response.data.detail) {
                    throw new Error(error.response.data.detail);
                }
            }
            // For network errors or unexpected issues
            throw new Error('Ошибка при входе в систему. Пожалуйста, попробуйте позже.');
        }
    }

    // Rest of the class remains the same
    static async signup(signupData: SignupRequest): Promise<SignupResponse> {
        try {
            const response = await ApiService.post<SignupResponse>('/auth/register', signupData);

            // Store token in localStorage
            if (response.access_token) {
                localStorage.setItem('jwt_token', response.access_token);
            }

            return response;
        } catch (error) {
            if (error instanceof AxiosError && error.response) {
                if (error.response.status === 400) {
                    // Extract error message
                    const data = error.response.data as any;
                    if (data.detail) {
                        throw new Error(data.detail);
                    }
                }
            }
            throw new Error('Ошибка при регистрации. Пожалуйста, попробуйте позже.');
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