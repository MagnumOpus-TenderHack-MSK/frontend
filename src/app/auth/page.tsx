"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { useAuth } from "@/contexts/auth-context";

export default function AuthPage() {
    const [isLoginForm, setIsLoginForm] = useState(true);
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    // Redirect to home if already authenticated
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            router.push("/");
        }
    }, [isAuthenticated, isLoading, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Портал Поставщиков</h1>
                <p className="text-muted-foreground mt-2">Виртуальный ассистент</p>
            </div>

            {isLoginForm ? (
                <LoginForm onToggleForm={() => setIsLoginForm(false)} />
            ) : (
                <SignupForm onToggleForm={() => setIsLoginForm(true)} />
            )}
        </div>
    );
}