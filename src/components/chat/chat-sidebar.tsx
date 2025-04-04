"use client";

import React from "react";
import { MessageSquare, Plus, Moon, Sun, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { type Chat } from "@/lib/types";
import { type User } from "@/contexts/auth-context";

interface ChatSidebarProps {
    chats: Chat[];
    activeChat: string;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => void;
    sidebarOpen: boolean;
    onCloseSidebar: () => void;
    user: User | null;
    onLogout: () => void;
}

export function ChatSidebar({
                                chats,
                                activeChat,
                                onChatSelect,
                                onNewChat,
                                sidebarOpen,
                                onCloseSidebar,
                                user,
                                onLogout,
                            }: ChatSidebarProps) {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(date);
    };

    return (
        <>
            {/* User profile section */}
            <div className="p-4 mt-14 md:mt-0 flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    <User size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm truncate">{user?.name || 'Пользователь'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                </div>
            </div>

            <div className="p-4 pt-0">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={onNewChat}>
                    <Plus size={16} /> Новый чат
                </Button>
            </div>

            <Separator />

            <div className="flex-1 overflow-y-auto p-2">
                <h2 className="text-sm font-medium px-2 py-1 text-muted-foreground">История чатов</h2>
                {chats.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">Нет активных чатов</p>
                ) : (
                    <ul className="space-y-1 mt-2">
                        {chats.map((chat) => (
                            <li key={chat.id}>
                                <Button
                                    variant={activeChat === chat.id ? "secondary" : "ghost"}
                                    className="w-full justify-start gap-2 text-left truncate"
                                    onClick={() => {
                                        onChatSelect(chat.id);
                                        onCloseSidebar();
                                    }}
                                >
                                    <MessageSquare size={16} />
                                    <div className="flex flex-col items-start overflow-hidden">
                                        <span className="truncate w-full">{chat.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(chat.updatedAt)}
                                        </span>
                                    </div>
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="p-4 space-y-2">
                <Button variant="ghost" onClick={toggleTheme} className="w-full flex items-center justify-between">
                    <span>Переключить тему</span>
                    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
                <Button
                    variant="ghost"
                    onClick={onLogout}
                    className="w-full flex items-center justify-between text-destructive hover:text-destructive"
                >
                    <span>Выйти</span>
                    <LogOut size={16} />
                </Button>
            </div>
        </>
    );
}