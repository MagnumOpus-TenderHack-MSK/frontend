"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeader } from "@/components/admin/admin-header";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { adminApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";

export default function AdminChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      try {
        const data = await adminApi.getChats();
        setChats(data.items);
      } catch (error) {
        console.error("Error fetching admin chats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChats();
  }, [dateRange]);

  const handleViewChat = (chatId: string) => {
    router.push(`/admin/chats/${chatId}`);
  };

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Все чаты</h1>
              <p className="text-muted-foreground">Просмотр и управление чатами пользователей</p>
            </div>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
          <div className="text-sm text-muted-foreground mb-2">Нажмите на чат для просмотра диалога</div>
          <div className="hidden md:block rounded-md border">
            {isLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-12" />
                  ))}
                </div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Заголовок</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Категории</TableHead>
                      <TableHead>Создан</TableHead>
                      <TableHead>Обновлен</TableHead>
                      <TableHead>Сообщений</TableHead>
                      <TableHead>Оценка</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chats.map((chat) => (
                        <TableRow key={chat.id} className="cursor-pointer hover:bg-muted/80" onClick={() => handleViewChat(chat.id)}>
                          <TableCell className="font-medium">{chat.title}</TableCell>
                          <TableCell>{chat.user}</TableCell>
                          <TableCell>{chat.categories.join(", ")}</TableCell>
                          <TableCell>{formatDate(new Date(chat.created_at))}</TableCell>
                          <TableCell>{formatDate(new Date(chat.updated_at))}</TableCell>
                          <TableCell>{chat.message_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span>👍 {chat.likes}</span>
                              <span>👎 {chat.dislikes}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </div>
        </main>
      </div>
  );
}
