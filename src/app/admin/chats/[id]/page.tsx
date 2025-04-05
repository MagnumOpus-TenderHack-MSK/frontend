"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeader } from "@/components/admin/admin-header";
import { adminApi } from "@/lib/admin-api";

export default function AdminChatView() {
  const { id } = useParams();
  const router = useRouter();
  const [chat, setChat] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChat = async () => {
      setIsLoading(true);
      try {
        const data = await adminApi.getChatDetail(id as string);
        setChat(data);
      } catch (error) {
        console.error("Error fetching chat detail:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchChat();
    }
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                <span>← Назад</span>
              </Button>
              {isLoading ? <Skeleton className="h-8 w-64" /> : <h1 className="text-2xl font-bold">{chat?.title}</h1>}
            </div>
          </div>
          {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
          ) : chat ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Информация о чате</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">ID чата</dt>
                        <dd>{chat.id}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Пользователь</dt>
                        <dd>
                          {chat.user.username} ({chat.user.email})
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Категории</dt>
                        <dd>{chat.categories.join(", ")}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Создан</dt>
                        <dd>{new Date(chat.created_at).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Последнее сообщение</dt>
                        <dd>{new Date(chat.updated_at).toLocaleString()}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>История сообщений</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {chat.messages.map((message: any) => (
                          <div key={message.id} className="border rounded p-4">
                            <div className="text-sm font-medium">
                              {message.message_type === "system"
                                  ? "Система"
                                  : message.message_type === "ai"
                                      ? "Ассистент"
                                      : "Пользователь"}
                            </div>
                            <div className="mt-2 text-sm">{message.content}</div>
                            {message.files && message.files.length > 0 && (
                                <div className="mt-2">
                                  <strong>Файлы:</strong>
                                  <ul>
                                    {message.files.map((file: any) => (
                                        <li key={file.id}>
                                          <a href={file.preview_url} target="_blank" rel="noopener noreferrer">
                                            {file.name}
                                          </a>
                                        </li>
                                    ))}
                                  </ul>
                                </div>
                            )}
                          </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
          ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Чат не найден</p>
              </div>
          )}
        </main>
      </div>
  );
}
