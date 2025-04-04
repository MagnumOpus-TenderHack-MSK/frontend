import React, { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
    onToggleForm: () => void;
}

export function LoginForm({ onToggleForm }: LoginFormProps) {
    const { login, isLoading, error } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [validationError, setValidationError] = useState<string | null>(null);

    const validateForm = (): boolean => {
        // Reset validation error
        setValidationError(null);

        // Check if username is empty
        if (!username.trim()) {
            setValidationError("Имя пользователя не может быть пустым");
            return false;
        }

        // Check if password is empty
        if (!password) {
            setValidationError("Пароль не может быть пустым");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await login(username, password);
            // Login successful, AuthContext will handle redirect
        } catch (error) {
            // Error is already handled in the AuthContext
            console.error("Login form error:", error);
        }
    };

    return (
        <div className="w-full max-w-md p-6 bg-background border border-border rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-center">Вход в систему</h2>

            {(error || validationError) && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {validationError || error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-1">
                        Имя пользователя
                    </label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1">
                        Пароль
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full bg-portal-blue hover:bg-portal-blue/90"
                    disabled={isLoading}
                >
                    {isLoading ? "Вход..." : "Войти"}
                </Button>
            </form>

            <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Нет аккаунта?{" "}
                    <button
                        onClick={onToggleForm}
                        className="text-portal-blue hover:underline"
                        type="button"
                    >
                        Зарегистрироваться
                    </button>
                </p>
            </div>
        </div>
    );
}