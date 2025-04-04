import React, { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

interface SignupFormProps {
    onToggleForm: () => void;
}

export function SignupForm({ onToggleForm }: SignupFormProps) {
    const { signup, isLoading, error } = useAuth();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [validationError, setValidationError] = useState<string | null>(null);

    const validateForm = (): boolean => {
        // Reset validation error
        setValidationError(null);

        // Check if username is empty
        if (!username.trim()) {
            setValidationError("Имя пользователя не может быть пустым");
            return false;
        }

        // Check if email is valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setValidationError("Пожалуйста, введите корректный email");
            return false;
        }

        // Check if password is at least 8 characters
        if (password.length < 8) {
            setValidationError("Пароль должен быть не менее 8 символов");
            return false;
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            setValidationError("Пароли не совпадают");
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
            await signup(username, email, password, name || undefined);
            // Signup successful, AuthContext will handle redirect
        } catch (error) {
            // Error is already handled in the AuthContext
            console.error("Signup form error:", error);
        }
    };

    return (
        <div className="w-full max-w-md p-6 bg-background border border-border rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-center">Регистрация</h2>

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
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                        Полное имя
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                    <p className="text-xs text-muted-foreground mt-1">
                        Минимум 8 символов
                    </p>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                        Подтверждение пароля
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full bg-portal-red hover:bg-portal-red/90"
                    disabled={isLoading}
                >
                    {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
            </form>

            <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Уже есть аккаунт?{" "}
                    <button
                        onClick={onToggleForm}
                        className="text-portal-blue hover:underline"
                        type="button"
                    >
                        Войти
                    </button>
                </p>
            </div>
        </div>
    );
}