"use client";

import dynamic from "next/dynamic";
import { ProtectedRoute } from "@/components/protected-route";

// Dynamically import the ChatApp component to prevent hydration issues
const ChatApp = dynamic(() => import("@/components/chat/chat-app"), {
    ssr: false,
});

export default function Home() {
    return (
        <ProtectedRoute>
            <main>
                <ChatApp />
            </main>
        </ProtectedRoute>
    );
}