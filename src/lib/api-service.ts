import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Create API base URL from environment variable or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance with base configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            // Ensure headers object exists
            if (!config.headers) {
                config.headers = {};
            }
            config.headers.Authorization = `Bearer ${token}`;

            // Log auth header for debugging (remove in production)
            console.log('Request with Authorization:', `Bearer ${token.substring(0, 10)}...`);
        } else {
            console.warn('No auth token found for request');
        }
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle authentication errors
        if (error.response?.status === 401) {
            // Clear token and redirect to login if not already there
            localStorage.removeItem('jwt_token');
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
                window.location.href = '/auth';
            }
        }

        // Handle validation errors
        if (error.response?.status === 422) {
            console.error('Validation error:', error.response.data);
        }

        return Promise.reject(error);
    }
);

// API service class
export class ApiService {
    // Generic request method
    static async request<T>(config: AxiosRequestConfig): Promise<T> {
        try {
            const response: AxiosResponse<T> = await apiClient(config);
            return response.data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // GET request
    static async get<T>(url: string, params?: any): Promise<T> {
        return this.request<T>({ method: 'GET', url, params });
    }

    // POST request
    static async post<T>(url: string, data?: any): Promise<T> {
        return this.request<T>({ method: 'POST', url, data });
    }

    // PUT request
    static async put<T>(url: string, data?: any): Promise<T> {
        return this.request<T>({ method: 'PUT', url, data });
    }

    // DELETE request
    static async delete<T>(url: string): Promise<T> {
        return this.request<T>({ method: 'DELETE', url });
    }

    // Custom method for file uploads
    static async uploadFile<T>(url: string, file: File, onProgress?: (percentage: number) => void): Promise<T> {
        const formData = new FormData();
        formData.append('file', file);

        return this.request<T>({
            method: 'POST',
            url,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentage);
                }
            },
        });
    }

    // Custom method for multiple file uploads
    static async uploadMultipleFiles<T>(
        url: string,
        files: File[],
        onProgress?: (percentage: number) => void
    ): Promise<T> {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        return this.request<T>({
            method: 'POST',
            url,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentage);
                }
            },
        });
    }
}

export default ApiService;