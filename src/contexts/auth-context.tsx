"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, LoginRequest, SignupRequest } from "@/lib/types";
import { AuthApi } from "@/lib/auth-api";

// Define auth context type
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    signup: (username: string, email: string, password: string, fullName?: string) => Promise<void>;
    logout: () => void;
    error: string | null;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Check for existing token and fetch user on initial load
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('jwt_token');
            if (token) {
                try {
                    const userData = await AuthApi.getCurrentUser();
                    setUser(userData);
                } catch (err) {
                    console.error('Error fetching user data:', err);
                    // Clear token if it's invalid
                    AuthApi.logout();
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    // Login function
    const login = async (username: string, password: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const loginData: LoginRequest = {
                username,
                password
            };

            const response = await AuthApi.login(loginData);
            setUser(response.user);
        } catch (err) {
            console.error('Login error:', err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An error occurred during login");
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Signup function
    const signup = async (username: string, email: string, password: string, fullName?: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const signupData: SignupRequest = {
                username,
                email,
                password,
                full_name: fullName
            };

            const response = await AuthApi.signup(signupData);
            setUser(response.user);
        } catch (err) {
            console.error('Signup error:', err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An error occurred during signup");
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        AuthApi.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                signup,
                logout,
                error,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};