"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/components/admin/admin-header";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { adminApi, AdminChat } from "@/lib/admin-api";
import { format } from "date-fns";
import { ThumbsUp, ThumbsDown } from "lucide-react";

export default function AdminChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const pageSize = 10;

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      try {
        // Format dates for API
        const fromDate = format(dateRange.from, "yyyy-MM-dd");
        const toDate = format(dateRange.to, "yyyy-MM-dd");

        const response = await adminApi.getChats(
            currentPage * pageSize,
            pageSize,
            undefined,
            undefined,
            fromDate,
            toDate
        );

        setChats(response.items);
        setTotal(response.total);
      } catch (error) {
        console.error("Error fetching admin chats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [currentPage, dateRange]);

  const handleViewChat = (chatId: string) => {
    router.push(`/admin/chats/${chatId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm");
    } catch (e) {
      return dateString;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
      <div className="flex min-h-screen flex-col bg-background">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Все чаты</h1>
              <p className="text-muted-foreground">Просмотр и управление чатами пользователей</p>
            </div>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            {total > 0 ? (
                `Найдено ${total} чатов. Нажмите на чат для просмотра диалога`
            ) : (
                isLoading ? "Загрузка..." : "Нет чатов для отображения"
            )}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block rounded-md border dark:border-gray-700">
            {isLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-12" />
                  ))}
                </div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/50 dark:hover:bg-muted/50">
                      <TableHead className="text-muted-foreground">Заголовок</TableHead>
                      <TableHead className="text-muted-foreground">Пользователь</TableHead>
                      <TableHead className="text-muted-foreground">Категории</TableHead>
                      <TableHead className="text-muted-foreground">Создан</TableHead>
                      <TableHead className="text-muted-foreground">Обновлен</TableHead>
                      <TableHead className="text-muted-foreground">Сообщений</TableHead>
                      <TableHead className="text-muted-foreground">Оценка</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chats.map((chat) => (
                        <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/50"
                            onClick={() => handleViewChat(chat.id)}
                        >
                          <TableCell className="font-medium">{chat.title}</TableCell>
                          <TableCell>{chat.user}</TableCell>
                          <TableCell>{chat.categories.join(", ")}</TableCell>
                          <TableCell>{formatDate(chat.created_at)}</TableCell>
                          <TableCell>{formatDate(chat.updated_at)}</TableCell>
                          <TableCell>{chat.message_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={14} className="text-green-500 dark:text-green-400" />
                          {chat.likes}
                        </span>
                              <span className="flex items-center gap-1">
                          <ThumbsDown size={14} className="text-red-500 dark:text-red-400" />
                                {chat.dislikes}
                        </span>
                            </div>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-4">
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-32" />
                ))
            ) : (
                chats.map((chat) => (
                    <div
                        key={chat.id}
                        className="border dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewChat(chat.id)}
                    >
                      <h3 className="font-medium mb-2">{chat.title}</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="text-muted-foreground">Пользователь:</div>
                        <div className="truncate">{chat.user}</div>

                        <div className="text-muted-foreground">Создан:</div>
                        <div>{formatDate(chat.created_at)}</div>

                        <div className="text-muted-foreground">Сообщений:</div>
                        <div>{chat.message_count}</div>

                        <div className="text-muted-foreground">Оценка:</div>
                        <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={14} className="text-green-500 dark:text-green-400" />
                      {chat.likes}
                    </span>
                          <span className="flex items-center gap-1">
                      <ThumbsDown size={14} className="text-red-500 dark:text-red-400" />
                            {chat.dislikes}
                    </span>
                        </div>
                      </div>
                    </div>
                ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0 || isLoading}
                  >
                    Предыдущая
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum = currentPage;
                    if (currentPage < 2) {
                      pageNum = i;
                    } else if (currentPage > totalPages - 3) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    if (pageNum >= 0 && pageNum < totalPages) {
                      return (
                          <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              disabled={isLoading}
                          >
                            {pageNum + 1}
                          </Button>
                      );
                    }
                    return null;
                  })}

                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage === totalPages - 1 || isLoading}
                  >
                    Следующая
                  </Button>
                </div>
              </div>
          )}
        </main>
      </div>
  );
}