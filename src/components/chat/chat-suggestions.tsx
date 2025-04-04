"use client";

import React from "react";
import {
    UserPlus,
    Search,
    HelpCircle,
    FileText,
    AlertTriangle,
    MessageSquare
} from "lucide-react";
import { mockSuggestions } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

interface ChatSuggestionsProps {
    onSuggestionClick: (text: string) => void;
}

export function ChatSuggestions({ onSuggestionClick }: ChatSuggestionsProps) {
    // Map icons to Lucide components
    const getIcon = (iconName: string) => {
        switch (iconName) {
            case "user-plus":
                return <UserPlus size={18} />;
            case "search":
                return <Search size={18} />;
            case "help-circle":
                return <HelpCircle size={18} />;
            case "file-text":
                return <FileText size={18} />;
            case "alert-triangle":
                return <AlertTriangle size={18} />;
            default:
                return <MessageSquare size={18} />;
        }
    };

    return (
        <div className="flex flex-col space-y-6 items-center justify-center text-center max-w-2xl mx-auto mt-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Добро пожаловать в чат Портала поставщиков</h2>
                <p className="text-muted-foreground">
                    Я виртуальный ассистент и готов ответить на ваши вопросы. Вот несколько популярных тем:
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                {mockSuggestions.map((suggestion) => (
                    <Button
                        key={suggestion.id}
                        variant="outline"
                        className="justify-start gap-2 p-4 h-auto text-left"
                        onClick={() => onSuggestionClick(suggestion.text)}
                    >
                        <span className="text-portal-blue">{getIcon(suggestion.icon)}</span>
                        <span>{suggestion.text}</span>
                    </Button>
                ))}
            </div>
        </div>
    );
}