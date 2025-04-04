"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/auth");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-center">
                    <div className="h-8 w-32 bg-muted rounded mx-auto"></div>
                    <div className="mt-4 h-4 w-48 bg-muted rounded mx-auto"></div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect, don't render anything
    }

    return <>{children}</>;
}