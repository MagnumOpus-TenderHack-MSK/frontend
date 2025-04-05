"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeader } from "@/components/admin/admin-header";
import { adminApi } from "@/lib/admin-api";
import { ArrowLeft, Download, ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";

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

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm:ss");
    } catch (e) {
      return dateString;
    }
  };

  // Function to determine message class based on type
  const getMessageClass = (messageType: string) => {
    const type = messageType.toLowerCase();
    if (type === 'user') {
      return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    } else if (type === 'ai') {
      return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
    } else if (type === 'system') {
      return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    }
    return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
  };

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                <span>Назад</span>
              </Button>
              {isLoading ? (
                  <Skeleton className="h-8 w-64" />
              ) : (
                  <h1 className="text-2xl font-bold">{chat?.title}</h1>
              )}
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
                <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
                  <CardHeader>
                    <CardTitle>Информация о чате</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">ID чата</dt>
                        <dd className="break-all">{chat.id}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Пользователь</dt>
                        <dd>
                          {chat.user.username} ({chat.user.email})
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Категории</dt>
                        <dd>{chat.categories.join(", ") || "Не указаны"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Подкатегории</dt>
                        <dd>{chat.subcategories.join(", ") || "Не указаны"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Создан</dt>
                        <dd>{formatDateTime(chat.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Последнее сообщение</dt>
                        <dd>{formatDateTime(chat.updated_at)}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
                  <CardHeader>
                    <CardTitle>История сообщений</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {chat.messages.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">В этом чате нет сообщений</p>
                      ) : (
                          chat.messages.map((message: any) => (
                              <div
                                  key={message.id}
                                  className={`border rounded-lg p-4 ${getMessageClass(message.message_type)}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-medium">
                                    {message.message_type.toLowerCase() === "system"
                                        ? "Система"
                                        : message.message_type.toLowerCase() === "ai"
                                            ? "Ассистент"
                                            : "Пользователь"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDateTime(message.created_at)}
                                  </div>
                                </div>

                                <div className="whitespace-pre-wrap mb-3">{message.content}</div>

                                {/* Files section */}
                                {message.files && message.files.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                      <p className="text-sm font-medium mb-2">Прикрепленные файлы:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {message.files.map((file: any) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center gap-2 p-2 rounded-md bg-background border text-sm"
                                            >
                                              <span className="truncate max-w-[150px]">{file.name}</span>
                                              <div className="flex gap-1">
                                                {file.preview_url && (
                                                    <a
                                                        href={file.preview_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 rounded-md hover:bg-muted"
                                                        title="Просмотр"
                                                    >
                                                      <ExternalLink size={14} />
                                                    </a>
                                                )}
                                                <a
                                                    href={`/api/files/${file.id}/download`}
                                                    className="p-1 rounded-md hover:bg-muted"
                                                    title="Скачать"
                                                >
                                                  <Download size={14} />
                                                </a>
                                              </div>
                                            </div>
                                        ))}
                                      </div>
                                    </div>
                                )}

                                {/* Reactions section */}
                                {message.reactions && message.reactions.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                                      {message.reactions.some((r: any) => r.reaction_type.toLowerCase() === 'like') && (
                                          <div className="flex items-center gap-1 text-green-500 dark:text-green-400">
                                            <ThumbsUp size={14} />
                                            <span className="text-xs">Полезно</span>
                                          </div>
                                      )}
                                      {message.reactions.some((r: any) => r.reaction_type.toLowerCase() === 'dislike') && (
                                          <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                                            <ThumbsDown size={14} />
                                            <span className="text-xs">Неполезно</span>
                                          </div>
                                      )}
                                    </div>
                                )}
                              </div>
                          ))
                      )}
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